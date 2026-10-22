// The station: a split-flap departure board for the same films, filters and progress as the envelope.
// Draw here and the board flips with tonight's film first, lit in brass; a ticket prints from the slot
// and gets stamped. That ticket is tonight's ticket: "Take your ticket" opens it on Tonight.
// The same board turns over to Ankomster, the arrivals: the films you've watched, latest first, with
// your stars on the flaps. A mode of Tonight rather than a tab. Galan's station is Union Station, Los
// Angeles, and SEAGAL's is Dark Territory, a rail depot: the same engine, with each station's own sign,
// words, clock and sounds (js/station/stations.js).
import { $, h, s, reduceMotion, wait } from "../ui/dom.js";
import { HORSE_BODY } from "../ui/horse.js";
import { allWatched, plural } from "../state/stats.js";
import { hasActiveFilters } from "../state/draw.js";
import { defaultWatchDate, dayLong } from "../state/dates.js";
import { t, LOCALE, decimal, swedish } from "../i18n/index.js";
import { titleParts } from "../i18n/titles.js";
import { Flaps } from "../station/flaps.js";
import { StationAudio } from "../station/audio.js";
import * as T from "../station/timetable.js";
import { stationFor, sign, KUVERT_C } from "../station/stations.js";
import { GALA_LIST_ID } from "../fun/gala.js";

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const today = () => new Date().toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });

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
    this.kind = "dep";
    this.st = stationFor({ seagal: app.seagal, gala: app.list?.id === GALA_LIST_ID });
    document.documentElement.dataset.station = this.st.id;
    if (this.st !== KUVERT_C) this.paintSigns();
    this.audio = new StationAudio(app.storage, this.st);
    this.board = new Flaps($("stFlaps"), {
      header: true,
      lamp: true,
      terminal: this.st.terminal,
      theme: this.el,
      labels: this.labels("dep"),
    });
    this.clock = new Flaps($("stClock"), { theme: this.el, terminal: this.st.terminal });
    this.frame = this.frame.bind(this);

    $("stDraw").addEventListener("click", () => this.draw());
    $("stDep").addEventListener("click", () => this.setBoard("dep"));
    $("stArr").addEventListener("click", () => this.setBoard("arr"));
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
      ? Promise.all([
          document.fonts.load('600 32px "Geist"', "AÅÄÖ09½"),
          document.fonts.load('400 32px "Geist"', "Time"),
          document.fonts.load('500 16px "Geist Mono"', "KU0"),
          document.fonts.load('400 32px "Noto Sans Symbols 2"', "★"),
        ])
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

  // ---------------------------------------------------------------- the station's own signs
  /** Union Station and the depot hang their own signs over Kuvert C's (the markup in index.html). */
  paintSigns() {
    const st = this.st,
      say = (words) => sign(st, words),
      icon = (el) => el.querySelector("svg");
    $("stationTitle").replaceChildren(h("span", { class: "st-place", text: st.name }), h("small", { lang: st.local, text: st.place }));
    this.el.querySelector(".st-tagline").textContent = st.tagline();
    for (const [id, kind] of [["stDep", "dep"], ["stArr", "arr"]]) {
      const [main, sub] = say(st.boards[kind].name);
      $(id).replaceChildren(h("b", { lang: st.local, text: main }), " ", h("span", { text: sub }));
    }
    for (const [id, words] of [["leaveStation", st.leave], ["toStation", st.toStation]]) {
      const [main, sub] = say(words);
      $(id).replaceChildren(icon($(id)), h("span", { lang: st.local, text: main }), sub ? " " + sub : "");
    }
    const clock = this.el.querySelector(".st-clockwrap span");
    clock.textContent = st.clock;
    clock.lang = st.local;
    $("stBoardSv").lang = st.local;
    $("stTrayEmpty").textContent = st.tray();
    // The depot's key hints (Union Station's are Kuvert C's own).
    if (st.id === "depot") {
      const [enter, esc] = this.el.querySelectorAll(".keys > span");
      enter.replaceChildren(h("kbd", { text: "Enter" }), " deploy");
      esc.replaceChildren(h("kbd", { text: "Esc" }), " " + st.leave.en.toLowerCase());
    }
    if (st.horse) {
      $("stationHorse").title = st.horse.title;
      $("stationHorse").querySelector(".sr-only").textContent = st.horse.label;
    }
  }
  /** A board's column labels: the station's words, and the visitor's under them where they differ. */
  labels(kind) {
    return Object.fromEntries(Object.entries(this.st.boards[kind].labels).map(([k, words]) => [k, sign(this.st, words)]));
  }

  // ---------------------------------------------------------------- the timetable
  pool() {
    return this.app.store.units().map((u) => u.film);
  }
  get size() {
    return this.board.rows.length || 8;
  }
  // The trains around tonight's: never the saved ticket's film, which is only named once it's printed.
  others() {
    const current = this.app.store.p.current;
    return this.pool().filter((f) => f.id !== current);
  }
  freshRows() {
    const films = shuffle(this.others()),
      times = T.schedule(this.size);
    return films.slice(0, this.size).map((film, i) => ({ film, time: times[i], hl: false }));
  }
  // Trains join at the bottom, 5 to 25 minutes after the last one.
  topUp() {
    const on = new Set(this.rows.map((r) => r.film.id)),
      films = shuffle(this.others().filter((f) => !on.has(f.id)));
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
    if (this.kind === "dep") this.paint();
  }
  boardMessage() {
    if (this.rows.length) return "";
    return allWatched(this.app.store.p, this.app.catalog) ? this.st.empty.done : this.st.empty.none;
  }
  paint({ instant = false, base = 0 } = {}) {
    if (!this.layout) return;
    const { catalog, store } = this.app,
      st = this.st,
      groups = this.layout.groups,
      quick = instant || reduceMotion(),
      arr = this.kind === "arr";
    // Departures: the timetable. Arrivals: the latest films you've watched, tonight's lit in brass.
    const rows = arr ? T.arrivals(store.p, catalog, this.size, defaultWatchDate()) : this.rows;
    const message = arr ? (rows.length ? "" : st.empty.arrivals) : this.boardMessage();
    for (let r = 0; r < this.board.rows.length; r++) {
      const row = rows[r],
        lit = arr ? row?.tonight : row?.hl;
      const strs = row ? (arr ? T.arrivalStrings(row, groups, { months: st.months }) : T.rowStrings(row, groups, catalog, { time: st.time, rem: st.rem })) : groups.map(([k, n]) => (r === 0 && k === "title" ? message.slice(0, n) : ""));
      this.board.setRow(r, strs, lit ? 1 : 0, { delay: base + r * 90, instant: quick });
      this.board.lamps[r] = lit && !this.busy ? 1 : 0;
    }
    this.board.lampDirty = true;
    // The same board for screen readers, as a table.
    const cells = arr
      ? (row) => [row.date ? dayLong(row.date) : "", row.film.t, row.film.y, row.rating ? t(row.rating === 1 ? "1 star" : "{n} stars", { n: decimal(row.rating) }) : t("Not rated")]
      : (row) => [st.time(row.time), row.film.t, row.film.y, T.track(row.film, catalog), st.remText(row)];
    const name = st.boards[this.kind].name;
    $("stCaption").textContent = name[swedish ? "sv" : "en"] ?? name.en;
    $("stHead").replaceChildren(...(st.heads?.[this.kind] ?? (arr ? ["Date", "Film", "Year", "Stars"] : ["Time", "Film", "Year", "Track", "Remarks"]).map((c) => t(c))).map((c) => h("th", { scope: "col", text: c })));
    $("stRows").replaceChildren(...rows.map((row) => h("tr", {}, cells(row).map((v) => h("td", { text: String(v) })))));
    this.kick();
  }
  /** Turns the board over to the departures or the arrivals. */
  setBoard(kind, { animate = true } = {}) {
    if (kind === this.kind || this.busy) return;
    this.kind = kind;
    this.syncBoard();
    this.layoutKey = "";
    this.relayout({ animate });
    this.setTicker(this.tickerFor());
    $("stLive").textContent = this.st.live[kind]();
  }
  syncBoard() {
    const [main, sub] = sign(this.st, this.st.boards[this.kind].name);
    $("stBoardSv").textContent = main;
    $("stBoardEn").textContent = sub;
    $("stDep").setAttribute("aria-pressed", String(this.kind === "dep"));
    $("stArr").setAttribute("aria-pressed", String(this.kind === "arr"));
    this.board.opts.labels = this.labels(this.kind);
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
  relayout({ animate = false } = {}) {
    const width = $("stFlapwrap").clientWidth;
    if (!width) return;
    const L = this.kind === "arr" ? T.chooseArrivals(width) : T.chooseLayout(width);
    const key = [L.groups.map((g) => g.join(":")).join(","), L.cw, L.rows, window.devicePixelRatio].join("|");
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    this.layout = L;
    this.board.configure({ groups: L.groups, nRows: L.rows, cw: L.cw });
    this.clock.configure({ groups: [["clock", 5]], nRows: 1, cw: Math.max(13, Math.min(21, L.cw * 0.9)) });
    if (this.rows.length > L.rows) this.rows = this.rows.slice(0, L.rows);
    else if (this.rows.length < L.rows && !this.busy) this.topUp();
    if (this.fontsReady) {
      this.paint({ instant: !animate });
      this.clock.setRow(0, [this.clockText], 0, { instant: true });
    }
    this.kick();
  }
  tick() {
    if (!this.fontsReady || !this.visible) return;
    const now = new Date(),
      text = this.st.time(now);
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
  /** What the ticker says for the board that's showing. */
  tickerFor() {
    const { store, catalog, list } = this.app;
    if (this.kind === "arr") return this.st.arrivalsTicker(T.arrivals(store.p, catalog, 1, defaultWatchDate()), store.p.seen.size);
    if (this.drawn) return this.st.drawnTicker(this.drawn, catalog);
    return this.st.idleTicker({ listName: list.name, count: this.pool().length, saved: this.pending(), allWatched: allWatched(store.p, catalog) });
  }

  // ---------------------------------------------------------------- the ticket
  stamp(date) {
    const tk = this.st.ticket;
    return s(
      "svg",
      { viewBox: "0 0 120 120", "aria-hidden": "true" },
      s("defs", {}, s("path", { id: "stStampRing", d: "M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" })),
      s("circle", { cx: 60, cy: 60, r: 56, fill: "none", stroke: "currentColor", "stroke-width": 3 }),
      s("circle", { cx: 60, cy: 60, r: 35, fill: "none", stroke: "currentColor", "stroke-width": 1.5 }),
      s("text", { class: "st-stamp-ring", fill: "currentColor" }, s("textPath", { href: "#stStampRing" }, tk.stamp(date.toUpperCase()))),
      // The dala horse in the middle, or at the depot a crosshair.
      tk.reticle
        ? s("g", { fill: "none", stroke: "currentColor", "stroke-width": 3 }, s("circle", { cx: 60, cy: 60, r: 16 }), s("path", { d: "M60 32v18M60 70v18M32 60h18M70 60h18" }))
        : s("g", { transform: "translate(35 38) scale(.5)" }, s("path", { d: HORSE_BODY, fill: "currentColor" })),
    );
  }
  ticketParts(row) {
    const { catalog, list } = this.app,
      st = this.st,
      tk = st.ticket,
      f = row.film,
      time = st.time(row.time),
      track = T.track(f, catalog),
      date = today(),
      shelf = catalog.shelfOf(f);
    const sub = f.y + (shelf ? " · " + t(shelf.label) : "") + (f.tri ? " · " + t("{series}, part {n}", { series: catalog.series[f.tri], n: f.ord }) : "");
    const field = ([label, value, when]) => h("div", {}, h("dt", { text: label }), h("dd", {}, String(value), when ? h("small", { class: "st-when", id: "stWhen" }) : null));
    const [take, takeSub] = sign(st, tk.take);
    return [
      h(
        "div",
        { class: "st-main" },
        h("div", { class: "st-thead" }, h("span", { lang: st.local, text: tk.head(list) }), h("span", { text: tk.number(catalog.ticketNumber(f), catalog.films.length) })),
        h("p", { class: "st-chip", lang: st.local, text: st.chip(f, catalog) }),
        h("h3", { class: "st-ttitle" }, ...titleParts(f)),
        h("p", { class: "st-sub", text: sub }),
        h("dl", { class: "st-fields" }, ...tk.fields({ film: f, time, track }).map(field)),
        h(
          "div",
          { class: "st-actions" },
          h("button", { class: "st-take", type: "button", on: { click: () => this.take() } }, h("span", { lang: st.local, text: take }), takeSub ? " " + takeSub : ""),
          h("p", { text: tk.note() }),
        ),
      ),
      h(
        "div",
        { class: "st-stub", attrs: { "aria-hidden": "true" } },
        h("span", { class: "st-from", text: tk.from(list) }),
        h("span", { class: "st-time", text: time }),
        h("span", { class: "st-track" }, h("small", { lang: st.local, text: tk.trackLabel }), h("b", { text: String(track) })),
        h("span", { class: "st-date", text: date }),
      ),
      h("div", { class: "st-stamp" }, this.stamp(date)),
    ];
  }
  // How long until the train leaves, on the ticket. The film waits for you, so it never "leaves".
  countdown() {
    const el = $("stWhen");
    if (!el || !this.drawn) return;
    const m = T.minutesUntil(this.drawn.time),
      [main, sub] = sign(this.st, m > 0 ? this.st.ticket.soon(m) : this.st.ticket.boarding);
    el.replaceChildren(h("span", {}, h("span", { lang: this.st.local, text: main }), sub ? " · " + sub : ""));
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
    // The station's words, and the visitor's under them where they differ (or a note, at the depot).
    const [main, sub] = sign(this.st, this.st.draw[pending ? "pending" : again ? "again" : "fresh"]);
    $("stDrawMain").textContent = main;
    $("stDrawMain").lang = this.st.local;
    $("stDrawSub").textContent = sub;
  }
  renderCount() {
    const { store, catalog } = this.app,
      n = this.pool().length,
      own = this.st.counts; // the depot counts targets
    $("stCount").textContent = n
      ? (own ? own.some(n) : t("{films} on the timetable", { films: plural(n, "film") })) + (this.app.group?.on ? t(" · none of you has seen them") : "") + (hasActiveFilters(store.settings) ? t(" · tonight’s filters apply") : "")
      : own ? own[allWatched(store.p, catalog) ? "done" : "none"] : t(allWatched(store.p, catalog) ? "Every film is watched." : "No films match tonight’s filters.");
  }
  async draw() {
    this.audio.unlock();
    if (this.busy || !this.fontsReady || !this.visible) return;
    const { store, stage, catalog, toast } = this.app;
    if (allWatched(store.p, catalog)) return toast.show(t("Every film is watched. Your final ticket waits on Tonight."));
    let film;
    if (this.pending()) {
      // One from an earlier day: printing it answers "still on for tonight?".
      if (store.p.drawnOn && store.p.drawnOn < defaultWatchDate()) store.keepTicket();
      film = store.currentFilm;
    } else {
      const r = store.draw();
      if (r.reason === "none") return toast.show(t("No eligible films. Check your skipped ticket or adjust tonight’s filters on Tonight."));
      if (r.reason === "only") return toast.show(t("This is the only eligible ticket. Broaden the selection for another movie."));
      film = r.film;
      stage.syncPick();
    }
    // Drawing happens on the departures board.
    if (this.kind !== "dep") {
      this.kind = "dep";
      this.syncBoard();
      this.layoutKey = "";
      this.relayout();
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
    this.setTicker(this.st.updating());
    $("stLive").textContent = this.st.live.updating();
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
      this.setTicker(this.st.drawnTicker(row, catalog));
      if (here && !quick) await wait(500);
      this.printTicket(row, { animate: this.visible && !quick });
      if (this.visible) setTimeout(() => this.visible && this.drawn === row && this.audio.speak(this.st.announcement(row, catalog)), this.audio.sound && !quick ? 700 : 0);
      $("stLive").textContent = this.st.live.drawn({ title: film.t, year: film.y, time: this.st.time(row.time), track: T.track(film, catalog) });
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
    if (this.visible) return;
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
      this.clockText = this.st.time(new Date());
      this.clock.setRow(0, [this.clockText], 0, { instant: true });
      this.countdown();
    }
    this.syncBoard();
    this.setTicker(this.tickerFor());
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
    if (this.kind === "arr") this.paint();
    this.setDrawLabel();
    this.renderCount();
  }
}
