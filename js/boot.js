// Runs before the first paint (a classic script, not a module): SEAGAL's skin and an imported list's
// palette go on the root element now, so the page never flashes the wrong colours.
(function () {
  var root = document.documentElement;
  try {
    if (localStorage.getItem("kuvert:mode") === "seagal") {
      root.dataset.mode = "seagal";
      return;
    }
    var active = localStorage.getItem("kuvert:activeList");
    if (!active || active === "builtin") return;
    var def = JSON.parse(localStorage.getItem("kuvert:lists") || "{}")[active];
    if (def && /^[a-z]+$/.test(def.palette || "") && def.palette !== "kuvert") root.dataset.palette = def.palette;
  } catch (e) {}
})();
