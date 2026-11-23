// Runs before the first paint (a classic script, not a module): SEAGAL's skin, Swedish and an imported
// list's palette go on the root element now, so the page never flashes the wrong colors or language.
// The page is on the screen before the app has started, and on a slow connection that can be several
// seconds: so the masthead is already the size it will be, and a tap on the envelope's button is kept.
(function () {
  var root = document.documentElement;
  // A tap on the envelope's button before anything answers it: the button shows it was pressed
  // (css/tonight.css), and js/main.js opens the envelope as soon as the app is up.
  document.addEventListener("click", function early(e) {
    if (window.kuvert) return document.removeEventListener("click", early);
    if (e.target && e.target.closest && e.target.closest("#drawBtn")) root.dataset.early = "draw";
  });
  try {
    var seagal = localStorage.getItem("kuvert:mode") === "seagal";
    // Someone who has been before gets the smaller masthead from the first paint (js/views/evening.js
    // decides for certain once the app is up).
    if (seagal || localStorage.getItem("kuvert:welcomed")) root.setAttribute("data-returning", "");
    if (seagal) {
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
