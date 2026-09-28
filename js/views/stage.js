// Tonight's stage: the envelope, the year dial and the ticket.
//
// A draw is choreographed: the seal cracks, the year dial rolls to the film's year, the flap lifts and
// the ticket rises out of the envelope, which settles under it as a pocket. Tap anywhere to skip ahead.
// The same ticket turns into your stub when you mark the film watched: SEDD is stamped on, and you rate it.
import { $, h, reduceMotion, setText } from "../ui/dom.js";
import { StarSlider } from "../ui/stars.js";
import { Nixie } from "./nixie.js";
import { imageUrl, fmtMoney } from "../tmdb/client.js";
import { starText, ratingWord, allWatched, finaleData, plural } from "../state/stats.js";
import { fmtDay, dayLong, dateFull, defaultWatchDate } from "../state/dates.js";

const VERDICTS = [
  ["yes", "Yes"],
  ["unsure", "Unsure"],
  ["no", "No"],
];

export class Stage {
  constructor(app) {
    this.app = app;
    this.mode = "tonight"; // "tonight": a drawn film; "watched": a stub
    this.shown = null; // the film on the ticket
    this.fresh = false; // the stub was stamped just now
    this.finale = false;
    this.busy = false;
    this.skipping = false;
    this.infoReq = 0;
    this.infoController = null;
    this.stageEl = $("stage");
    this.ticket = $("ticket");
    this.nixie = new Nixie($("nixie"), $("nixieTubes"), { onTick: (last) => app.play(last ? "settle" : "tick") });
    this.stars = new StarSlider($("ticketStars"), { label: "Your rating", onChange: (v) => this.shown && this.rate(this.shown.id, v) });
    this.wire();
  }

  get store() {
    return this.app.store;
  }
  get open() {
    return this.stageEl.dataset.state === "open";
  }
  sg(a, b) {
    return this.app.sg(a, b);
  }

  wire() {
    const on = (id, fn) => $(id).addEventListener("click", fn);
    on("drawBtn", () => this.drawOrFinale());
    on("envelopeOpen", () => this.drawOrFinale());
    on("ticketClose", () => this.close());
    on("againBtn", () => this.draw());
    on("markBtn", () => this.markWatched());
    on("skipBtn", () => this.app.seagalSkip?.() ?? this.skip());
    on("shareBtn", () => this.shown && this.app.share.ticket(this.shown));
    on("wpShare", () => this.shown && this.app.share.ticket(this.shown));
    on("wpDone", () => this.finishWatched());
    on("wpClear", () => this.shown && this.rate(this.shown.id, null));
    on("wpDate", () => this.shown && this.app.dialogs.editDate(this.shown.id));
    on("wpNoteBtn", () => this.shown && this.app.dialogs.editReview(this.shown.id));
    on("shelfBtn", () => this.shown && this.app.toggleShelf(this.shown.id));
    on("retryInfo", () => this.showInfo(this.shown));
    on("changeMatch", () => this.changeMatch());
    on("editMoods", () => this.shown && this.app.dialogs.editMoods(this.shown.id));
    on("finaleStats", () => this.app.router.show("stats"));
    on("finaleClose", () => this.close());
    on("poster", () => this.app.dialogs.lightbox($("poster")));
    on("backdropBtn", () => this.app.dialogs.lightbox($("backdrop")));
    $("wpShould").addEventListener("change", (e) => this.shown && this.store.setSnub(this.shown.id, e.target.value));
    // Tap anywhere on the stage (or press a key) to skip the rest of a draw's animation.
    this.stageEl.addEventListener("pointerdown", () => this.busy && this.skipAhead(), true);
    // One-shot animations come off once played, so showing the ticket again doesn't replay them.
    for (const type of ["animationend", "animationcancel"]) {
      $("goldSeal").addEventListener(type, () => $("goldSeal").classList.remove("landing"));
      $("milestoneInk").addEventListener(type, () => $("milestoneInk").classList.remove("landing"));
    }
  }

  // ---------------------------------------------------------------- opening and closing
  skipAhead() {
    this.skipping = true;
    this.nixie.skip();
    this.skipWake?.();
  }
  // A pause that a tap on the stage cuts short.
  pause(ms) {
    if (this.skipping || reduceMotion()) return Promise.resolve();
    return new Promise((r) => {
      const t = setTimeout(r, ms);
      this.skipWake = () => {
        clearTimeout(t);
        r();
      };
    });
  }
  // Resolves once nothing is animating on the stage (or after a few seconds, whatever happened).
  idle() {
    const end = performance.now() + 4000;
    return new Promise((resolve) => {
      const check = () => (!this.busy || performance.now() > end ? resolve() : requestAnimationFrame(check));
      check();
    });
  }
  // Resolves once a smooth scroll has arrived at `top`, or after a moment whatever happened.
  arrived(top) {
    const end = performance.now() + 800;
    return new Promise((resolve) => {
      const check = () => (Math.abs(scrollY - top) < 2 || performance.now() > end ? resolve() : requestAnimationFrame(check));
      check();
    });
  }
  setOpen(open) {
    this.stageEl.dataset.state = open ? "open" : "closed";
    this.ticket.hidden = !open;
    $("drawBtn").setAttribute("aria-expanded", String(open));
    // Now, not on the next frame: the envelope's animations measure the finished layout right after
    // this, and anything that changed later (a line on the ticket, the draw bar) would make it jump.
    this.app.render();
  }
  /**
   * Resizes the envelope from the box it had (`before`) to the one it has now, smoothly. Its height
   * animates with a matching bottom margin, so the room it takes in the page never changes and the
   * ticket under it stays put; it stays centred as its width changes, so it never slides sideways.
   */
  resizeEnvelope(before, { duration, easing }) {
    const env = $("envelope"),
      after = env.getBoundingClientRect(),
      margin = parseFloat(getComputedStyle(env).marginBottom) || 0;
    return env.animate(
      [
        { width: before.width + "px", height: before.height + "px", marginBottom: margin + after.height - before.height + "px", transform: `translateY(${before.top - after.top}px)` },
        { width: after.width + "px", height: after.height + "px", marginBottom: margin + "px", transform: "none" },
      ],
      { duration, easing },
    );
  }
  // Where everything under the stage is, so it can glide when the stage changes size (see glideBelow).
  below() {
    const out = [];
    for (let n = this.stageEl.nextElementSibling; n; n = n.nextElementSibling) out.push([n, n.offsetParent ? n.getBoundingClientRect().top : null]);
    return out;
  }
  // Glides it there; anything that has just appeared fades in once the rest has arrived.
  glideBelow(before, { duration, easing }) {
    for (const [n, top] of before) {
      if (!n.offsetParent) continue;
      if (top === null) n.animate([{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], { duration: duration + 200 });
      else {
        const dy = top - n.getBoundingClientRect().top;
        if (Math.abs(dy) > 0.5) n.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration, easing });
      }
    }
  }
  /**
   * The ticket slides out from under the envelope's lower edge, as if pulled out of it. `from` is the
   * envelope's box when it starts; it may be resizing at the same time, with the same timing, and the
   * ticket is cut off exactly at its edge on every frame, so none of it ever shows above or on it.
   */
  slideOut(from, { duration, easing, scale = 1 }) {
    const t = this.ticket.getBoundingClientRect(),
      to = $("envelope").getBoundingClientRect(),
      start = from.bottom - t.height * scale; // all of it still inside
    const frames = [];
    // The edge and the ticket move in step but the cut isn't linear in them, so it's set every twelfth.
    for (let i = 0; i <= 12; i++) {
      const p = i / 12,
        edge = from.bottom + (to.bottom - from.bottom) * p,
        s = scale + (1 - scale) * p,
        top = start + (t.top - start) * p;
      frames.push({ offset: p, transformOrigin: "50% 0", transform: `translateY(${top - t.top}px) scale(${s})`, clipPath: `inset(${Math.max(0, (edge - top) / s)}px -80px -100px)` });
    }
    return this.ticket.animate(frames, { duration, easing });
  }
  // The ticket slides back up under the envelope's lower edge until none of it shows, and stays there.
  tuck({ duration, easing }) {
    const t = this.ticket.getBoundingClientRect(),
      edge = $("envelope").getBoundingClientRect().bottom,
      dy = edge - t.height - t.top;
    return this.ticket.animate(
      [
        { transform: "none", clipPath: `inset(${Math.max(0, edge - t.top)}px -80px -100px)` },
        { transform: `translateY(${dy}px)`, clipPath: `inset(${t.height}px -80px -100px)` },
      ],
      { duration, easing, fill: "forwards" },
    );
  }

  /**
   * Opens the envelope on the ticket as it's painted now.
   * roll: the year to roll the dial to (a real draw); animate: false for an instant change.
   */
  async openStage({ animate = true, roll = null, year = null }) {
    const quick = !animate || reduceMotion();
    if (this.open) {
      this.nixie.show(year ?? roll ?? this.nixie.value);
      return;
    }
    if (quick) {
      this.nixie.show(year ?? roll);
      this.setOpen(true);
      return;
    }
    this.busy = true;
    this.skipping = false;
    $("drawBtn").classList.add("busy");
    try {
      this.app.play("crack");
      this.crackSeal();
      if (roll) await this.nixie.roll(roll);
      else {
        this.nixie.show(year);
        await this.pause(260);
      }
      this.stageEl.classList.add("flap-open");
      this.app.play("tear");
      await this.pause(360);
      await this.rise();
    } finally {
      this.stageEl.classList.remove("flap-open", "cracked");
      $("drawBtn").classList.remove("busy");
      this.busy = false;
      this.skipping = false;
    }
  }
  // The envelope settles into a band while the ticket is pulled out from under it (FLIP).
  async rise() {
    const env = $("envelope"),
      before = env.getBoundingClientRect(),
      below = this.below();
    this.setOpen(true);
    // Measured in the same frame as the change, so the finished layout is never painted first.
    const t = this.ticket.getBoundingClientRect();
    // A longer ticket has further to come, so it takes a little longer.
    const travel = t.bottom - before.bottom,
      timing = { duration: this.skipping ? 1 : Math.round(Math.min(1250, 700 + travel * 0.45)), easing: "cubic-bezier(0.5, 0, 0.15, 1)" };
    const ticket = this.slideOut(before, { ...timing, scale: Math.min(1, (before.width * 0.92) / t.width) });
    const envelope = this.resizeEnvelope(before, timing);
    this.glideBelow(below, timing);
    await Promise.allSettled([ticket.finished, envelope.finished]);
  }
  /**
   * Draw again with the ticket out: it slips back into the envelope, the dial rolls, and the next film
   * comes out. `paint` puts the new film on the ticket, while it's out of sight.
   */
  async swap(year, paint) {
    this.busy = true;
    this.skipping = false;
    $("drawBtn").classList.add("busy");
    try {
      const rolled = this.nixie.roll(year, { duration: 1000 });
      const tuck = this.tuck({ duration: 340, easing: "cubic-bezier(0.55, 0, 0.9, 0.4)" });
      await tuck.finished.catch(() => {});
      await this.pause(120);
      const env = $("envelope").getBoundingClientRect(),
        below = this.below();
      paint();
      // Painted and started in one go: the new ticket is never seen before it slides out.
      tuck.cancel();
      const timing = { duration: this.skipping ? 1 : 620, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)" };
      const out = this.slideOut(env, timing);
      this.glideBelow(below, timing);
      await Promise.allSettled([rolled, out.finished]);
    } finally {
      $("drawBtn").classList.remove("busy");
      this.busy = false;
      this.skipping = false;
    }
  }
  crackSeal() {
    const seal = $("seal"),
      r = seal.getBoundingClientRect();
    if (!r.width) return;
    for (const side of [-1, 1]) {
      const half = seal.cloneNode(true);
      half.removeAttribute("id");
      half.classList.add("seal-half");
      Object.assign(half.style, {
        left: r.left + "px",
        top: r.top + "px",
        width: r.width + "px",
        height: r.height + "px",
        transform: "none",
        clipPath: side < 0 ? "polygon(0 0, 55% 0, 42% 40%, 58% 62%, 45% 100%, 0 100%)" : "polygon(55% 0, 100% 0, 100% 100%, 45% 100%, 58% 62%, 42% 40%)",
      });
      document.body.append(half);
      half
        .animate(
          [
            { transform: "none", opacity: 1 },
            { transform: `translate(${side * 14}px, -6px) rotate(${side * 12}deg)`, opacity: 1, offset: 0.25 },
            { transform: `translate(${side * 60}px, 110px) rotate(${side * 70}deg)`, opacity: 0 },
          ],
          { duration: 820, easing: "cubic-bezier(0.4, 0, 0.8, 0.4)" },
        )
        .finished.finally(() => half.remove());
    }
    // The halves fly off from where the seal was; the seal itself is gone until the envelope closes.
    this.stageEl.classList.add("cracked");
    // A few crumbs of wax.
    for (let i = 0; i < 7; i++) {
      const crumb = h("i", { class: "seal-half" });
      const size = 3 + Math.random() * 4;
      Object.assign(crumb.style, { left: r.left + r.width / 2 + "px", top: r.top + r.height / 2 + "px", width: size + "px", height: size + "px", borderRadius: "40%", background: "var(--velvet)" });
      document.body.append(crumb);
      const a = Math.random() * Math.PI * 2,
        d = 30 + Math.random() * 50;
      crumb
        .animate([{ transform: "none" }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 60}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }], {
          duration: 700 + Math.random() * 300,
          easing: "cubic-bezier(0.3, 0.2, 0.7, 1)",
        })
        .finished.finally(() => crumb.remove());
    }
  }
  /** Closes the envelope: the ticket slips back in, the envelope fills out, the flap comes down and the seal is pressed. */
  async close({ focus = true } = {}) {
    // Mid-draw? Finish it at once, then close.
    if (this.busy) {
      this.skipAhead();
      await this.idle();
    }
    const wasOpen = this.open,
      animate = wasOpen && !reduceMotion();
    let tucked = null;
    if (wasOpen) this.app.play("close");
    if (animate) {
      this.busy = true;
      // Scrolled down to the ticket's buttons? Glide back up to the envelope while the ticket goes in,
      // so the page getting shorter never snaps the scroll position.
      const top = Math.max(0, this.stageEl.getBoundingClientRect().top + scrollY - 88),
        scrolling = scrollY > top + 2;
      if (scrolling) window.scrollTo({ top, behavior: "smooth" });
      tucked = this.tuck({ duration: 380, easing: "cubic-bezier(0.55, 0, 0.9, 0.4)" });
      await Promise.all([tucked.finished.catch(() => {}), scrolling && this.arrived(top)]);
      this.busy = false;
    }
    this.clearStamp();
    this.clearInk();
    this.fresh = false;
    this.setMode("tonight");
    this.shown = null;
    this.finale = false;
    this.ticket.classList.remove("finale-ticket");
    $("finale").hidden = true;
    if (animate) {
      const before = $("envelope").getBoundingClientRect(),
        below = this.below(),
        timing = { duration: 520, easing: "cubic-bezier(0.3, 0.7, 0.2, 1)" };
      this.setOpen(false);
      tucked.cancel();
      // The flap folds down as the envelope fills out (a transition in css/tonight.css), then the seal.
      this.resizeEnvelope(before, timing);
      this.glideBelow(below, timing);
      $("seal").animate([{ transform: "translate(-50%, 0) scale(1.5)", opacity: 0 }, { transform: "translate(-50%, 0) scale(0.92)", opacity: 1, offset: 0.7 }, { transform: "translate(-50%, 0)" }], {
        duration: 360,
        delay: 380,
        easing: "cubic-bezier(0.3, 1.4, 0.6, 1)",
        fill: "backwards",
      });
    } else this.setOpen(false);
    this.showInfo(null);
    // Sealed again: the dial goes dark rather than giving away the year.
    this.nixie.show(null);
    this.app.renderSoon();
    if (focus) $("drawBtn").focus({ preventScroll: true });
    this.app.announce("Envelope closed.");
  }

  // ---------------------------------------------------------------- tonight's ticket
  paintHead(f) {
    const { catalog } = this.app;
    this.shown = f;
    $("ticketNumber").textContent = catalog.ticketNumber(f) + " / " + catalog.films.length;
    $("stubNo").textContent = "Nr " + catalog.ticketNumber(f);
    $("pickTitle").textContent = f.t;
    $("pickMeta").textContent = f.y + (catalog.shelfOf(f) ? " · " + catalog.shelfOf(f).label : "");
    const line = catalog.oscarLine(f);
    setText("oscarLine", this.app.seagal ? line.replace(/^Lost to /, "Outgunned by ").replace(/^Beat /, "Took out ") : line);
    this.ticket.classList.toggle("win", catalog.isWinner(f));
    this.paintShelf();
    this.app.seagalTicket?.(f);
  }
  eyebrowFor(f) {
    const { catalog } = this.app;
    if (f.tri && f.ord > 1) return [this.sg("Nästa del", "Next operation"), "Next part"];
    if (catalog.isWinner(f)) return [this.sg("Kvällens vinnare", "High-value target"), "Tonight's winner"];
    return [this.sg("Kvällens film", "Tonight's target"), "Tonight's film"];
  }
  /** Shows tonight's film. roll: roll the year dial (a real draw). */
  async displayCurrent({ animate = true, roll = false } = {}) {
    const f = this.store.currentFilm;
    if (!f) return;
    const paint = () => {
      this.clearStamp();
      this.clearFinale();
      this.clearInk();
      this.fresh = false;
      this.setMode("tonight");
      this.paintHead(f);
      const [eyebrow, title] = this.eyebrowFor(f);
      $("pickEyebrow").textContent = f.kind === "album" && this.app.seagal ? "Special assignment" : eyebrow;
      $("pickEyebrow").title = title;
      const parts = f.tri ? this.app.catalog.seriesParts(f.tri).length : 0;
      setText("pickNote", f.tri ? this.app.catalog.series[f.tri] + " counts as one ticket and plays in order. Part " + f.ord + " of " + parts + "." : "");
      $("moreDetails").open = false;
      this.showInfo(f);
    };
    this.app.announce("Tonight’s film: " + f.t + ", " + f.y);
    // Drawing again with the ticket out: the old ticket goes back in before the new film is painted.
    if (animate && roll && this.open && !reduceMotion()) await this.swap(f.y, paint);
    else {
      paint();
      await this.openStage({ animate, roll: roll ? f.y : null, year: f.y });
    }
    if (animate) this.ticket.focus({ preventScroll: true });
    this.app.renderSoon();
  }
  drawOrFinale() {
    if (this.busy) return this.skipAhead();
    if (allWatched(this.store.p, this.app.catalog)) return this.displayFinale();
    // A saved ticket is still in the envelope: opening it reveals that film, not a new one.
    if (!this.open && this.saved()) {
      // One from an earlier day: opening it answers "still on for tonight?".
      const { drawnOn } = this.store.p;
      if (drawnOn && drawnOn < defaultWatchDate()) this.store.keepTicket();
      return this.resume();
    }
    this.draw();
  }
  // Tonight's film, drawn earlier and not watched yet.
  saved() {
    const f = this.store.currentFilm;
    return !!f && !this.store.p.seen.has(f.id);
  }
  draw() {
    if (this.busy) return;
    this.app.router.show("tonight", { focus: false });
    const r = this.store.draw();
    if (r.reason === "none") {
      if (allWatched(this.store.p, this.app.catalog)) this.displayFinale();
      else this.app.toast.show("No eligible films. Check your skipped ticket, adjust tonight’s filters, or check missing movie details.");
      return;
    }
    if (r.reason === "only") {
      this.app.toast.show("This is the only eligible ticket. Broaden the selection for another movie.");
      return;
    }
    this.app.horse.nod();
    this.app.seagalDeploy?.();
    this.displayCurrent({ animate: true, roll: true });
  }
  /** Opens a film from anywhere: a watched film shows its stub, anything else goes on tonight's ticket. */
  openFilm(id) {
    const f = this.app.catalog.byId.get(id);
    if (!f) return;
    this.app.router.show("tonight", { focus: false });
    if (this.store.p.seen.has(id)) this.showWatched(f);
    else {
      this.store.pick(id);
      this.displayCurrent({ animate: !this.open });
    }
    this.stageEl.scrollIntoView?.({ behavior: "auto", block: "start" });
  }
  resume() {
    const f = this.store.currentFilm;
    if (!f || this.store.p.seen.has(f.id)) return;
    this.app.router.show("tonight", { focus: false });
    // The reveal: the seal breaks and the dial rolls to the year, as for a new draw.
    this.displayCurrent({ animate: true, roll: !this.open });
  }
  skip() {
    const r = this.store.skipCurrent();
    if (r.reason === "busy") return this.app.toast.show("Watch your skipped film before skipping another.");
    if (!r.undo) return;
    this.syncPick();
    this.app.toast.show(r.film.t + " moved to Skipped.", r.undo);
    $("drawBtn").focus();
  }
  putBack() {
    const f = this.store.currentFilm;
    const undo = this.store.putBack();
    if (!undo) return;
    this.syncPick();
    this.app.toast.show(f.t + " is back in the envelope.", undo);
    $("drawBtn").focus();
  }
  /** After any change that may move tonight's ticket (undo, restore, sync, a toggle in the Library). */
  syncPick() {
    this.clearStamp();
    this.clearInk();
    this.clearFinale();
    const f = this.store.currentFilm;
    if (f && !this.store.p.seen.has(f.id)) {
      if (this.open) this.displayCurrent({ animate: false });
      else {
        this.nixie.show(null);
        this.app.renderSoon();
      }
    } else {
      this.shown = null;
      this.fresh = false;
      this.setMode("tonight");
      this.showInfo(null);
      this.setOpen(false);
      this.nixie.show(null);
    }
  }

  // ---------------------------------------------------------------- watching
  /** Mark as watched on tonight's ticket: SEDD lands, and the ticket stays open so you can rate it. */
  markWatched() {
    const f = this.store.currentFilm;
    if (!f || this.store.p.seen.has(f.id)) return;
    const holdCard = this.open;
    if (holdCard) {
      this.clearStamp();
      this.infoReq++;
      this.infoController?.abort();
      this.ticket.focus({ preventScroll: true });
    }
    const res = this.store.markSeen(f.id, true);
    if (res.earned.length) this.app.horse.gallop();
    this.app.announce(f.t + " marked watched. How many stars?");
    if (holdCard) {
      this.app.toast.show(this.sg("Sedd! ", "") + f.t + " marked watched." + (res.next ? " Up next: " + res.next.t + "." : ""), res.undo);
      this.showWatched(f, { fresh: true });
      this.showInk(res.earned);
      this.stars.el.focus({ preventScroll: true });
      this.app.toast.keepClear(this.stars.el);
    } else {
      this.syncPick();
      this.watchedNotice(f, res);
      $("drawBtn").focus();
    }
  }
  // The toast after marking a film watched outside its ticket.
  watchedNotice(f, res) {
    const d = this.store.p.dates[f.id];
    this.app.toast.show(
      f.t + " marked watched" + (d ? " for " + fmtDay(d) : "") + "." + (res.next ? " Up next: " + res.next.t + "." : "") + (res.earned.length ? " Milestone: " + res.earned.map((c) => c.title).join(", ") + "." : ""),
      res.undo,
      { action: { label: "Change date", run: () => this.store.p.seen.has(f.id) && this.app.dialogs.editDate(f.id) } },
    );
    if (allWatched(this.store.p, this.app.catalog)) this.displayFinale({ focus: false });
  }
  /** The watched/unwatched tick anywhere in the app. */
  toggleSeen(id) {
    const f = this.app.catalog.byId.get(id);
    const on = !this.store.p.seen.has(id);
    const res = this.store.markSeen(id, on);
    if (res.earned.length) this.app.horse.gallop();
    if (res.wasCurrent || (!on && this.finale)) this.syncPick();
    if (!on && this.shown?.id === id && this.mode === "watched") this.close({ focus: false });
    if (on) this.watchedNotice(f, res);
    else this.app.toast.show(f.t + " marked unwatched.", res.undo);
  }
  setMode(mode) {
    this.mode = mode;
    const watched = mode === "watched";
    this.ticket.classList.toggle("watched", watched);
    $("watchedPanel").hidden = !watched;
    if (watched) ["finishEstimate", "intermission", "pickProv", "pickNote"].forEach((id) => ($(id).hidden = true));
  }
  // Shows a watched film's stub: stamp, stars, date, rank and verdict.
  async showWatched(film, { fresh = false } = {}) {
    this.clearStamp();
    this.clearFinale();
    if (!fresh) this.clearInk();
    this.fresh = fresh;
    this.paintHead(film);
    $("pickEyebrow").textContent = this.sg("Sedd", "Neutralized");
    $("pickEyebrow").title = "Watched";
    const wasOpen = this.open;
    if (!fresh || !wasOpen) this.showInfo(film);
    this.setMode("watched");
    this.renderWatched();
    if (!wasOpen) await this.openStage({ animate: true, year: film.y });
    else this.nixie.show(film.y);
    if (fresh) {
      this.ticket.classList.remove("stamped");
      void this.ticket.offsetWidth;
      this.ticket.classList.add("stamped");
      this.app.play("stamp", 60);
    }
    this.ticket.focus({ preventScroll: true });
    if (!fresh) this.app.announce("Your ticket for " + film.t + ".");
    this.app.renderSoon();
  }
  finishWatched() {
    const wasFresh = this.fresh;
    this.fresh = false;
    this.clearInk();
    this.setMode("tonight");
    if (allWatched(this.store.p, this.app.catalog)) return this.displayFinale();
    const cur = this.store.currentFilm;
    if (wasFresh && cur && !this.store.p.seen.has(cur.id)) return this.displayCurrent({ animate: true });
    this.shown = null;
    this.close();
  }
  rate(id, rating) {
    const was = this.store.rate(id, rating);
    this.renderWatched();
    // Five stars earns a gold seal, pressed on as you give it.
    if (rating === 5 && was !== 5 && !$("goldSeal").hidden) {
      $("goldSeal").classList.remove("landing");
      void $("goldSeal").offsetWidth;
      $("goldSeal").classList.add("landing");
      this.app.play("seal");
    }
    if (rating !== was) this.app.horse.react(rating);
    this.app.announce(rating ? this.app.catalog.byId.get(id).t + ": " + rating + (rating === 1 ? " star" : " stars") + "." : "Rating cleared.");
  }
  renderWatched() {
    const f = this.shown;
    if (!f || this.mode !== "watched") return;
    const { store, catalog } = this.app,
      p = store.p,
      id = f.id,
      r = p.reviews[id]?.rating ?? null;
    $("wpHeading").textContent = this.fresh ? this.sg("Hur var den?", "Threat assessment") : this.sg("Din biljett", "Threat level");
    $("wpHeading").title = this.fresh ? "How was it?" : "Your ticket";
    const lb = !r && p.lbx[id]?.rating ? p.lbx[id].rating : null;
    $("wpSub").replaceChildren(
      this.fresh ? this.sg("How was it? Tap a star, or its left half for a half star.", "Rate the threat.") : this.sg("Change your stars any time.", "Reassess any time."),
      ...(lb ? [" ", h("button", { class: "link", type: "button", text: "Use your Letterboxd " + starText(lb), on: { click: () => this.rate(id, lb) } })] : []),
    );
    this.stars.setValue(r);
    $("wpClear").hidden = r === null;
    const word = this.app.seagal ? null : ratingWord(r);
    $("ratingWord").replaceChildren(...(word ? [h("i", { lang: "sv", text: word[0] }), " " + word[1]] : []));
    $("goldSeal").hidden = this.app.seagal || r !== 5;
    $("wpWhen").textContent = p.dates[id] ? "Watched " + dayLong(p.dates[id]) : "No watch date yet";
    $("wpDate").textContent = p.dates[id] ? "Change date" : "Add the date";
    const rank = p.rankings.filter((x) => p.seen.has(x)),
      at = rank.indexOf(id);
    $("wpRank").hidden = false;
    $("wpRank").replaceChildren(
      at >= 0 ? "#" + (at + 1) + " of " + rank.length + " in your ranking · " : "Not in your ranking yet · ",
      h("button", {
        class: "link",
        type: "button",
        text: at >= 0 ? "See ranking" : "Add to ranking",
        on: {
          click: () => {
            if (at >= 0) {
              this.app.router.show("stats", { focus: false });
              $("rankSection").scrollIntoView({ block: "start" });
            } else {
              const undo = store.placeInRanking(id);
              this.renderWatched();
              this.app.toast.show(f.t + " added to your ranking at #" + (store.p.rankings.indexOf(id) + 1) + ".", undo);
            }
          },
        },
      }),
    );
    const winner = catalog.isWinner(f);
    $("wpVerdict").hidden = !winner;
    if (winner) {
      $("wpVerdictGroup").replaceChildren(
        ...VERDICTS.map(([value, label]) =>
          h("button", {
            class: "verdict-btn v-" + value,
            type: "button",
            text: label,
            attrs: { "aria-pressed": String(p.verdicts[id] === value) },
            dataset: { key: "wpverdict-" + value },
            on: { click: () => this.app.setVerdict(id, value, { quiet: true }) },
          }),
        ),
      );
      this.app.fillShouldHaveWon($("wpShould"), $("wpShouldWrap"), f);
    }
    const note = p.reviews[id]?.note || "";
    $("wpNote").hidden = !note;
    $("wpNote").textContent = note.length > 220 ? note.slice(0, 217) + "…" : note;
    $("wpNoteLabel").textContent = note ? "Edit note" : "Add a note";
    const cur = store.currentFilm;
    const next = this.fresh && cur && cur.id !== id && !p.seen.has(cur.id) ? cur : null;
    $("wpDone").textContent = this.fresh ? (next ? "Next: " + next.t : allWatched(p, catalog) ? "See your final ticket" : "Done") : "Close";
  }
  paintShelf() {
    const f = this.shown,
      b = $("shelfBtn");
    b.hidden = !f;
    if (!f) return;
    const on = this.store.p.shelf.has(f.id);
    b.setAttribute("aria-pressed", String(on));
    $("shelfBtnText").textContent = on ? "On my shelf" : "I own this on disc";
    b.title = on ? "Take it off your shelf" : "Add it to your shelf of discs";
  }
  clearStamp() {
    this.ticket.classList.remove("stamped");
  }
  showInk(cards) {
    if (!cards.length) return;
    $("milestoneInkName").textContent = cards[0].title + (cards.length > 1 ? " +" + (cards.length - 1) : "");
    const ink = $("milestoneInk");
    ink.hidden = false;
    ink.classList.remove("landing");
    void ink.offsetWidth;
    ink.classList.add("landing");
    this.app.play("stamp", 280);
    this.app.announce((cards.length === 1 ? "Milestone earned: " : "Milestones earned: ") + cards.map((c) => c.title).join(", ") + ".");
  }
  clearInk() {
    $("milestoneInk").hidden = true;
    $("milestoneInk").classList.remove("landing");
  }

  // ---------------------------------------------------------------- the last ticket
  clearFinale() {
    this.finale = false;
    this.ticket.classList.remove("finale-ticket");
    $("finale").hidden = true;
    this.ticket.setAttribute("aria-label", "Tonight’s film");
  }
  async displayFinale({ focus = true } = {}) {
    const { store, catalog } = this.app;
    if (!allWatched(store.p, catalog)) return;
    this.clearStamp();
    this.clearInk();
    this.fresh = false;
    this.setMode("tonight");
    this.shown = null;
    this.showInfo(null);
    this.finale = true;
    this.ticket.classList.remove("win");
    this.ticket.classList.add("finale-ticket");
    this.ticket.setAttribute("aria-label", "Your completed Kuvert watchthrough");
    $("finale").hidden = false;
    $("ticketNumber").textContent = catalog.films.length + " / " + catalog.films.length;
    this.updateFinale();
    await this.openStage({ animate: !this.open, year: this.nixie.value });
    this.app.announce("All " + catalog.films.length + " films watched. Your final ticket is ready.");
    this.app.confetti();
    this.app.play("seal");
    if (focus) this.ticket.focus({ preventScroll: true });
  }
  updateFinale() {
    const data = finaleData(this.store.p, this.app.catalog);
    $("viewFinale").hidden = !data;
    if (!this.finale) return;
    if (!data) {
      this.clearFinale();
      this.setOpen(false);
      return;
    }
    const dateText = (v) => (v ? dateFull(v) : "Not recorded");
    $("finaleFirst").textContent = dateText(data.first);
    $("finaleLast").textContent = dateText(data.last);
    $("finaleDateNote").textContent =
      data.dated === data.total
        ? "Every watch has a recorded date."
        : data.dated
          ? "Dates are recorded for " + data.dated + " of " + data.total + " films. This range covers those records only."
          : "No watch dates were recorded. Your complete watchthrough still counts.";
    $("finaleRuntimeRow").hidden = data.minutes === null;
    $("finaleRuntime").textContent = data.minutes === null ? "" : Math.floor(data.minutes / 60) + "h " + Math.round(data.minutes % 60) + "m";
    $("finaleRuntimeNote").textContent =
      data.minutes === null ? "Total running time will appear when every film has a runtime." : "The combined running time of all " + data.total + " films.";
  }

  // ---------------------------------------------------------------- film details from TMDB
  async showInfo(f) {
    const req = ++this.infoReq,
      { details, seagal } = this.app;
    this.infoController?.abort();
    this.infoController = new AbortController();
    const signal = this.infoController.signal;
    for (const id of ["poster", "backdropBtn", "pickTag", "pickFacts", "pickCredits", "pickMoney", "pickProv", "lbxBtn", "changeMatch", "retryInfo", "matchChoices"]) $(id).hidden = true;
    $("matchChoices").replaceChildren();
    $("infoStatus").textContent = "";
    this.ticket.classList.remove("loading", "no-details");
    $("moreDetails").hidden = !f;
    this.app.seagalCassette?.(f);
    if (!f) return;
    if (f.kind === "album") {
      // An album on the list: nothing to look up on TMDB.
      this.ticket.classList.add("no-details");
      $("moreDetails").hidden = true;
      setText("pickFacts", "Album · " + f.y + " · Listen start to finish");
      return;
    }
    if (!details.connected) {
      this.ticket.classList.add("no-details");
      $("infoStatus").textContent = "Connect TMDB in Settings for the poster and details.";
      return;
    }
    $("infoStatus").textContent = seagal ? ["Consulting ponytail…", "Calibrating aikido…", "Decrypting case file…", "Waking the body double…"][Math.floor(Math.random() * 4)] : "Loading movie details…";
    this.ticket.classList.add("loading");
    try {
      const d = await details.fetchInfo(f, signal);
      if (req !== this.infoReq) return;
      this.ticket.classList.remove("loading");
      if (d.choices) {
        $("infoStatus").textContent = d.choices.length ? "Choose the correct movie once to remember its match." : "No movie match found. Try again or use Change movie match after connecting.";
        this.matchButtons(f, d.choices, { forget: false });
        if (!d.choices.length) $("retryInfo").hidden = false;
        this.app.renderSoon();
        return;
      }
      $("infoStatus").textContent = "";
      this.image($("poster"), d.poster_path, "w342", f.t + " poster");
      $("backdropBtn").hidden = !d.backdrop_path;
      this.image($("backdrop"), d.backdrop_path, "w780", f.t + " backdrop");
      const country = this.store.settings.country;
      const releases = d.release_dates?.results?.find((r) => r.iso_3166_1 === country)?.release_dates || [];
      const cert = releases.find((r) => r.certification)?.certification;
      setText(
        "pickFacts",
        [cert, d.runtime ? d.runtime + " min" : null, ...(d.genres || []).slice(0, 3).map((g) => g.name), d.runtime >= 160 ? this.sg("planera en fika", "extraction will require a sandwich") : null]
          .filter(Boolean)
          .join(" · "),
      );
      setText("pickTag", d.tagline);
      const dir = (d.credits?.crew || []).filter((c) => c.job === "Director").map((c) => c.name).join(", "),
        cast = (d.credits?.cast || []).slice(0, 4).map((c) => c.name).join(", ");
      setText("pickCredits", [dir ? "dir. " + dir : null, cast ? "with " + cast : null].filter(Boolean).join(" · "));
      setText("pickMoney", [d.budget ? "Budget " + fmtMoney(d.budget) : null, d.revenue ? "Box office " + fmtMoney(d.revenue) : null].filter(Boolean).join(" · "));
      const p = d["watch/providers"]?.results?.[country] || {};
      const names = (a) => [...new Set((a || []).map((x) => x.provider_name))].join(", ");
      const offers = [
        p.flatrate?.length ? "Stream: " + names(p.flatrate) : null,
        p.free?.length ? "Free: " + names(p.free) : null,
        p.ads?.length ? "With ads: " + names(p.ads) : null,
        p.rent?.length ? "Rent: " + names(p.rent) : null,
        p.buy?.length ? "Buy: " + names(p.buy) : null,
      ].filter(Boolean);
      const prov = $("pickProv");
      prov.replaceChildren((offers.length ? offers.join(" · ") : "No listed availability") + " · " + country);
      if (p.link) {
        try {
          const u = new URL(p.link);
          if (u.protocol === "https:" && u.hostname.endsWith("themoviedb.org"))
            prov.append(" · ", h("a", { href: u.href, target: "_blank", rel: "noopener", text: "Check availability" }));
        } catch {}
      }
      prov.hidden = this.mode === "watched";
      $("lbxBtn").href = "https://letterboxd.com/tmdb/" + d.id;
      $("lbxBtn").hidden = false;
      $("moreDetails").hidden = false;
      $("changeMatch").hidden = false;
      this.app.renderSoon();
    } catch (e) {
      if (req !== this.infoReq) return;
      this.ticket.classList.remove("loading");
      $("infoStatus").textContent = e.name === "AbortError" ? "Movie details timed out. Try again." : e.message;
      $("retryInfo").hidden = false;
    }
  }
  image(el, path, size, label) {
    if (!path) {
      el.hidden = true;
      el.removeAttribute("src");
      el.dataset.big = "";
      return;
    }
    el.hidden = false;
    el.crossOrigin = "anonymous";
    el.src = imageUrl(size, path);
    el.dataset.big = imageUrl("original", path);
    el.alt = label;
    el.onerror = () => (el.hidden = true);
  }
  matchButtons(f, choices, { forget }) {
    $("matchChoices").hidden = false;
    $("matchChoices").replaceChildren(
      ...choices.map((choice) =>
        h("button", {
          class: "btn btn-paper btn-sm",
          type: "button",
          text: choice.title + " · " + ((choice.release_date || "").slice(0, 4) || "Year unknown"),
          on: {
            click: () => {
              this.store.setMatch(f.id, choice.id, { forget });
              this.app.details.cache.clear();
              this.showInfo(f);
              this.app.renderSoon();
            },
          },
        }),
      ),
    );
  }
  async changeMatch() {
    const f = this.shown;
    if (!f) return;
    const req = ++this.infoReq;
    this.infoController?.abort();
    $("infoStatus").textContent = "Finding movie matches…";
    try {
      const data = await this.app.details.search(f.t);
      if (req !== this.infoReq) return;
      this.matchButtons(f, (data.results || []).slice(0, 8), { forget: true });
      $("infoStatus").textContent = data.results?.length ? "Choose the correct movie." : "No matching movies found.";
    } catch {
      $("infoStatus").textContent = "Could not load matches. Try again.";
    }
  }

  // ---------------------------------------------------------------- every render
  render() {
    const { store, catalog, seagal } = this.app,
      p = store.p;
    const units = store.units(),
      cur = store.currentFilm,
      other = units.some((u) => u.film.id !== cur?.id),
      open = this.open,
      all = allWatched(p, catalog);
    // Draw button, envelope and ticket actions.
    const draw = $("drawBtn");
    draw.hidden = open;
    const saved = this.saved();
    draw.disabled = !saved && p.seen.size < catalog.films.length && (!units.length || (!!cur && !other));
    draw.textContent = all ? this.sg("Se slutbiljetten", "Final debrief") : this.sg("Öppna kuvertet", "Deploy");
    $("envelopeOpen").disabled = draw.disabled;
    $("envelopeOpen").setAttribute(
      "aria-label",
      all ? "Open your final ticket" : saved ? this.sg("Öppna kuvertet: open your saved ticket", "Open the case file: your active mission") : this.sg("Öppna kuvertet: draw a movie", "Open the case file: deploy a movie"),
    );
    $("againBtn").disabled = !other;
    $("againBtn").title = other ? "Draw another movie" : "No other eligible ticket";
    $("markBtn").hidden = !cur || p.seen.has(cur.id) || this.mode !== "tonight" || this.finale;
    $("againBtn").hidden = this.finale;
    const skip = $("skipBtn");
    skip.hidden = !cur || p.seen.has(cur.id);
    skip.disabled = p.skipped.size > 0;
    skip.textContent = cur && p.skipped.has(cur.id) ? this.sg("Set aside", "Cowardice") : p.skipped.size ? this.sg("Watch skipped film first", "Finish your last act of cowardice") : this.sg("Set aside", "Cowardice");
    skip.title = p.skipped.size ? "Finish your skipped film before skipping another." : "";
    // Moods on the ticket.
    const f = this.shown,
      tags = f ? store.moodsFor(f.id) : [];
    $("moodTags").hidden = !f || !tags.length || this.finale;
    $("moodTags").replaceChildren(...tags.map((t) => h("span", { text: t })));
    const own = f && Object.hasOwn(p.moods, f.id);
    $("moodSource").textContent = own ? "Your mood tags" : tags.length ? "Suggested from genres · adjust to your taste" : "Add mood tags to describe this film";
    // Weekly streak punched into the ticket.
    const punches = $("punches"),
      n = seagal ? 0 : this.app.streak(),
      shown = Math.min(n, 8);
    punches.hidden = !n;
    punches.replaceChildren(...Array.from({ length: shown }, () => h("i")), n > shown ? "+" + (n - shown) : "");
    punches.setAttribute("aria-label", plural(n, "week") + " in a row with a film");
    punches.title = punches.getAttribute("aria-label");
    this.paintShelf();
    if (this.mode === "watched") this.renderWatched();
    this.updateFinale();
    // With the envelope closed the dial stays dark: a saved ticket's year would give it away.
    if (!open && !this.busy) this.nixie.show(null);
  }
}

