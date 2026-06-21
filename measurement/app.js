// app.js — wire the UI to the engine.
(() => {
  const q = document.getElementById("q");
  const go = document.getElementById("go");
  const hint = document.getElementById("hint");
  const result = document.getElementById("result");
  const empty = document.getElementById("empty");

  function show(raw) {
    const parsed = Engine.parse(raw);
    if (!parsed) {
      hint.textContent = raw.trim()
        ? "Couldn't read that. Try a number + unit, like \"4000 acres\" or \"85 dB\"."
        : "";
      result.innerHTML = "";
      empty.style.display = parsed ? "none" : "";
      return;
    }
    hint.innerHTML = `Detected <b>${parsed.typeDef.emoji} ${parsed.typeDef.label}</b>`;
    empty.style.display = "none";
    Render.render(parsed, result);
    // reflect in URL for shareable links
    history.replaceState(null, "", "?q=" + encodeURIComponent(raw.trim()));
  }

  let debounce;
  q.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => show(q.value), 180);
  });
  q.addEventListener("keydown", e => { if (e.key === "Enter") { clearTimeout(debounce); show(q.value); } });
  go.addEventListener("click", () => show(q.value));

  document.querySelectorAll(".chip").forEach(c => {
    c.addEventListener("click", () => { q.value = c.dataset.q; show(q.value); q.focus(); });
  });

  // deep link
  const params = new URLSearchParams(location.search);
  const initial = params.get("q");
  if (initial) { q.value = initial; show(initial); }
})();
