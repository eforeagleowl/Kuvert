// Runs before the first paint (a classic script, not a module): SEAGAL's skin, Swedish and an imported
// list's palette go on the root element now, so the page never flashes the wrong colours or language.
(function () {
  var root = document.documentElement;
  try {
    if (localStorage.getItem("kuvert:mode") === "seagal") {
      root.dataset.mode = "seagal";
      return;
    }
    // Swedish: the page stays hidden until main.js has translated it (css/base.css), so it never
    // flashes English first.
    if (localStorage.getItem("kuvert:lang") === "sv") {
      root.lang = "sv";
      root.dataset.lang = "sv";
    }
    var active = localStorage.getItem("kuvert:activeList");
    if (!active || active === "builtin") return;
    var def = JSON.parse(localStorage.getItem("kuvert:lists") || "{}")[active];
    if (def && /^[a-z]+$/.test(def.palette || "") && def.palette !== "kuvert") root.dataset.palette = def.palette;
  } catch (e) {}
})();
