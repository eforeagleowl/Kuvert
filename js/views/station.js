// The station: a split-flap departure board for the same films, filters and progress as the envelope.
// Draw here and the board flips with tonight's film first, lit in brass; a ticket prints from the slot
// and gets stamped. That ticket is tonight's ticket: "Take your ticket" opens it on Tonight.
// A mode of Tonight rather than a tab. Not in SEAGAL mode.
import { $, h, s, reduceMotion, wait } from "../ui/dom.js";
import { HORSE_BODY } from "../ui/horse.js";
import { allWatched, plural } from "../state/stats.js";
import { hasActiveFilters } from "../state/draw.js";
import { defaultWatchDate } from "../state/dates.js";
import { Flaps } from "../station/flaps.js";
import { StationAudio } from "../station/audio.js";
import * as T from "../station/timetable.js";

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const REMARKS = { W: "Won", N: "Nominated", H: "Honorable mention" };

export class Station {
  constructor(app) {
    this.app = app;
    this.el = $("page-station");
    this.visible = false;
    this.rows = [];
    this.drawn = null;
    this.busy = false;
    this.message = "";
    this.layout = null;
    this.layoutKey = "";
    this.fontsReady = false;
    this.clockText = "";
    this.running = false;
    if (app.seagal) return;
    this.audio = new StationAudio(app.storage);
    this.board = new Flaps($("stFlaps"), {
      header: true,
      lamp: true,
      theme: this.el,
      labels: { time: ["TID", "Time"], year: ["ÅR", "Year"], title: ["TILL", "To"], track: ["SPÅR", "Track"], rem: ["ANM.", "Remarks"] },
    });
    this.clock = new Flaps($("stClock"), { theme: this.el });
    this.frame = this.frame.bind(this);

    $("stDraw").addEventListener("click", () => this.draw());
    $("stSound").addEventListener("click", () => this.toggle("sound"));
    $("stVoice").addEventListener("click", () => this.toggle("voice"));
    // Any tap on the station lets the browser make sound from then on.
    this.el.addEventListener("pointerdown", () => this.audio.unlock());
    const horse = $("stationHorse");
    horse.addEventListener("click", () => {
      this.audio.unlock();
      this.audio.knock();
      if (reduceMotion()) return;
      horse.classList.remove("hop");
      void horse.offsetWidth;
      horse.classList.add("hop");
    });
    horse.addEventListener("animationend", () => horse.classList.remove("hop"));
    // The printed ticket keeps its ink, and doesn't print again when the station is shown again.
    const ticket = $("stTicket");
    const settle = (e) => {
      if (e.animationName === "st-print") ticket.classList.remove("printing");
      if (e.animationName === "st-stamp") ticket.classList.replace("stamped", "inked");
    };
    ticket.addEventListener("animationend", settle);
    ticket.addEventListener("animationcancel", settle);
    let resizeTimer;
    new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.visible && this.relayout(), 90);
    }).observe($("stFlapwrap"));
    this.syncToggles();
    this.setDrawLabel();
    // The flaps are painted with Geist: wait for it (briefly) so the atlas isn't drawn in a fallback face.
    const faces = document.fonts
      ? Promise.all([document.fonts.load('600 32px "Geist"', "AÅÄÖ09"), document.fonts.load('400 32px "Geist"', "Time"), document.fonts.load('500 16px "Geist Mono"', "KU0")])
      : Promise.resolve();
    Promise.race([faces, wait(1800)])
      .catch(() => {})
      .then(() => {
        this.fontsReady = true;
        if (this.visible) {
          this.visible = false;
          this.show();
        }
      });
  }

  // ---------------------------------------------------------------- the timetable
  pool() {
    return this.app.store.units().map((u) => u.film);
  }
  get size() {
    return this.board.rows.length || 8;
  }
  freshRows() {
    const films = shuffle(this.pool()),
      times = T.schedule(this.size);
    return films.slice(0, this.size).map((film, i) => ({ film, time: times[i], hl: false }));
  }
  // Trains join at the bottom, 5 to 25 minutes after the last one.
  topUp() {
    const on = new Set(this.rows.map((r) => r.film.id)),
      films = shuffle(this.pool().filter((f) => !on.has(f.id)));
    let t = this.rows.length ? this.rows.at(-1).time : T.schedule(1)[0];
    let first = !this.rows.length;
    while (this.rows.length < this.size && films.length) {
      if (!first) t = new Date(t.getTime() + 5 * 60000 * (1 + Math.floor(Math.random() * 5)));
      first = false;
      this.rows.push({ film: films.pop(), time: t, hl: false });
    }
  }
  // Trains that have left come off the board. The drawn film waits for you.
  checkDepartures() {
    if (this.busy || !this.rows.length) return;
    const now = Date.now(),
      keep = this.rows.filter((r) => r.hl || r.time.getTime() > now);
    if (keep.length === this.rows.length) return;
    this.rows = keep;
    this.topUp();
    this.paint();
  }
  boardMessage() {
    if (this.rows.length) return "";
    return allWatched(this.app.store.p, this.app.catalog) ? "ALLT SETT!" : "INGA TÅG";
  }
  paint({ instant = false, base = 0 } = {}) {
    if (!this.layout) return;
    const { catalog } = this.app,
      groups = this.layout.groups,
      message = this.boardMessage(),
      quick = instant || reduceMotion();
    for (let r = 0; r < this.board.rows.length; r++) {
      const row = this.rows[r];
      const strs = row ? T.rowStrings(row, groups, catalog) : groups.map(([k]) => (r === 0 && k === "title" ? message : ""));
      this.board.setRow(r, strs, row?.hl ? 1 : 0, { delay: base + r * 90, instant: quick });
      this.board.lamps[r] = row?.hl && !this.busy ? 1 : 0;
    }
    this.board.lampDirty = true;
    // The same board for screen readers, as a table.
    $("stRows").replaceChildren(
      ...this.rows.map((row) =>
        h(
          "tr",
          {},
          [T.hhmm(row.time), row.film.t, row.film.y, T.track(row.film, catalog), (row.hl ? "Tonight's film. " : "") + (REMARKS[row.film.s] || "")].map((v) => h("td", { text: String(v) })),
        ),
      ),
    );
    this.kick();
  }
  frame(now) {
    const dt = Math.min(64, now - this.last);
    this.last = now;
    const flips = this.board.update(dt) + this.clock.update(dt);
    if (flips) this.audio.clatter(flips);
    this.board.render(now);
    this.clock.render(now);
    if (this.visible && (this.board.busy || this.clock.busy || now < this.board.blinkUntil + 300)) requestAnimationFrame(this.frame);
    else this.running = false;
  }
  kick() {
    if (this.running || !this.visible) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }
  relayout() {
    const width = $("stFlapwrap").clientWidth;
    if (!width) return;
    const L = T.chooseLayout(width);
    const key = [L.groups.map((g) => g.join(":")).join(","), L.cw, L.rows, window.devicePixelRatio].join("|");
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    this.layout = L;
    this.board.configure({ groups: L.groups, nRows: L.rows, cw: L.cw });
    this.clock.configure({ groups: [["clock", 5]], nRows: 1, cw: Math.max(13, Math.min(21, L.cw * 0.9)) });
    if (this.rows.length > L.rows) this.rows = this.rows.slice(0, L.rows);
    else if (this.rows.length < L.rows && !this.busy) this.topUp();
    if (this.fontsReady) {
      this.paint({ instant: true });
      this.clock.setRow(0, [this.clockText], 0, { instant: true });
    }
    this.kick();
  }
  tick() {
    if (!this.fontsReady || !this.visible) return;
    const now = new Date(),
      text = T.hhmm(now);
    this.countdown();
    if (text === this.clockText) return;
    this.clockText = text;
    this.clock.setRow(0, [text], 0, { instant: reduceMotion() });
    this.kick();
    this.checkDepartures();
  }

  // ---------------------------------------------------------------- the ticker
  // An LED strip that runs at a steady pace whatever the length of its message.
  setTicker(text) {
    this.tickerText = text;
    if (!this.visible) return;
    const line = text + "      ·      ";
    const run = h("div", { class: "st-ticker-run" }, h("span", { text: line }), h("span", { text: line }));
    $("stTicker").replaceChildren(run);
    const width = run.firstChild.getBoundingClientRect().width || line.length * 11;
    run.style.setProperty("--dur", Math.max(12, width / 70).toFixed(1) + "s");
  }
  idleTicker() {
    const { store, catalog, list } = this.app;
    this.setTicker(T.idleTicker({ listName: list.name, count: this.pool().length, saved: this.pending(), allWatched: allWatched(store.p, catalog) }));
  }

  // ---------------------------------------------------------------- the ticket
  stamp(date) {
    return s(
      "svg",
      { viewBox: "0 0 120 120", "aria-hidden": "true" },
      s("defs", {}, s("path", { id: "stStampRing", d: "M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" })),
      s("circle", { cx: 60, cy: 60, r: 56, fill: "none", stroke: "currentColor", "stroke-width": 3 }),
      s("circle", { cx: 60, cy: 60, r: 35, fill: "none", stroke: "currentColor", "stroke-width": 1.5 }),
      s("text", { class: "st-stamp-ring", fill: "currentColor" }, s("textPath", { href: "#stStampRing" }, "KUVERT C · AVGÅNGAR · " + date.toUpperCase() + " ·")),
      s("g", { transform: "translate(35 38) scale(.5)" }, s("path", { d: HORSE_BODY, fill: "currentColor" })),
    );
  }
  ticketParts(row) {
    const { catalog, list } = this.app,
      f = row.film,
      time = T.hhmm(row.time),
      track = T.track(f, catalog),
      date = today(),
      shelf = catalog.shelfOf(f);
    const sub = f.y + (shelf ? " · " + shelf.label : "") + (f.tri ? " · " + catalog.series[f.tri] + ", part " + f.ord : "");
    const field = (label, value, extra) => h("div", {}, h("dt", { text: label }), h("dd", {}, value, extra || null));
    return [
      h(
        "div",
        { class: "st-main" },
        h("div", { class: "st-thead" }, h("span", { lang: "sv", text: list.name + " · Biobiljett" }), h("span", { text: "Nr " + catalog.ticketNumber(f) + " / " + catalog.films.length })),
        h("p", { class: "st-chip", lang: "sv", text: T.chip(f, catalog) }),
        h("h3", { class: "st-ttitle", text: f.t }),
        h("p", { class: "st-sub", text: sub }),
        h(
          "dl",
          { class: "st-fields" },
          field("Departs", time, h("small", { class: "st-when", id: "stWhen" })),
          field("Track", String(track)),
          field("Ceremony", T.ceremonyLine(f)),
        ),
        h(
          "div",
          { class: "st-actions" },
          h("button", { class: "st-take", type: "button", on: { click: () => this.take() } }, h("span", { lang: "sv", text: "Ta biljetten" }), " Take your ticket"),
          h("p", { text: "Rate it and mark it watched there." }),
        ),
      ),
      h(
        "div",
        { class: "st-stub", attrs: { "aria-hidden": "true" } },
        h("span", { class: "st-from", text: list.name + " C" }),
        h("span", { class: "st-time", text: time }),
        h("span", { class: "st-track" }, h("small", { lang: "sv", text: "Spår" }), h("b", { text: String(track) })),
        h("span", { class: "st-date", text: date }),
      ),
      h("div", { class: "st-stamp" }, this.stamp(date)),
    ];
  }
  // How long until the train leaves, on the ticket. The film waits for you, so it never "leaves".
  countdown() {
    const el = $("stWhen");
    if (!el || !this.drawn) return;
    const m = T.minutesUntil(this.drawn.time);
    el.replaceChildren(m > 0 ? h("span", {}, h("span", { lang: "sv", text: "om " + m + " min" }), " · in " + m + " min") : h("span", {}, h("span", { lang: "sv", text: "Ombordstigning" }), " · Now boarding"));
  }
  printTicket(row, { animate }) {
    const t = $("stTicket");
    clearTimeout(this.stampTimer);
    t.replaceChildren(...this.ticketParts(row));
    this.countdown();
    $("stTrayEmpty").hidden = true;
    t.hidden = false;
    // Every stamp lands a little differently.
    t.style.setProperty("--stamp-turn", (-14 + (Math.random() * 10 - 5)).toFixed(1) + "deg");
    t.classList.remove("printing", "stamped", "inked");
    if (!animate) return t.classList.add("inked");
    void t.offsetWidth;
    t.classList.add("printing");
    this.audio.printer();
    this.stampTimer = setTimeout(() => {
      if (!this.visible) return this.finishTicket();
      t.classList.add("stamped");
      this.audio.thunk();
    }, 1250);
  }
  hideTicket() {
    clearTimeout(this.stampTimer);
    $("stTicket").hidden = true;
    $("stTicket").replaceChildren();
    $("stTrayEmpty").hidden = false;
  }
  // Leaving mid-print: the ticket is simply there, stamped, when you come back.
  finishTicket() {
    const t = $("stTicket");
    if (t.hidden) return;
    clearTimeout(this.stampTimer);
    t.classList.remove("printing", "stamped");
    t.classList.add("inked");
  }
  /** Over to Tonight, with this ticket open in the envelope. */
  async take() {
    const { store, stage, router } = this.app;
    const f = store.currentFilm;
    await router.show("tonight", { focus: false });
    if (!f || store.p.seen.has(f.id)) return;
    if (!stage.open) await stage.displayCurrent({ animate: true });
    else stage.ticket.focus({ preventScroll: true });
    stage.stageEl.scrollIntoView?.({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
  }

  // ---------------------------------------------------------------- drawing
  // A ticket drawn earlier (on the envelope, or here on another visit) and not printed yet: the station
  // prints that one first, as the envelope reveals it, rather than drawing over it.
  pending() {
    const { stage, store } = this.app;
    return stage.saved() && this.drawn?.film.id !== store.p.current;
  }
  setDrawLabel() {
    const pending = this.pending(),
      again = !pending && !!this.drawn;
    $("stDrawMain").textContent = pending ? "Skriv ut biljetten" : again ? "Dra igen" : "Dra kvällens film";
    $("stDrawSub").textContent = pending ? "Print your saved ticket" : again ? "Draw again" : "Draw tonight’s film";
  }
  renderCount() {
    const { store, catalog } = this.app,
      n = this.pool().length;
    $("stCount").textContent = n
      ? plural(n, "film") + " on the timetable" + (this.app.group?.on ? " · none of you has seen them" : "") + (hasActiveFilters(store.settings) ? " · tonight’s filters apply" : "")
      : allWatched(store.p, catalog)
        ? "Every film is watched."
        : "No films match tonight’s filters.";
  }
  async draw() {
    this.audio.unlock();
    if (this.busy || !this.fontsReady || !this.visible) return;
    const { store, stage, catalog, toast } = this.app;
    if (allWatched(store.p, catalog)) return toast.show("Every film is watched. Your final ticket waits on Tonight.");
    let film;
    if (this.pending()) {
      // One from an earlier day: printing it answers "still on for tonight?".
      if (store.p.drawnOn && store.p.drawnOn < defaultWatchDate()) store.keepTicket();
      film = store.currentFilm;
    } else {
      const r = store.draw();
      if (r.reason === "none") return toast.show("No eligible films. Check your skipped ticket or adjust tonight’s filters on Tonight.");
      if (r.reason === "only") return toast.show("This is the only eligible ticket. Broaden the selection for another movie.");
      film = r.film;
      stage.syncPick();
    }
    this.busy = true;
    $("stDraw").setAttribute("aria-disabled", "true");
    const quick = reduceMotion();
    const rest = shuffle(this.pool().filter((f) => f.id !== film.id)).slice(0, this.size - 1),
      times = T.schedule(this.size);
    this.rows = [film, ...rest].map((f, i) => ({ film: f, time: times[i], hl: i === 0 }));
    const row = (this.drawn = this.rows[0]);
    this.hideTicket();
    this.board.blinkUntil = 0;
    this.setTicker(T.UPDATING);
    $("stLive").textContent = "Updating the timetable…";
    this.paint();
    await this.board.whenIdle();
    const here = this.visible && this.drawn === row;
    if (this.drawn === row) {
      // Tonight's train: the lamp blinks, the chime rings, the ticket prints and gets stamped.
      this.board.lamps[0] = 1;
      this.board.blinkUntil = here && !quick ? performance.now() + 2400 : 0;
      this.board.lampDirty = true;
      this.kick();
      if (here) this.audio.chime();
      this.setTicker(T.drawnTicker(row, catalog));
      if (here && !quick) await wait(500);
      this.printTicket(row, { animate: this.visible && !quick });
      if (this.visible) setTimeout(() => this.visible && this.drawn === row && this.audio.speak(T.announcement(row, catalog)), this.audio.sound && !quick ? 700 : 0);
      $("stLive").textContent = `Tonight's film: ${film.t} (${film.y}). Departs ${T.hhmm(row.time)} from track ${T.track(film, catalog)}. Your ticket is printed below.`;
    }
    this.busy = false;
    $("stDraw").removeAttribute("aria-disabled");
    this.setDrawLabel();
    this.renderCount();
  }
  syncToggles() {
    $("stSound").setAttribute("aria-pressed", String(this.audio.sound));
    $("stVoice").setAttribute("aria-pressed", String(this.audio.voice));
  }
  toggle(k) {
    this.audio.set(k, !this.audio[k]);
    this.syncToggles();
  }

  // ---------------------------------------------------------------- showing and leaving
  show() {
    if (this.app.seagal || this.visible) return;
    this.visible = true;
    const { store } = this.app;
    // Anything watched, put back or drawn on the envelope since the last visit leaves the board.
    if (this.drawn && (this.drawn.film.id !== store.p.current || store.p.seen.has(this.drawn.film.id))) {
      this.drawn = null;
      this.hideTicket();
    }
    const ids = new Set(this.pool().map((f) => f.id));
    this.rows = this.rows.filter((r) => (r.hl && this.drawn) || (ids.has(r.film.id) && r.time.getTime() > Date.now()));
    if (!this.drawn) for (const r of this.rows) r.hl = false;
    this.layoutKey = "";
    this.relayout();
    if (this.fontsReady) {
      if (!this.rows.length) this.rows = this.freshRows();
      else this.topUp();
      this.board.buildAtlas();
      this.clock.buildAtlas();
      this.board.settle();
      this.paint({ instant: true });
      if (this.drawn && this.rows[0]?.hl) this.board.lamps[0] = 1;
      this.clockText = T.hhmm(new Date());
      this.clock.setRow(0, [this.clockText], 0, { instant: true });
      this.countdown();
    }
    if (this.drawn) this.setTicker(T.drawnTicker(this.drawn, this.app.catalog));
    else this.idleTicker();
    this.setDrawLabel();
    this.renderCount();
    clearInterval(this.clockTimer);
    this.clockTimer = setInterval(() => this.tick(), 1000);
    this.kick();
  }
  hide() {
    if (!this.visible) return;
    this.visible = false;
    clearInterval(this.clockTimer);
    this.board.settle();
    this.clock.settle();
    this.board.blinkUntil = 0;
    this.finishTicket();
    this.audio.hush();
  }
  // After any change to progress while the station is up (a sync, an undo).
  render() {
    if (!this.visible || this.busy) return;
    const { store } = this.app;
    if (this.drawn && (this.drawn.film.id !== store.p.current || store.p.seen.has(this.drawn.film.id))) {
      this.visible = false;
      this.show();
      return;
    }
    this.setDrawLabel();
    this.renderCount();
  }
}
