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
    const text = raw.trim().toLowerCase();
    // number: optional sign, digits/commas, decimal, scientific notation
    const m = text.match(/^([-+]?[\d,]*\.?\d+(?:e[-+]?\d+)?)\s*(.*)$/i);
    if (!m) return null;
    const value = parseFloat(m[1].replace(/,/g, ""));
    if (!isFinite(value)) return null;
    const unitTok = (m[2] || "").replace(/\s+/g, "");
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
    const useLog = typeDef.strategy === "spatial";
    let headline = anchors[0], bestD = Infinity;
    for (const a of anchors) {
      const d = useLog
        ? Math.abs(Math.log(Math.max(base, 1e-12)) - Math.log(Math.max(a.value, 1e-12)))
        : Math.abs(base - a.value);
      if (d < bestD) { bestD = d; headline = a; }
    }

    // "relatable" anchor for tiling: largest anchor <= value, else smallest
    let tileAnchor = lower || anchors[0];
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

  return { parse, place, fmtNum, fmtRatio, fromBase, toBase, DATA, ALIAS };
})();

window.Engine = Engine;
