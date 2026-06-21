// engine.js — type-agnostic parsing & placement. Knows nothing about specific
// units; it just reads data.js.

const Engine = (() => {
  const DATA = window.MEASUREMENT_DATA;

  // Build a flat alias index: token -> { typeId, unitKey }.
  const ALIAS = {};
  for (const [typeId, t] of Object.entries(DATA)) {
    for (const [unitKey, u] of Object.entries(t.units)) {
      const aliases = new Set([unitKey.toLowerCase(), ...(u.aliases || [])]);
      for (const a of aliases) {
        const norm = a.replace(/\s+/g, "").toLowerCase();
        ALIAS[norm] = { typeId, unitKey };
      }
    }
  }

  function toBase(typeDef, unitKey, value) {
    const u = typeDef.units[unitKey];
    return u.toBase ? u.toBase(value) : value * u.factor;
  }
  function fromBase(typeDef, unitKey, base) {
    const u = typeDef.units[unitKey];
    return u.fromBase ? u.fromBase(base) : base / u.factor;
  }

  // Parse a free-text measurement. Returns null if no unit recognised.
  // Examples: "4000 acres", "85 dB", "50 liters", "200C", "-40 °f", "1.2e6 m2"
  function parse(raw) {
    if (!raw) return null;
    let text = raw.trim().toLowerCase();
    // currency context: a leading $/€/£ or the word "dollars" implies money
    const hadCurrency = /^[\$€£]/.test(text) || /\bdollars?\b|\busd\b/.test(text);
    text = text.replace(/[\$€£,]/g, "").replace(/\bper\b/g, "/").trim();
    // number: optional sign, decimal, scientific notation
    const m = text.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*(.*)$/i);
    if (!m) return null;
    let value = parseFloat(m[1]);
    if (!isFinite(value)) return null;
    let rest = (m[2] || "").trim();

    // word-scale multipliers: "500 billion", "1.5 million gallons/day"
    const SCALES = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
    let sw = rest.match(/^(thousand|million|billion|trillion)s?\b\.?\s*(.*)$/);
    if (sw) { value *= SCALES[sw[1]]; rest = sw[2].trim(); }
    else if (hadCurrency) {
      // money shorthand: "$5b", "$420k" — only when currency is in play, so SI
      // unit prefixes (MW, GW) are never mistaken for million/billion
      const sh = rest.match(/^([kmbt])\b\.?\s*(.*)$/);
      if (sh) { value *= { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[sh[1]]; rest = sh[2].trim(); }
    }

    let unitTok = rest.replace(/\s+/g, "");
    if (!unitTok && hadCurrency) unitTok = "usd"; // "$500 billion" with no unit word
    if (!unitTok) return null;

    let hit = ALIAS[unitTok];
    // try without trailing 's' (plural) and with degree symbol stripped
    if (!hit) hit = ALIAS[unitTok.replace(/^°/, "")];
    if (!hit && unitTok.endsWith("s")) hit = ALIAS[unitTok.slice(0, -1)];
    if (!hit) return null;

    const typeDef = DATA[hit.typeId];
    const base = toBase(typeDef, hit.unitKey, value);
    return {
      ok: true,
      typeId: hit.typeId,
      typeDef,
      unitKey: hit.unitKey,
      inputValue: value,
      base, // canonical value
    };
  }

  // Given a parsed result, place it among the anchors and compute comparisons.
  function place(parsed) {
    const { typeDef, base } = parsed;
    const anchors = [...typeDef.anchors].sort((a, b) => a.value - b.value);

    // nearest neighbours straddling the value
    let lower = null, upper = null;
    for (const a of anchors) {
      if (a.value <= base) lower = a;
      if (a.value >= base && !upper) upper = a;
    }

    // headline = anchor closest in log space (or linear for scales w/ negatives)
    const useLog = typeDef.strategy !== "scale"; // spatial + magnitude use ratios
    let headline = anchors[0], bestD = Infinity;
    for (const a of anchors) {
      const d = useLog
        ? Math.abs(Math.log(Math.max(base, 1e-12)) - Math.log(Math.max(a.value, 1e-12)))
        : Math.abs(base - a.value);
      if (d < bestD) { bestD = d; headline = a; }
    }

    // tiling anchor: prefer the biggest anchor flagged `relatable` (household /
    // person scale) that fits below the value — that's the punchy "≈ N homes"
    // line. Otherwise fall back to the nearest lower anchor.
    const relatable = anchors.filter(a => a.relatable && a.value > 0 && a.value <= base);
    let tileAnchor = relatable.length ? relatable[relatable.length - 1] : (lower || anchors[0]);
    const tileCount = base / tileAnchor.value;

    return { anchors, lower, upper, headline, tileAnchor, tileCount };
  }

  // ---- formatting helpers ----
  function fmtNum(n) {
    const abs = Math.abs(n);
    if (n === 0) return "0";
    if (abs >= 1e9 || (abs < 1e-3 && abs > 0)) return n.toExponential(2).replace("e", "×10^");
    if (abs >= 100) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (abs >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return n.toLocaleString(undefined, { maximumSignificantDigits: 2 });
  }

  function fmtRatio(r) {
    if (r >= 1) {
      if (r >= 10) return fmtNum(Math.round(r)) + "×";
      return r.toFixed(1).replace(/\.0$/, "") + "×";
    }
    // fraction: "1/5 of"
    const inv = 1 / r;
    if (inv >= 2 && inv < 1000) return "1/" + Math.round(inv);
    return (r * 100).toPrecision(2) + "% of";
  }

  // SI-prefixed: fmtSI(5e8, "W") -> "500 MW"; fmtSI(1.23e3,"W") -> "1.2 kW"
  function fmtSI(n, unit) {
    const steps = [[1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"]];
    for (const [f, s] of steps) if (Math.abs(n) >= f) return fmtNum(n / f) + " " + s + unit;
    return fmtNum(n) + " " + unit;
  }
  // short-scale: fmtShort(5e11) -> "500B"; fmtShort(406000) -> "406K"
  function fmtShort(n) {
    const steps = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"], [1, ""]];
    for (const [f, s] of steps) if (Math.abs(n) >= f) return fmtNum(n / f) + s;
    return fmtNum(n);
  }

  return { parse, place, fmtNum, fmtRatio, fmtSI, fmtShort, fromBase, toBase, DATA, ALIAS };
})();

window.Engine = Engine;
