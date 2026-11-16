// Your watchthrough: a sentence that sums it up, the LED board (one light per film), facts, your ranking,
// verdicts on winners, watch days, milestones, and progress by shelf and decade. Some of it is paper and
// film: each winner to judge is a ballot slip, the weekly streak a klippkort, each decade a strip of film.
// SEAGAL keeps its own look and takes none of the three.
import { $, h, s, icon, spot, emptyState, keepFocus, copyText, reduceMotion } from "../ui/dom.js";
import { byYear } from "../state/catalog.js";
import { dayShort, isoDay, isoToDate, defaultWatchDate } from "../state/dates.js";
import { t, LOCALE, swedish, decimal, listOf } from "../i18n/index.js";
import { titleParts } from "../i18n/titles.js";
import { plural, starText, statsData, paceData, paceText, computeMilestones, rankedFilms, unrankedFilms, watchDayCounts, eveningFacts, watchedFilms, ratingOf, punchCard, CLIPS, decadeStrips } from "../state/stats.js";

// A 5×7 dot font for the LED board.
const GLYPHS = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};
const VERDICTS = [
  ["yes", "Yes"],
  ["unsure", "Unsure"],
  ["no", "No"],
];
// Long lists open with their top: the first ten of the ranking, and three winners to judge.
const RANKS_SHOWN = 10,
  VERDICTS_SHOWN = 3;
// The kurbits garland under the heading: this many flowers, each painted in four steps (stem, leaves,
// petals, heart), so the garland fills in a part at a time as you watch.
const BLOOMS = 11,
  BLOOM_STEPS = 4;

export class Stats {
  constructor(app) {
    this.app = app;
    this.swept = false;
    this.ledTimer = null;
    const store = app.store;
    $("copyRanking").addEventListener("click", async () => {
      const ok = await copyText(this.rankingText(), $("rankingText"));
      app.toast.show(t(ok ? "Ranking copied. Paste it into the group chat." : "Select the ranking below and copy it."));
    });
    $("shareRanking").addEventListener("click", () => app.share.ranking());
    $("shareYear").addEventListener("click", () => app.share.year());
    $("placeRated").addEventListener("click", () => {
      const undo = store.placeRated();
      app.toast.show(t("Placed by their stars. Drag any of them to fine-tune."), undo);
    });
    $("viewFinale").addEventListener("click", () => {
      app.router.show("tonight");
      app.stage.displayFinale();
    });
    $("ledBoard").addEventListener("click", () => this.showCount());
    // Milestones show the next few to earn; the rest are a tap away.
    this.allMilestones = false;
    $("milestoneMore").addEventListener("click", () => {
      this.allMilestones = !this.allMilestones;
      this.milestones();
    });
    // The garland's flowers: an outline each, with its paint over it (css/pages.css). Not in SEAGAL.
    if (!app.seagal)
      $("garland").replaceChildren(
        ...Array.from({ length: BLOOMS }, (_, i) =>
          h(
            "span",
            { class: "bloom" + (i % 3 === 1 ? " alt" : "") },
            s("svg", { class: "b-line", viewBox: "0 0 40 56" }, s("use", { href: "#kurbits" })),
            s("svg", { class: "b-paint", viewBox: "0 0 40 56" }, s("use", { href: "#kurbits" })),
          ),
        ),
      );
    // So do the ranking and the winners to judge.
    this.allRanks = this.allVerdicts = false;
    this.ranksBelow = [];
    this.verdictPick = null;
    $("rankMore").addEventListener("click", () => {
      this.allRanks = !this.allRanks;
      this.ranking();
    });
    $("verdictMore").addEventListener("click", () => {
      this.allVerdicts = !this.allVerdicts;
      this.verdictPick = null;
      this.verdicts();
    });
  }

  enter() {
    // Each visit starts with the winners still to judge.
    if (this.verdictPick) {
      this.verdictPick = null;
      this.verdicts();
    }
    // The board lights up film by film the first time you open Stats in a visit.
    if (!this.swept && !reduceMotion()) {
      this.swept = true;
      this.sweep();
    }
  }

  render() {
    const { store, catalog } = this.app,
      p = store.p;
    const d = statsData(p, catalog);
    this.headline(d);
    this.garland(d);
    this.led();
    $("statsMetrics").replaceChildren(
      ...[
        this.fact(t("Watched"), [d.watched + "", h("small", { text: "/ " + d.total })], d.remaining ? t("{n} to go", { n: d.remaining }) : t("Every film")),
        d.known ? this.fact(t("Watch time"), this.hours(d.minutes), d.missing ? t("{films} without a runtime", { films: plural(d.missing, "film") }) : "") : null,
        d.averageRuntime !== null ? this.fact(t("Average length"), this.hours(d.averageRuntime)) : null,
        d.averageRating !== null ? this.fact(t("Your average"), [decimal(d.averageRating), h("small", { text: "★" })], t("{films} rated", { films: plural(d.rated, "film") })) : null,
      ].filter(Boolean),
    );
    keepFocus(() => {
      this.ranking();
      this.verdicts();
    });
    this.watchDays();
    this.klippkort();
    this.milestones();
    // By shelf and by decade.
    $("shelfSection").hidden = !catalog.hasShelves;
    $("jumpShelves").hidden = !catalog.hasShelves;
    $("statsShelves").replaceChildren(
      ...d.shelves
        .filter((x) => x.total)
        .map((x) =>
          h(
            "div",
            { class: "shelf-stat" },
            h("span", { text: t(catalog.shelves[x.s].plural) + " · " + x.watched + " / " + x.total + (x.average ? t(" · your average {n} ★", { n: decimal(x.average) }) : "") }),
            h("div", { class: "meter", attrs: { role: "img", "aria-label": t("{n} of {total} {shelf} watched", { n: x.watched, total: x.total, shelf: t(catalog.shelves[x.s].plural).toLowerCase() }) } }, h("i", { style: { "--p": (x.watched / x.total) * 100 + "%" } })),
          ),
        ),
    );
    // Under each decade's numbers, its strip of film: a frame per film, lit once the film is watched. The
    // strips are pictures of the numbers above them, so they are kept from screen readers.
    const reels = this.app.seagal ? null : decadeStrips(p, catalog);
    $("decadeSummary").textContent = !reels ? "" : reels.per === 1 ? t("One frame per film, oldest first") : t("One frame for every {n} films, oldest first", { n: reels.per });
    $("statsDecades").replaceChildren(
      ...d.decades.flatMap((row, i) => [
        h("tr", {}, h("td", { text: t("{decade}s", { decade: row.decade }) }), h("td", { text: row.watched + " / " + row.total }), h("td", { text: row.average === null ? "—" : decimal(row.average) + " / 5" })),
        reels ? h("tr", { class: "strip-row", attrs: { "aria-hidden": "true" } }, h("td", { colSpan: 3 }, this.strip(reels.strips[i], reels.longest))) : null,
      ]).filter(Boolean),
    );
    this.app.seagalStats?.();
  }
  // The longest decade's strip spans the column, and the others are as long as their films make them.
  strip(reel, longest) {
    return h(
      "div",
      { class: "strip", style: { "--n": reel.frames.length, "--max": longest } },
      reel.frames.map(({ films, lit }) => h("i", { class: lit === 1 ? "on" : lit ? "part" : "", title: films.length === 1 ? films[0].t + " (" + films[0].y + ")" : films[0].y + "–" + films.at(-1).y })),
    );
  }

  fact(label, value, detail = "") {
    return h("div", { class: "fact" }, h("dt", { text: label }), h("dd", {}, h("strong", {}, value), detail ? h("span", { text: detail }) : null));
  }
  hours(minutes) {
    const hrs = Math.floor(minutes / 60),
      m = Math.round(minutes % 60);
    return hrs ? [hrs + "", h("small", { text: t("h") }), m + "", h("small", { text: t("m") })] : [m + "", h("small", { text: "min" })];
  }
  // The top of Stats: a sentence or two that sum up the watchthrough so far.
  headline(d) {
    const el = $("statsHeadline"),
      b = (t) => h("b", { text: t }),
      line = (...parts) => h("span", {}, ...parts);
    if (!d.watched)
      return el.replaceChildren(
        line(t("Nothing watched yet.")),
        line(this.app.sg("The popcorn is ready. Open the envelope on Tonight to draw your first film.", "Open the envelope on Tonight to draw your first film.")),
      );
    if (!d.remaining) return el.replaceChildren(line(t("All "), b(plural(d.total, "film")), t(" watched. The envelope is empty.")));
    const pace = paceData(this.app.store.p, this.app.catalog);
    if (!pace) return el.replaceChildren(line(b(plural(d.watched, "film")), t(" watched, {n} to go.", { n: d.remaining })), line(t("Your pace shows up after a week of dated watches.")));
    const span = pace.days < 14 ? plural(pace.days, "day") : plural(Math.round(pace.days / 7), "week");
    // The pace counts dated watches only: films you'd seen before Kuvert have no date.
    const before = d.watched - pace.count;
    el.replaceChildren(
      ...[
        line(b(plural(pace.count, "film")), t(" in {span}, about {pace}.", { span, pace: paceText(pace.perWeek) })),
        before > 0 ? line(t("Plus {films} you'd seen before.", { films: plural(before, "film") })) : null,
        line(
          t("At this pace you finish around "),
          b(pace.finish.toLocaleDateString(LOCALE, { month: "long", year: "numeric" })),
          this.app.sg(".", ", before his next direct-to-video release."),
        ),
      ].filter(Boolean),
    );
  }

  // ---------------------------------------------------------------- the LED board
  led() {
    const { store, catalog, stage } = this.app,
      p = store.p;
    const films = [...catalog.films].sort(byYear),
      n = films.length;
    const cols = n > 100 ? 25 : Math.max(5, Math.ceil(Math.sqrt(n * 2.5)));
    const board = $("ledBoard");
    board.style.setProperty("--cols", cols);
    if (board.children.length !== n) board.replaceChildren(...films.map(() => h("i")));
    const cur = stage.open && stage.mode === "tonight" ? store.p.current : null;
    films.forEach((f, i) => {
      const dot = board.children[i];
      dot.title = f.t + " (" + f.y + ")";
      dot.className = p.seen.has(f.id) ? "on" : cur === f.id ? "now" : "";
    });
    board.setAttribute("aria-label", t("{n} of {total} films watched, one light per film in year order", { n: p.seen.size, total: n }));
    this.cols = cols;
  }
  sweep() {
    const dots = [...$("ledBoard").children],
      lit = dots.filter((d) => d.classList.contains("on"));
    if (!lit.length) return;
    lit.forEach((d) => d.classList.add("dim"));
    lit.forEach((d, i) => setTimeout(() => d.classList.remove("dim"), 200 + (i / lit.length) * 900));
  }
  // Tap the board: it spells out how many films you've watched, then goes back to the map.
  showCount() {
    if (reduceMotion()) return;
    const board = $("ledBoard"),
      dots = [...board.children],
      cols = this.cols,
      rows = Math.ceil(dots.length / cols);
    const text = String(this.app.store.p.seen.size),
      width = text.length * 6 - 1;
    if (width > cols || rows < 7) return;
    clearTimeout(this.ledTimer);
    const x0 = Math.floor((cols - width) / 2),
      y0 = Math.floor((rows - 7) / 2);
    const on = new Set();
    [...text].forEach((ch, k) =>
      GLYPHS[ch].forEach((row, y) => [...row].forEach((bit, x) => bit === "1" && on.add((y0 + y) * cols + x0 + k * 6 + x))),
    );
    dots.forEach((d, i) => {
      d.classList.toggle("flash", on.has(i));
      d.classList.toggle("dim", !on.has(i));
    });
    this.app.play("tick");
    this.ledTimer = setTimeout(() => {
      dots.forEach((d) => d.classList.remove("flash", "dim"));
      this.sweep();
    }, 1800);
  }

  // The kurbits garland: painted from the left, a part at a time. One film starts it; the last one finishes it.
  garland(d) {
    const steps = BLOOMS * BLOOM_STEPS,
      done = !d.watched ? 0 : d.watched >= d.total ? steps : Math.max(1, Math.floor((steps * d.watched) / d.total));
    [...$("garland").children].forEach((bloom, i) => (bloom.dataset.paint = String(Math.max(0, Math.min(BLOOM_STEPS, done - i * BLOOM_STEPS)))));
  }

  // ---------------------------------------------------------------- ranking ("Min topplista")
  rankingText() {
    const { store, catalog, list } = this.app;
    const films = rankedFilms(store.p, catalog);
    return (
      list.name +
      t(" ranking · ") +
      plural(films.length, "film") +
      "\n" +
      films.map((f, i) => i + 1 + ". " + f.t + (ratingOf(store.p, f.id) !== null ? " " + starText(ratingOf(store.p, f.id)) : "")).join("\n")
    );
  }
  ranking() {
    const { store, catalog, library } = this.app,
      p = store.p;
    const ranked = rankedFilms(p, catalog),
      unranked = unrankedFilms(p, catalog);
    $("rankSummary").textContent = t("{n} ranked", { n: ranked.length }) + (unranked.length ? t(" · {n} to place", { n: unranked.length }) : "");
    $("copyRanking").hidden = $("shareRanking").hidden = !ranked.length;
    // The film year: on offer once a watch has a date. In January it is the year that just ended.
    const year = this.app.share.yearOnOffer();
    $("shareYear").hidden = !year;
    if (year) $("shareYearLabel").textContent = t("Share your film year · {year}", { year });
    // The top ten, with the rest a tap away. A list only a little longer is shown whole.
    const short = !this.allRanks && ranked.length > RANKS_SHOWN + 2,
      shown = short ? ranked.slice(0, RANKS_SHOWN) : ranked;
    this.ranksBelow = ranked.slice(shown.length).map((f) => f.id);
    const more = $("rankMore");
    more.hidden = ranked.length <= RANKS_SHOWN + 2;
    more.textContent = short ? t("Show all {n}", { n: ranked.length }) : t("Show the top ten");
    more.setAttribute("aria-expanded", String(!short));
    const list = $("rankList");
    if (!ranked.length)
      list.replaceChildren(
        watchedFilms(p, catalog).length
          ? emptyState("podium", t("Nothing ranked yet"), t("Give a film stars and it takes its place here."))
          : emptyState("podium", t("No ranking yet"), this.app.sg("It starts with your first watched film. The horse is keeping the top spot warm.", "It starts with your first watched film.")),
      );
    else
      list.replaceChildren(
        ...shown.map((f, i) => {
          const r = ratingOf(p, f.id);
          const thumb = library.thumb(f);
          const li = h(
            "li",
            { class: "rank-row" + (thumb ? "" : " no-thumb"), dataset: { rank: f.id } },
            h("button", { class: "rank-handle", type: "button", dataset: { key: "rankh-" + f.id }, attrs: { "aria-label": t("Drag to reorder {title}. Use the arrow buttons to move it with the keyboard.", { title: f.t }) } }, icon("grip")),
            h("span", { class: "rank-pos", text: String(i + 1) }),
            thumb,
            h("span", { class: "rank-body" }, h("span", { class: "rank-title" }, ...titleParts(f)), h("span", { class: "rank-meta", text: (r !== null ? starText(r) + " · " : "") + f.y })),
            // The arrows move a film without dragging. On a phone they step aside for the title (css/pages.css).
            h(
              "span",
              { class: "rank-moves" },
              h("button", { class: "rank-btn", type: "button", disabled: i === 0, dataset: { key: "rankup-" + f.id }, attrs: { "aria-label": t("Move {title} up", { title: f.t }) }, on: { click: () => this.move(f.id, -1) } }, icon("up")),
              h("button", { class: "rank-btn", type: "button", disabled: i === ranked.length - 1, dataset: { key: "rankdown-" + f.id }, attrs: { "aria-label": t("Move {title} down", { title: f.t }) }, on: { click: () => this.move(f.id, 1) } }, icon("down")),
            ),
            h(
              "button",
              {
                class: "rank-btn",
                type: "button",
                dataset: { key: "rankout-" + f.id },
                attrs: { "aria-label": t("Take {title} out of the ranking", { title: f.t }) },
                on: {
                  click: () => {
                    const undo = store.removeFromRanking(f.id);
                    this.app.toast.show(t("{title} moved to Not ranked yet.", { title: f.t }), undo);
                  },
                },
              },
              icon("x"),
            ),
          );
          li.querySelector(".rank-handle").addEventListener("pointerdown", (e) => this.drag(e, li));
          return li;
        }),
      );
    // Rated films go in by their stars as you rate them; what's left is films without stars (and any
    // rated before that, or taken out). One line for them, and the list itself folded away.
    const rated = unranked.filter((f) => ratingOf(p, f.id) !== null).length,
      unrated = unranked.length - rated;
    $("unrankedBox").hidden = !unranked.length;
    $("unrankedSummary").textContent = [
      rated ? t(rated === 1 ? "1 rated film isn't in your ranking." : "{n} rated films aren't in your ranking.", { n: rated }) : "",
      unrated ? t(unrated === 1 ? "1 watched film has no stars yet: stars put it in." : "{n} watched films have no stars yet: stars put them in.", { n: unrated }) : "",
    ].filter(Boolean).join(" ");
    $("placeRated").hidden = !rated;
    $("unrankedList").replaceChildren(
      ...unranked.map((f) => {
        const r = ratingOf(p, f.id),
          thumb = library.thumb(f);
        return h(
          "li",
          { class: "rank-row" + (thumb ? "" : " no-thumb") },
          thumb,
          h("span", { class: "rank-body" }, h("span", { class: "rank-title" }, ...titleParts(f)), h("span", { class: "rank-meta", text: (r !== null ? starText(r) + " · " : t("No stars yet · ")) + f.y })),
          h(
            "button",
            {
              class: "btn btn-sm",
              type: "button",
              dataset: { key: "rankadd-" + f.id },
              attrs: { "aria-label": t("Add {title} to your ranking", { title: f.t }) },
              on: {
                click: () => {
                  const undo = store.placeInRanking(f.id);
                  if (!this.allRanks && store.p.rankings.indexOf(f.id) >= RANKS_SHOWN) {
                    this.allRanks = true;
                    this.app.renderSoon();
                  }
                  this.app.toast.show(t("{title} added at #{n}.", { title: f.t, n: store.p.rankings.indexOf(f.id) + 1 }), undo);
                  requestAnimationFrame(() => $("rankList").querySelector('[data-rank="' + CSS.escape(f.id) + '"] .rank-handle')?.focus({ preventScroll: true }));
                },
              },
            },
            icon("plus"),
            t("Add"),
          ),
        );
      }),
    );
  }
  move(id, delta) {
    // A film that steps below the top ten opens the whole list, so it stays in sight.
    const at = rankedFilms(this.app.store.p, this.app.catalog).findIndex((f) => f.id === id);
    if (!this.allRanks && at + delta >= RANKS_SHOWN) this.allRanks = true;
    const j = this.app.store.moveRank(id, delta);
    if (j === null) return;
    this.app.announce(t("{title} is now #{n}.", { title: this.app.catalog.byId.get(id).t, n: j + 1 }));
    requestAnimationFrame(() =>
      $("rankList")
        .querySelector('[data-key="' + (delta < 0 ? "rankup-" : "rankdown-") + CSS.escape(id) + '"]')
        ?.focus({ preventScroll: true }),
    );
  }
  // Pointer drag for mouse and touch: the row follows the finger; the order commits on release.
  drag(e, row) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const list = $("rankList"),
      store = this.app.store;
    // The films below the top ten keep their places while the list is short.
    const below = this.ranksBelow;
    const startOrder = [...list.querySelectorAll(".rank-row")].map((r) => r.dataset.rank);
    row.classList.add("dragging");
    const move = (ev) => {
      const y = ev.clientY;
      const rows = [...list.querySelectorAll(".rank-row")].filter((r) => r !== row);
      const after = rows.find((r) => {
        const b = r.getBoundingClientRect();
        return y < b.top + b.height / 2;
      });
      // Rows that make room slide instead of jumping.
      const before = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
      if (after) list.insertBefore(row, after);
      else list.append(row);
      for (const [r, top] of before) {
        const dy = top - r.getBoundingClientRect().top;
        if (dy) r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 160, easing: "ease-out" });
      }
      if (y < 70) window.scrollBy(0, -12);
      else if (y > innerHeight - 70) window.scrollBy(0, 12);
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      row.classList.remove("dragging");
      const order = [...list.querySelectorAll(".rank-row")].map((r) => r.dataset.rank);
      if (order.join() === startOrder.join()) return;
      const undo = store.setRanking([...order, ...below]);
      const id = row.dataset.rank;
      this.app.toast.show(t("{title} moved to #{n}.", { title: this.app.catalog.byId.get(id).t, n: order.indexOf(id) + 1 }), undo);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  // ---------------------------------------------------------------- "Deserved the win?"
  verdicts() {
    const { store, catalog, library } = this.app,
      p = store.p;
    const winners = watchedFilms(p, catalog).filter(catalog.isWinner);
    $("verdictBox").hidden = !catalog.films.some(catalog.isWinner);
    $("jumpVerdicts").hidden = $("verdictBox").hidden;
    const decided = winners.filter((f) => p.verdicts[f.id]);
    const keep = decided.filter((f) => p.verdicts[f.id] === "yes").length,
      handed = decided.filter((f) => p.verdicts[f.id] === "no").length,
      toJudge = winners.length - decided.length;
    $("verdictSummary").textContent = !winners.length
      ? ""
      : decided.length
        ? t("Winners you'd keep: {n} of {total}", { n: keep, total: decided.length }) + (handed ? t(" · you'd hand {trophies} to another film", { trophies: plural(handed, catalog.award?.trophy || "award") }) : "") + (toJudge ? t(" · {n} to judge", { n: toJudge }) : "")
        : t("{winners} to judge", { winners: plural(toJudge, "winner") });
    if (!winners.length) $("verdictMore").hidden = true;
    if (!winners.length) return $("verdictList").replaceChildren(emptyState("trophy", t("No winners watched yet"), catalog.prize ? t("Watch a {prize} winner to judge it here.", { prize: catalog.prize }) : t("Watch a winner to judge it here.")));
    // Three at a time: the first still to judge, and they stay put while you judge them.
    const more = $("verdictMore"),
      long = winners.length > VERDICTS_SHOWN + 1;
    if (long && !this.allVerdicts) {
      const kept = (this.verdictPick || []).filter((id) => winners.some((f) => f.id === id));
      if (kept.length < VERDICTS_SHOWN) {
        const open = winners.filter((f) => !p.verdicts[f.id]).map((f) => f.id);
        this.verdictPick = [...new Set([...kept, ...open, ...winners.map((f) => f.id)])].slice(0, VERDICTS_SHOWN);
      }
    }
    const shown = long && !this.allVerdicts ? winners.filter((f) => this.verdictPick.includes(f.id)) : winners;
    more.hidden = !long;
    more.textContent = shown.length < winners.length ? t("Show all {n}", { n: winners.length }) : t("Show fewer");
    more.setAttribute("aria-expanded", String(shown.length === winners.length));
    $("verdictList").replaceChildren(
      ...shown.map((f) => {
        const group = h(
          "span",
          { class: "verdicts", attrs: { role: "group", "aria-label": catalog.prize ? t("Did {title} deserve {prize}?", { title: f.t, prize: catalog.prize }) : t("Did {title} deserve the win?", { title: f.t }) } },
          VERDICTS.map(([value, label]) =>
            h("button", {
              class: "verdict-btn v-" + value,
              type: "button",
              text: t(label),
              dataset: { key: "verdict-" + value + "-" + f.id },
              attrs: { "aria-pressed": String(p.verdicts[f.id] === value) },
              on: { click: () => this.app.setVerdict(f.id, value) },
            }),
          ),
        );
        let snub = null;
        if (p.verdicts[f.id] === "no") {
          const select = h("select", { dataset: { key: "snub-" + f.id }, on: { change: (e) => store.setSnub(f.id, e.target.value) } });
          snub = h("label", { class: "should-won" }, t("Should have won "), select);
          this.app.fillShouldHaveWon(select, snub, f);
        }
        // A ballot slip: its head is print, the boxes under the title are the three buttons.
        const head = this.app.seagal ? null : h("span", { class: "ballot-head", attrs: { "aria-hidden": "true" } }, h("b", { lang: "sv", text: "Valsedel" }), h("span", { text: (catalog.prize || t("Winner")) + " · " + f.y }));
        return h("li", { class: this.app.seagal ? "" : "ballot" }, head, library.thumb(f), h("span", { class: "verdict-title", text: f.t + " (" + f.y + ")" }), group, snub);
      }),
    );
  }

  // ---------------------------------------------------------------- the klippkort
  // The weekly streak as a punch card: ten holes to a card, one punched for every week in a row with a film.
  klippkort() {
    $("klippkort").hidden = this.app.seagal;
    if (this.app.seagal) return;
    const k = punchCard(this.app.store.p, this.app.catalog);
    $("kkNo").textContent = "Nr " + String(k.card).padStart(3, "0");
    $("kkHoles").replaceChildren(...Array.from({ length: CLIPS }, (_, i) => h("li", { class: i < k.cut ? "cut" : i === k.cut && k.open ? "due" : "", text: i < k.cut ? "" : String(i + 1) })));
    $("kkStreak").textContent = !k.streak ? t("No streak yet") : k.streak === 1 ? t("1 week so far") : t("{weeks} in a row", { weeks: plural(k.streak, "week") });
    $("kkNote").textContent = [
      !k.streak ? t("A film this week punches the first hole.") : k.open ? t("This week's hole is still to punch.") : t("This week is punched."),
      k.card > 1 ? t("{cards} full before this one.", { cards: plural(k.card - 1, "card") }) : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  // ---------------------------------------------------------------- watch days
  // A calendar strip of recent weeks (Monday to Sunday). One hue, brighter for more films.
  watchDays() {
    const { store, catalog } = this.app,
      byDay = watchDayCounts(store.p, catalog);
    // Days sit 25px apart, so each is easy to hit (WCAG 2.5.8): as many weeks as fit the column.
    const weeks = matchMedia("(max-width: 350px)").matches ? 11 : matchMedia("(max-width: 540px)").matches ? 14 : 26;
    const today = isoToDate(defaultWatchDate());
    const end = new Date(today);
    end.setDate(end.getDate() + ((7 - ((end.getDay() + 6) % 7) - 1) % 7)); // this week's Sunday
    const start = new Date(end);
    start.setDate(start.getDate() - weeks * 7 + 1); // a Monday
    let days = 0,
      films = 0,
      lastMonth = -1;
    const labels = [],
      months = [],
      columns = [];
    for (let w = 0; w < weeks; w++) {
      const monday = new Date(start);
      monday.setDate(start.getDate() + w * 7);
      const label = h("span");
      if (monday.getMonth() !== lastMonth) {
        label.textContent = monday.toLocaleDateString(LOCALE, { month: "short" });
        lastMonth = monday.getMonth();
        labels.push(label);
      }
      months.push(label);
      const cells = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + d);
        const list = byDay.get(isoDay(day)) || [],
          future = day > today;
        const text = day.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "short" }) + " · " + (list.length ? list.map((f) => f.t).join(", ") : t("no film"));
        if (list.length) {
          days++;
          films += list.length;
        }
        const show = () => ($("heatTip").textContent = text);
        cells.push(
          h("button", {
            class: "heat-cell h" + Math.min(2, list.length) + (future ? " future" : ""),
            type: "button",
            disabled: future,
            attrs: { role: "gridcell", "aria-label": text },
            on: { pointerenter: show, focus: show, click: () => list.length === 1 && this.app.stage.openFilm(list[0].id) },
          }),
        );
      }
      columns.push(h("div", { class: "heat-week", attrs: { role: "row" } }, cells));
    }
    // A month that only reaches the first week or two would crowd the next label.
    if (labels.length > 1 && months.indexOf(labels[1]) - months.indexOf(labels[0]) < 3) labels[0].textContent = "";
    const strip = $("heatStrip");
    strip.style.setProperty("--weeks", weeks);
    // One stop for Tab, today; the arrow keys go from day to day (up and down) and week to week (sideways).
    const all = columns.flatMap((c) => [...c.children]),
      last = all.findLastIndex((c) => !c.disabled);
    all.forEach((c, i) => (c.tabIndex = i === last ? 0 : -1));
    const step = { ArrowDown: 1, ArrowUp: -1, ArrowRight: 7, ArrowLeft: -7 };
    const move = (e) => {
      const i = all.indexOf(e.target);
      if (i < 0 || !(e.key in step || e.key === "Home" || e.key === "End")) return;
      e.preventDefault();
      const next = e.key === "Home" ? 0 : e.key === "End" ? last : i + step[e.key];
      if (next < 0 || next > last) return;
      all[i].tabIndex = -1;
      all[next].tabIndex = 0;
      all[next].focus();
    };
    strip.replaceChildren(
      h("div", { class: "heat-months", attrs: { "aria-hidden": "true" } }, months),
      h("div", { class: "heat-grid", attrs: { role: "grid", "aria-label": t("Days you watched a film, last {n} weeks", { n: weeks }) }, on: { keydown: move } }, columns),
    );
    $("watchDaysSummary").textContent = days ? t("{films} on {evenings} in {n} weeks", { films: plural(films, "film"), evenings: plural(days, "evening"), n: weeks }) : t("No dated watches in the last {n} weeks", { n: weeks });
    $("heatTip").textContent = days ? t("Hover or tap a day to see what you watched.") : "";
    // Evening facts: longest run, favorite night, busiest week.
    const f = eveningFacts(byDay),
      box = $("eveningFacts");
    box.hidden = !f;
    if (!f) return box.replaceChildren();
    const nights = (d) => new Date(2026, 0, 4 + d).toLocaleDateString(LOCALE, { weekday: "long" }) + (swedish ? "ar" : "s"); // 4 Jan 2026 is a Sunday
    const spread = f.favourites.length > 2;
    box.replaceChildren(
      ...[
        [t("Longest run"), f.run > 1 ? t("{evenings} in a row", { evenings: plural(f.run, "evening") }) : t("One at a time"), f.run > 1 ? t("Ending {day}", { day: dayShort(f.runEnd) }) : t("No back-to-back film nights yet")],
        [t("Favorite night"), spread ? t("Any night") : listOf(f.favourites.map(nights)), spread ? t("Spread across the week") : plural(f.top, "film") + (f.favourites.length > 1 ? t(" each") : "")],
        [t("Busiest week"), plural(f.busiest.n, "film"), t("Week of {day}", { day: dayShort(f.busiest.week) })],
      ].map(([label, value, note]) => h("div", {}, h("dt", { text: label }), h("dd", {}, value, h("span", { text: note })))),
    );
  }

  milestones() {
    const cards = computeMilestones(this.app.store.p, this.app.catalog),
      earned = cards.filter((c) => c.complete).length;
    $("milestoneSummary").textContent = t("{n} of {total} earned", { n: earned, total: cards.length });
    // The next few to earn, closest first; or every one of them.
    const share = (c) => (c.target ? c.n / c.target : 0),
      next = cards.filter((c) => !c.complete).sort((a, b) => share(b) - share(a)).slice(0, 4);
    const shown = this.allMilestones || !next.length ? cards : next;
    $("milestoneMore").hidden = shown.length === cards.length && !this.allMilestones;
    $("milestoneMore").textContent = this.allMilestones ? t("Show the next few") : t(earned ? "Show all {n}, with the {earned} you've earned" : "Show all {n}", { n: cards.length, earned });
    $("milestoneMore").setAttribute("aria-expanded", String(this.allMilestones));
    const grid = $("milestoneGrid");
    grid.replaceChildren(
      ...shown.map((c) =>
        h(
          "article",
          { class: "milestone" + (c.complete ? " earned" : "") },
          // In the stamp: the milestone's drawing, or the number it counts to. SEAGAL keeps to numbers and letters.
          h("span", { class: "milestone-stamp", attrs: { "aria-hidden": "true" } }, c.art && !this.app.seagal ? spot(c.art) : h("b", { class: /^\d+$/.test(c.stamp) ? "" : "word", text: c.stamp })),
          h("h3", { text: c.title }),
          h("p", { text: c.description }),
          h("p", { class: "milestone-count", text: c.complete ? t("Earned") : t("{n} of {total}", { n: c.n, total: c.target }) }),
        ),
      ),
    );
  }
}

