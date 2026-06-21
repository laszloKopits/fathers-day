// render.js — dispatches on strategy. Two renderers, both fed by Engine.place().

const Render = (() => {
  const SVGNS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, text) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  };
  const div = (cls, html) => {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  };
  const fmt = Engine.fmtNum, fmtR = Engine.fmtRatio;

  // ============================ DISPATCH ============================
  // value formatted for a given type: prefer a per-type formatter (e.g. "500 MW")
  function labelVal(t, v) { return t.fmtBase ? t.fmtBase(v) : fmt(v) + " " + t.fmtUnit; }
  // compact form for crowded axis ticks (falls back to labelVal)
  function tickVal(t, v) { return t.fmtTick ? t.fmtTick(v) : labelVal(t, v); }

  function render(parsed, mount) {
    mount.innerHTML = "";
    const placed = Engine.place(parsed);
    mount.appendChild(headline(parsed, placed));
    const s = parsed.typeDef.strategy;
    if (s === "spatial") spatial(parsed, placed, mount);
    else if (s === "magnitude") magnitude(parsed, placed, mount);
    else scale(parsed, placed, mount);
    if (s !== "magnitude") mount.appendChild(allUnits(parsed));
  }

  // The "it's like X" sentence + the big number.
  function headline(parsed, placed) {
    const t = parsed.typeDef;
    const wrap = div("headline");
    const big = t.fmtBase ? t.fmtBase(parsed.base)
                          : `${fmt(parsed.base)} <span class="unit">${t.fmtUnit}</span>`;
    wrap.appendChild(div("headline-value", big));

    const h = placed.headline;
    const ratio = parsed.base / h.value;
    const like = t.strategy === "spatial" ? "the size of" : "as much as";
    let sentence;
    if (t.strategy === "spatial" || t.strategy === "magnitude") {
      if (ratio >= 0.5 && ratio <= 2) sentence = `About ${like} <b>${h.emoji} ${h.name}</b>`;
      else sentence = `That's <b>${fmtR(ratio)}</b> ${ratio >= 1 ? like : "of"} <b>${h.emoji} ${h.name}</b>`;
    } else {
      const lo = placed.lower, hi = placed.upper;
      if (lo && hi && lo !== hi) sentence = `Between <b>${lo.emoji} ${lo.name}</b> (${fmt(lo.value)}${t.fmtUnit}) and <b>${hi.emoji} ${hi.name}</b> (${fmt(hi.value)}${t.fmtUnit})`;
      else { const a = lo || hi; sentence = `Right at <b>${a.emoji} ${a.name}</b>`; }
    }
    wrap.appendChild(div("headline-text", sentence));
    return wrap;
  }

  // ============================ SPATIAL ============================
  // To-scale nested shapes + a tiling readout.
  function spatial(parsed, placed, mount) {
    const t = parsed.typeDef, base = parsed.base, dim = t.dim;
    const sizeOf = v => Math.pow(Math.max(v, 1e-12), 1 / dim); // side length in canonical^(1/dim)

    // pick anchors within a visible window (area ratio within ~2000x either way)
    const win = placed.anchors.filter(a => {
      const r = a.value / base;
      return r >= 1 / 2000 && r <= 2000 && a.value > 0;
    });
    // build the set to draw: the value + a couple smaller + a couple larger
    const smaller = win.filter(a => a.value < base).slice(-2);
    const larger  = win.filter(a => a.value > base).slice(0, 2);
    const shapes = [
      ...smaller.map(a => ({ ...a, you: false })),
      { name: "Your input", value: base, emoji: "📍", you: true },
      ...larger.map(a => ({ ...a, you: false })),
    ].sort((a, b) => b.value - a.value); // biggest first (drawn at back)

    // AREA → draw the real patch on a satellite map you can pan over any place.
    if (dim === 2) {
      mount.appendChild(mapCard(base, placed));
    } else {
      mount.appendChild(cubesCard(shapes, sizeOf));
    }
    mount.appendChild(tilingCard(parsed, placed));
  }

  // --- to-scale cubes (volume) ---
  function cubesCard(shapes, sizeOf) {
    const dim = 3;
    const W = 520, H = 360, PAD = 16;
    const depthK = 0.28; // isometric depth as a fraction of side
    const maxSide = sizeOf(shapes[0].value);
    // leave room for the 3D depth offset so the biggest cube isn't clipped
    const scale = (Math.min(W, H) - PAD * 2) / (maxSide * (1 + depthK));

    const card = div("card");
    card.appendChild(div("card-title", "🔭 To scale"));
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "scale-svg", width: "100%" });
    // nest from a common bottom-left corner
    const ox = PAD, oy = H - PAD;
    const palette = ["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f59e0b"];
    let ci = 0;
    shapes.forEach((s) => {
      const side = sizeOf(s.value) * scale;
      const color = s.you ? "#22d3ee" : palette[ci++ % palette.length];
      const is3d = dim === 3;
      if (is3d) {
        // simple isometric-ish cube to imply volume
        const d = side * depthK;
        const x = ox, y = oy - side;
        svg.appendChild(el("polygon", { // top
          points: `${x},${y} ${x + side},${y} ${x + side + d},${y - d} ${x + d},${y - d}`,
          fill: color, "fill-opacity": s.you ? 0.55 : 0.22, stroke: color, "stroke-width": s.you ? 2.5 : 1.5,
        }));
        svg.appendChild(el("polygon", { // right
          points: `${x + side},${y} ${x + side},${y + side} ${x + side + d},${y + side - d} ${x + side + d},${y - d}`,
          fill: color, "fill-opacity": s.you ? 0.45 : 0.16, stroke: color, "stroke-width": s.you ? 2.5 : 1.5,
        }));
      }
      svg.appendChild(el("rect", {
        x: ox, y: oy - side, width: side, height: side, rx: 2,
        fill: color, "fill-opacity": s.you ? 0.35 : 0.14,
        stroke: color, "stroke-width": s.you ? 2.5 : 1.5,
        "stroke-dasharray": s.you ? "" : "",
      }));
      // label
      const ly = oy - side - (is3d ? side * 0.30 : 0) - 6;
      const label = el("text", { x: ox + 4, y: Math.max(ly, 14), class: "scale-label", fill: color },
        `${s.emoji} ${s.name}`);
      svg.appendChild(label);
    });
    card.appendChild(svg);
    return card;
  }

  // --- tiling readout (shared by area + volume) ---
  function tilingCard(parsed, placed) {
    const base = parsed.base;
    const ta = placed.tileAnchor, n = placed.tileCount;
    const tcard = div("card");
    tcard.appendChild(div("card-title", "🧮 In familiar units"));
    const phrase = n >= 1
      ? `≈ <b>${fmt(n)}</b> × ${ta.emoji} ${ta.name}`
      : `≈ <b>${fmtR(n)}</b> one ${ta.emoji} ${ta.name}`;
    tcard.appendChild(div("tiling-phrase", phrase));
    if (n >= 1 && n <= 2000) {
      const grid = div("tiling-grid");
      const count = Math.min(Math.round(n), 600);
      for (let i = 0; i < count; i++) {
        const s = document.createElement("span");
        s.textContent = ta.emoji;
        grid.appendChild(s);
      }
      if (Math.round(n) > 600) grid.appendChild(div("tiling-more", `…and ${fmt(Math.round(n) - 600)} more`));
      tcard.appendChild(grid);
    }
    // a few other relatable equivalences
    const others = placed.anchors
      .filter(a => a !== ta && a.value > 0)
      .map(a => ({ a, r: base / a.value }))
      .filter(o => o.r >= 0.1 && o.r <= 100000)
      .sort((x, y) => Math.abs(Math.log(x.r)) - Math.abs(Math.log(y.r)))
      .slice(0, 4);
    if (others.length) {
      const ul = div("equiv-list");
      others.forEach(({ a, r }) => ul.appendChild(div("equiv-item",
        `<span>${a.emoji} ${a.name}</span><b>${fmtR(r)}${r >= 1 ? "" : ""}</b>`)));
      tcard.appendChild(ul);
    }
    return tcard;
  }

  // ============================ MAGNITUDE (log scale) ============================
  // For quantities that span many orders of magnitude (power, water, money,
  // energy, CO₂). A log axis shows the whole ladder at once; the tiling card
  // gives the "it's like N households" punchline.
  function magnitude(parsed, placed, mount) {
    const t = parsed.typeDef, base = parsed.base;
    const all = placed.anchors.filter(a => a.value > 0);
    const L = v => Math.log10(v);
    const lo = Math.min(all[0].value, base), hi = Math.max(all[all.length - 1].value, base);
    const span = (L(hi) - L(lo)) || 1;
    const pad = span * 0.05;
    const pos = v => (L(v) - (L(lo) - pad)) / (span + 2 * pad);
    const pct = v => (Math.max(0, Math.min(1, pos(v))) * 100) + "%";

    const card = div("card");
    card.appendChild(div("card-title", "📏 Where it lands · log scale"));
    const wrap = div("scale-h");
    const track = div("scale-h-track mag");
    const fill = div("scale-h-fill"); fill.style.width = pct(base); track.appendChild(fill);
    const you = div("h-you"); you.style.left = pct(base);
    you.appendChild(div("h-you-dot"));
    you.appendChild(div("h-you-label", `📍 ${labelVal(t, base)}`));
    track.appendChild(you);
    wrap.appendChild(track);

    const labels = div("h-labels");
    all.forEach((a, i) => {
      const lab = div("h-tick" + (i % 2 ? " alt" : ""));
      lab.style.left = (pos(a.value) * 100) + "%";
      lab.appendChild(div("h-tick-line"));
      lab.appendChild(div("h-tick-label", `${a.emoji}<br>${a.name}<br><b>${tickVal(t, a.value)}</b>`));
      labels.appendChild(lab);
    });
    wrap.appendChild(labels);
    card.appendChild(wrap);
    mount.appendChild(card);

    mount.appendChild(tilingCard(parsed, placed));
    const nc = notesCard(t, all, base);
    if (nc) mount.appendChild(nc);
  }

  // nearest anchors that carry an explanatory note (shared by scale + magnitude)
  function notesCard(t, all, base) {
    const near = [...all]
      .map(a => ({ a, d: Math.abs((t.strategy === "scale" ? a.value : Math.log10(a.value || 1)) -
                                  (t.strategy === "scale" ? base : Math.log10(base || 1))) }))
      .sort((x, y) => x.d - y.d).slice(0, 4).map(o => o.a)
      .filter(a => a.note)
      .sort((a, b) => a.value - b.value);
    if (!near.length) return null;
    const card = div("card");
    card.appendChild(div("card-title", "📌 Around this point"));
    const ul = div("note-list");
    near.forEach(a => ul.appendChild(div("note-item",
      `<span class="note-emoji">${a.emoji}</span><div><b>${a.name}</b> · ${labelVal(t, a.value)}<div class="note-text">${a.note}</div></div>`)));
    card.appendChild(ul);
    return card;
  }

  // ============================ SATELLITE MAP (area) ============================
  // Draws the input area as a square patch, at true real-world scale, on ESRI
  // World Imagery satellite tiles. The patch is pinned to the map centre and
  // follows as you drag — so you can park it over any place you know.
  let _map = null;
  let _mapStatus = null;

  function setStatus(html, kind) {
    if (!_mapStatus) return;
    _mapStatus.className = "map-status" + (kind ? " " + kind : "");
    _mapStatus.innerHTML = html;
  }

  // Geolocate, drop a persistent "you are here" pin + accuracy ring, and centre
  // the patch on the spot so you can see how far your area reaches from you.
  function locateMe() {
    if (!_map) return;
    if (!navigator.geolocation || !window.isSecureContext) {
      setStatus("Geolocation needs a secure (https) page and a device that supports it.", "warn");
      return;
    }
    setStatus("📡 Finding where you are…");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        _map.dropYouHere(latitude, longitude, accuracy);
        setStatus(`🧍 Patch placed over you — drag the map to explore. <span class="muted">(±${Math.round(accuracy)} m accuracy)</span>`, "ok");
      },
      err => {
        setStatus(err.code === 1
          ? "Location blocked — allow location access for this site in your browser, then try again."
          : "Couldn't get a fix on your location. Try again outdoors or check location services.", "warn");
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  }

  const PLACES = [
    { label: "🌳 Central Park", lat: 40.7829, lng: -73.9654 },
    { label: "🗽 Manhattan",    lat: 40.7549, lng: -73.9840 },
    { label: "🌉 San Francisco", lat: 37.7749, lng: -122.4194 },
    { label: "🗼 Paris",        lat: 48.8566, lng: 2.3522 },
  ];

  function mapCard(areaM2, placed) {
    const card = div("card");
    card.appendChild(div("card-title", "🛰️ To scale — on real ground"));
    card.appendChild(div("map-help",
      "This patch is your exact area. Drag the map to drop it on somewhere you know."));

    // jump chips
    const bar = div("map-bar");
    const side = Math.sqrt(areaM2); // metres
    PLACES.forEach(p => {
      const b = document.createElement("button");
      b.className = "map-chip"; b.textContent = p.label;
      b.addEventListener("click", () => _map && _map.setView([p.lat, p.lng], zoomForSide(side, p.lat)));
      bar.appendChild(b);
    });
    const geo = document.createElement("button");
    geo.className = "map-chip primary"; geo.textContent = "🧍 Place over where I'm standing";
    geo.addEventListener("click", locateMe);
    bar.appendChild(geo);
    card.appendChild(bar);

    const mapEl = div("map");
    card.appendChild(mapEl);

    _mapStatus = div("map-status");
    card.appendChild(_mapStatus);

    // init after the element is in the DOM
    setTimeout(() => initMap(mapEl, areaM2, placed), 0);
    return card;
  }

  function zoomForSide(sideM, lat) {
    // pick a zoom so the square is ~45% of a ~600px-wide map
    const targetPx = 270;
    const mppTarget = sideM / targetPx;
    const z = Math.log2(156543.03 * Math.cos(lat * Math.PI / 180) / mppTarget);
    return Math.max(2, Math.min(19, Math.round(z)));
  }

  function initMap(mapEl, areaM2, placed) {
    if (_map) { try { _map.remove(); } catch (e) {} _map = null; }
    const side = Math.sqrt(areaM2);
    const start = PLACES[0];
    const map = L.map(mapEl, { zoomControl: true, attributionControl: false })
      .setView([start.lat, start.lng], zoomForSide(side, start.lat));
    _map = map;
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, maxNativeZoom: 19 }).addTo(map);
    L.control.scale({ imperial: true, metric: true }).addTo(map);

    // the area patch — recomputed to stay centred & true-size as you move
    const half = side / 2;
    const patch = L.rectangle([[0, 0], [0, 0]], {
      color: "#22d3ee", weight: 3, fillColor: "#22d3ee", fillOpacity: 0.28,
    }).addTo(map);
    const tip = L.tooltip({ permanent: true, direction: "center", className: "patch-tip" });

    function update() {
      const c = map.getCenter();
      const dLat = half / 111320;
      const dLng = half / (111320 * Math.cos(c.lat * Math.PI / 180));
      patch.setBounds([[c.lat - dLat, c.lng - dLng], [c.lat + dLat, c.lng + dLng]]);
      patch.bindTooltip(tip.setContent(`${fmt(areaM2)} m² · ${fmt(placed.tileCount)}× ${placed.tileAnchor.emoji}`));
    }
    map.on("move", update);
    update();

    // drop / move the persistent "you are here" marker + accuracy ring
    map.dropYouHere = (lat, lng, acc) => {
      if (map._youMarker) map.removeLayer(map._youMarker);
      if (map._youRing) map.removeLayer(map._youRing);
      if (acc && acc < 3000) {
        map._youRing = L.circle([lat, lng], {
          radius: acc, color: "#f59e0b", weight: 1, fillColor: "#f59e0b", fillOpacity: 0.06,
        }).addTo(map);
      }
      map._youMarker = L.circleMarker([lat, lng], {
        radius: 7, color: "#fff", weight: 2, fillColor: "#f59e0b", fillOpacity: 1,
      }).addTo(map).bindTooltip("🧍 You are here", { permanent: false, direction: "top" });
      map.setView([lat, lng], zoomForSide(side, lat));
    };

    setTimeout(() => map.invalidateSize(), 60);
  }

  // ============================ SCALE ============================
  function scale(parsed, placed, mount) {
    const t = parsed.typeDef, base = parsed.base;
    const all = placed.anchors;

    // choose a display window that brackets the value with its NEAR neighbours.
    // Using only the 2 closest anchors each side keeps far outliers (e.g. Lava
    // at 1100°C when you typed 200°C) from blowing the linear scale wide open.
    let lo, hi;
    if (t.range) {
      [lo, hi] = t.range;
      lo = Math.min(lo, base); hi = Math.max(hi, base);
    } else {
      // Bracket by the IMMEDIATE neighbours and pad generously, so the value
      // sits centred with context — without a far anchor stretching the scale.
      const nb = all.filter(a => a.value < base).slice(-1)[0];
      const na = all.filter(a => a.value >= base)[0];
      let c0, c1;
      if (nb && na) { c0 = nb.value; c1 = na.value; }
      else if (na) { c0 = base - Math.abs(na.value - base); c1 = na.value; }
      else { c0 = nb.value; c1 = base + Math.abs(base - nb.value); }
      const gap = Math.max(c1 - c0, Math.abs(base) * 0.1, 1);
      lo = c0 - gap * 0.6;
      hi = c1 + gap * 0.6;
    }
    const visible = all.filter(a => a.value >= lo && a.value <= hi);

    const card = div("card");
    card.appendChild(div("card-title", t.orient === "v" ? "🌡️ Where it lands" : "🔊 Where it lands"));
    const pos = v => (v - lo) / (hi - lo); // 0..1

    if (t.orient === "v") {
      // vertical thermometer
      const wrap = div("scale-v");
      const track = div("scale-v-track");
      const fill = div("scale-v-fill");
      fill.style.height = (Math.max(0, Math.min(1, pos(base))) * 100) + "%";
      track.appendChild(fill);
      wrap.appendChild(track);

      visible.forEach(a => {
        const tick = div("v-tick");
        tick.style.bottom = (pos(a.value) * 100) + "%";
        tick.appendChild(div("v-tick-line"));
        tick.appendChild(div("v-tick-label", `${a.emoji} ${a.name} · <b>${fmt(a.value)}${t.fmtUnit}</b>`));
        wrap.appendChild(tick);
      });
      const you = div("v-you");
      you.style.bottom = (Math.max(0, Math.min(1, pos(base))) * 100) + "%";
      you.appendChild(div("v-you-dot"));
      you.appendChild(div("v-you-label", `📍 ${fmt(base)}${t.fmtUnit}`));
      wrap.appendChild(you);
      card.appendChild(wrap);
    } else {
      // horizontal level meter
      const wrap = div("scale-h");
      const track = div("scale-h-track");
      const fill = div("scale-h-fill");
      fill.style.width = (Math.max(0, Math.min(1, pos(base))) * 100) + "%";
      track.appendChild(fill);
      const you = div("h-you");
      you.style.left = (Math.max(0, Math.min(1, pos(base))) * 100) + "%";
      you.appendChild(div("h-you-dot"));
      you.appendChild(div("h-you-label", `📍 ${fmt(base)}${t.fmtUnit}`));
      track.appendChild(you);
      wrap.appendChild(track);

      const labels = div("h-labels");
      // alternate label rows so neighbouring labels don't collide horizontally
      visible.forEach((a, i) => {
        const lab = div("h-tick" + (i % 2 ? " alt" : ""));
        lab.style.left = (pos(a.value) * 100) + "%";
        lab.appendChild(div("h-tick-line"));
        lab.appendChild(div("h-tick-label", `${a.emoji}<br>${a.name}<br><b>${fmt(a.value)}</b>`));
        labels.appendChild(lab);
      });
      wrap.appendChild(labels);
      card.appendChild(wrap);
    }
    mount.appendChild(card);

    // "things that happen around here" notes
    const nc = notesCard(t, all, base);
    if (nc) mount.appendChild(nc);
  }

  // a compact "same value in other units" strip
  function allUnits(parsed) {
    const t = parsed.typeDef;
    const card = div("card subtle");
    card.appendChild(div("card-title", "🔁 Same amount, other units"));
    const row = div("unit-row");
    for (const key of Object.keys(t.units)) {
      const v = Engine.fromBase(t, key, parsed.base);
      row.appendChild(div("unit-chip", `<b>${fmt(v)}</b> ${prettyUnit(key)}`));
    }
    card.appendChild(row);
    return card;
  }
  function prettyUnit(k) {
    const map = { m2: "m²", ft2: "ft²", km2: "km²", mi2: "mi²", yd2: "yd²", m3: "m³",
      mL: "mL", floz: "fl oz", gal: "gal", qt: "qt" };
    return map[k] || k;
  }

  return { render };
})();

window.Render = Render;
