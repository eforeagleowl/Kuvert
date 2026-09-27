// Kuvert. Puts the pieces together: the list, the store, the views, the router and the render loop.
//
//   js/compat   the save formats (frozen: shared with the original app)
//   js/data     the catalogue and lists
//   js/state    progress and the rules (store, draw, stats, merge)
//   js/storage  backup files and sync      js/tmdb     film details
//   js/views    the pages                  js/ui       small building blocks
import { $, h, s, transition, reduceMotion } from "./ui/dom.js";
import { Toast, announce } from "./ui/toast.js";
import { Dialogs } from "./ui/dialogs.js";
import { Horse } from "./ui/horse.js";
import { makeSounds } from "./ui/sounds.js";
import { resolveList } from "./data/lists.js";
import { makeCatalog } from "./state/catalog.js";
import { Store } from "./state/store.js";
import { weekStreak, tallyNote, plural } from "./state/stats.js";
import { Sync } from "./storage/sync.js";
import { FileBackup } from "./storage/files.js";
import { Details } from "./tmdb/client.js";
import { Stage } from "./views/stage.js";
import { Evening } from "./views/evening.js";
import { Library } from "./views/library.js";
import { Stats } from "./views/stats.js";
import { Settings } from "./views/settings.js";
import { Rails } from "./views/rails.js";
import { Share } from "./share/images.js";
import { enterSeagal, installSeagal, makeStandDown } from "./fun/seagal.js";
import { PALETTES } from "./data/catalogue.js";

const PAGES = ["tonight", "library", "stats", "settings"];

function safeStorage() {
  try {
    const t = "kuvert:probe";
    localStorage.setItem(t, "1");
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    return null;
  }
}

const storage = safeStorage();
const seagal = document.documentElement.dataset.mode === "seagal";
const list = resolveList(storage || { getItem: () => null });
const catalog = makeCatalog(list);
const store = new Store({ list, catalog, storage });
const loadError = store.load();

/** Everything the views share. */
const app = {
  storage,
  seagal,
  list,
  catalog,
  store,
  sg: (normal, sgWord) => (seagal ? sgWord : normal),
  play: makeSounds(storage),
  announce,
  streak: () => weekStreak(store.p, catalog),
};
app.details = new Details({ store });
app.sync = new Sync({ store, storage: storage || { getItem: () => null, setItem() {}, removeItem() {} } });
app.files = new FileBackup({ store });
app.toast = new Toast({
  onUndo: (snapshot) => {
    const shown = app.stage.shown;
    store.undo(snapshot);
    // A stub stays up if it's still watched; otherwise tonight's ticket catches up.
    if (app.stage.mode === "watched" && shown && store.p.seen.has(shown.id) && shown.id !== snapshot.current) app.stage.renderWatched();
    else app.stage.syncPick();
    app.toast.show("Change undone.");
    if (!$("drawBtn").hidden) $("drawBtn").focus();
  },
});
app.dialogs = new Dialogs(app);
app.horse = new Horse({ store, play: app.play, announce, seagal });
app.share = new Share(app);

// ---------------------------------------------------------------- shared actions
app.toggleShelf = (id) => {
  const undo = store.toggleShelf(id),
    f = catalog.byId.get(id);
  app.stage.paintShelf();
  app.toast.show(f.t + (store.p.shelf.has(id) ? " is on your shelf." : " is off your shelf."), undo);
};
app.setVerdict = (id, value, { quiet = false } = {}) => {
  const undo = store.setVerdict(id, value);
  const v = store.p.verdicts[id];
  const said = v ? ": " + { yes: "deserved it", no: "didn't deserve it", unsure: "not sure" }[v] + "." : ": verdict cleared.";
  if (quiet) announce(catalog.byId.get(id).t + said);
  else app.toast.show(catalog.byId.get(id).t + said, undo);
};
// "Should have won": for winners you voted No on, the other nominees of that ceremony.
app.fillShouldHaveWon = (select, wrap, f, verdict = store.p.verdicts[f.id]) => {
  const show = catalog.isWinner(f) && verdict === "no";
  wrap.hidden = !show;
  if (!show) return;
  const rivals = catalog.ceremonyFilms(f.c).filter((x) => x !== f);
  select.replaceChildren(new Option("Pick a film…", ""), ...rivals.map((x) => new Option(x.t, x.id)), new Option("A nominee not on my list", "other"));
  select.value = store.p.snubs[f.id] || "";
};
app.confetti = () => {
  if (seagal || reduceMotion()) return;
  document.querySelector(".confetti")?.remove();
  const box = h("div", { class: "confetti", attrs: { "aria-hidden": "true" } }),
    kinds = ["ticket", "ticket", "crown", "dot"];
  let longest = 0;
  for (let i = 0; i < 72; i++) {
    const kind = kinds[i % kinds.length];
    const piece = kind === "crown" ? h("i", { class: "c-crown" }, s("svg", { viewBox: "0 0 24 20", class: "crowns" }, s("use", { href: "#crowns" }))) : h("i", { class: "c-" + kind });
    piece.style.left = (Math.random() * 100).toFixed(1) + "%";
    box.append(piece);
    const duration = 2600 + Math.random() * 1800,
      delay = Math.random() * 700;
    piece.animate(
      [{ transform: "translate(0, -40px) rotate(0deg)" }, { transform: "translate(" + (Math.random() - 0.5) * 160 + "px, " + (innerHeight + 40) + "px) rotate(" + (Math.random() - 0.5) * 900 + "deg)" }],
      { duration, delay, easing: "cubic-bezier(0.25, 0.4, 0.5, 1)", fill: "both" },
    );
    longest = Math.max(longest, duration + delay);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), longest + 100);
};

// ---------------------------------------------------------------- the router
// Pages live at #tonight, #library, #stats and #settings; tab switches slide in the direction of travel.
let page = null;
app.router = {
  get page() {
    return page;
  },
  show(name, { focus = true, push = true } = {}) {
    if (!PAGES.includes(name)) name = "tonight";
    if (name === page) {
      if (focus && name !== "tonight") $(name === "library" ? "libraryHeading" : name + "Heading")?.focus({ preventScroll: true });
      return;
    }
    const from = page;
    const dir = from && PAGES.indexOf(name) < PAGES.indexOf(from) ? "back" : "forward";
    page = name;
    if (push && from) history.pushState({ page: name }, "", "#" + name);
    const swap = () => {
      for (const p of PAGES) $("page-" + p).hidden = p !== name;
      document.documentElement.dataset.page = name;
      for (const a of document.querySelectorAll("a[data-route]"))
        if (a.dataset.route === name) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      render();
      if (from) window.scrollTo({ top: 0 });
    };
    (from ? transition(swap, [dir]) : Promise.resolve(swap())).then(() => {
      if (name === "stats") app.stats.enter();
      if (name === "library") app.library.syncPosters();
    });
    if (focus && from) {
      const heading = { library: "libraryHeading", stats: "statsHeading", settings: "settingsHeading" }[name];
      requestAnimationFrame(() => (heading ? $(heading) : $("drawBtn"))?.focus({ preventScroll: true }));
    }
  },
};
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-route]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  if (a.dataset.route === "skip") return $("main").focus();
  app.router.show(a.dataset.route);
});
window.addEventListener("popstate", () => {
  const name = location.hash.slice(1);
  if (PAGES.includes(name)) app.router.show(name, { push: false, focus: false });
});

// ---------------------------------------------------------------- views
app.stage = new Stage(app);
app.library = new Library(app);
app.stats = new Stats(app);
app.evening = new Evening(app);
app.settings = new Settings(app);
app.rails = new Rails(app);
if (seagal) installSeagal(app);
$("braveLink").addEventListener("click", () => storage && enterSeagal(storage));
const standDown = makeStandDown(app);
$("standDown").addEventListener("click", standDown);
$("standDownFooter").addEventListener("click", standDown);

// ---------------------------------------------------------------- rendering
let scheduled = false;
app.renderSoon = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(render);
};
function render() {
  scheduled = false;
  const n = store.p.seen.size,
    total = catalog.films.length;
  const cheer = seagal ? null : tallyNote(n, total);
  $("tally").replaceChildren(h("b", { text: String(n) }), " of " + total + (seagal ? " targets neutralized" : " watched"), cheer ? h("span", { class: "cheer", lang: "sv", title: cheer[1], text: cheer[0] }) : null);
  $("progressFill").style.setProperty("--p", (total ? (n / total) * 100 : 0) + "%");
  app.stage.render();
  app.evening.render();
  app.horse.render();
  app.rails.render();
  if (page === "library") app.library.render();
  if (page === "stats") app.stats.render();
  if (page === "settings") app.settings.render();
  app.settings.renderBackup();
}
app.render = render;

store.addEventListener("change", (e) => {
  if (e.detail.saved) {
    if (app.files.handle) app.files.queueWrite();
    app.sync.schedule(() => app.settings.syncNow({ quiet: true }));
  }
  app.renderSoon();
});

// The list's own name, counts and colours.
for (const el of document.querySelectorAll("[data-count]")) el.textContent = String(catalog.films.length);
if (!seagal) {
  for (const el of document.querySelectorAll("[data-name]")) el.textContent = list.name;
  for (const el of document.querySelectorAll("[data-subtitle]")) el.textContent = list.subtitle;
  document.title = list.name + (list.custom ? "" : " — Best Picture watchthrough");
  const palette = PALETTES[list.palette];
  if (list.custom && palette) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", palette.house);
}

// ---------------------------------------------------------------- keyboard
document.addEventListener("keydown", (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
  const t = e.target,
    typing = t?.matches?.("input,textarea,select") || t?.isContentEditable;
  if (e.key === "/" && !typing) {
    e.preventDefault();
    app.router.show("library", { focus: false });
    requestAnimationFrame(() => $("search").focus());
    return;
  }
  if (typing) {
    if (e.key === "Escape") t.blur();
    return;
  }
  if (t?.closest?.('button,a,summary,[role="button"],[role="slider"]')) return;
  if (page !== "tonight") return;
  const stage = app.stage;
  if (e.key === "Enter") {
    e.preventDefault();
    if (stage.busy) stage.skipAhead();
    else if (stage.mode === "watched") stage.finishWatched();
    else stage.drawOrFinale();
  } else if (e.key.toLowerCase() === "w" && stage.mode === "tonight" && stage.open) stage.markWatched();
  else if (stage.mode === "watched" && stage.shown && /^[1-5]$/.test(e.key)) stage.rate(stage.shown.id, Number(e.key));
});
window.addEventListener("beforeunload", (e) => {
  if (store.dirty || app.files.pending) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// ---------------------------------------------------------------- start
app.router.show(PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "tonight", { push: false, focus: false });
history.replaceState({ page }, "", "#" + page);
app.stage.syncPick();
render();
if (loadError) app.toast.show(loadError);
app.dialogs.resumePendingRestore();
if (app.sync.on) app.settings.syncNow({ quiet: true });
// Offline support and home-screen install when served from the web.
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
// For tests and the curious: the app, read-only.
Object.defineProperty(window, "kuvert", { value: Object.freeze({ app, version: "4.0", count: () => plural(store.p.seen.size, "film") }) });
