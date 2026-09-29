// Your watchthrough: a sentence that sums it up, the LED board (one light per film), facts, your ranking,
// verdicts on winners, watch days, milestones, and progress by shelf and decade.
import { $, h, icon, emptyState, keepFocus, copyText, reduceMotion } from "../ui/dom.js";
import { byYear } from "../state/catalog.js";
import { dayShort, isoDay, isoToDate, defaultWatchDate } from "../state/dates.js";
import { t, LOCALE, swedish, decimal, listOf } from "../i18n/index.js";
import { plural, starText, statsData, paceData, paceText, computeMilestones, rankedFilms, unrankedFilms, watchDayCounts, eveningFacts, watchedFilms, ratingOf } from "../state/stats.js";

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
    $("rankByStars").addEventListener("click", () => {
      const undo = store.rankByStars();
      app.toast.show(t("Ranking started from your stars. Reorder it to match what you enjoyed most."), undo);
    });
    $("viewFinale").addEventListener("click", () => {
      app.router.show("tonight");
      app.stage.displayFinale();
    });
    $("ledBoard").addEventListener("click", () => this.showCount());
  }

  enter() {
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
    $("statsDecades").replaceChildren(
      ...d.decades.map((row) =>
        h("tr", {}, h("td", { text: t("{decade}s", { decade: row.decade }) }), h("td", { text: row.watched + " / " + row.total }), h("td", { text: row.average === null ? "—" : decimal(row.average) + " / 5" })),
      ),
    );
    this.app.seagalStats?.();
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
    el.replaceChildren(
      line(b(plural(d.watched, "film")), t(" in {span}, about {pace}.", { span, pace: paceText(pace.perWeek) })),
      line(
        t("At this pace you finish around "),
        b(pace.finish.toLocaleDateString(LOCALE, { month: "long", year: "numeric" })),
        this.app.sg(".", ", before his next direct-to-video release."),
      ),
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
    $("rankByStars").hidden = !!ranked.length || !watchedFilms(p, catalog).some((f) => ratingOf(p, f.id) !== null);
    const list = $("rankList");
    if (!ranked.length)
      list.replaceChildren(
        watchedFilms(p, catalog).length
          ? emptyState(t("Nothing ranked yet"), t("Add films from the list below, or start from your stars."))
          : emptyState(t("No ranking yet"), this.app.sg("It starts with your first watched film. The horse is keeping the top spot warm.", "It starts with your first watched film.")),
      );
    else
      list.replaceChildren(
        ...ranked.map((f, i) => {
          const r = ratingOf(p, f.id);
          const thumb = library.thumb(f);
          const li = h(
            "li",
            { class: "rank-row" + (thumb ? "" : " no-thumb"), dataset: { rank: f.id } },
            h("button", { class: "rank-handle", type: "button", dataset: { key: "rankh-" + f.id }, attrs: { "aria-label": t("Drag to reorder {title}. Use the arrow buttons to move it with the keyboard.", { title: f.t }) } }, icon("grip")),
            h("span", { class: "rank-pos", text: String(i + 1) }),
            thumb,
            h("span", { class: "rank-body" }, h("span", { class: "rank-title", text: f.t }), h("span", { class: "rank-meta", text: (r !== null ? starText(r) + " · " : "") + f.y })),
            h("button", { class: "rank-btn", type: "button", disabled: i === 0, dataset: { key: "rankup-" + f.id }, attrs: { "aria-label": t("Move {title} up", { title: f.t }) }, on: { click: () => this.move(f.id, -1) } }, icon("up")),
            h("button", { class: "rank-btn", type: "button", disabled: i === ranked.length - 1, dataset: { key: "rankdown-" + f.id }, attrs: { "aria-label": t("Move {title} down", { title: f.t }) }, on: { click: () => this.move(f.id, 1) } }, icon("down")),
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
    $("unrankedBox").hidden = !unranked.length;
    $("unrankedList").replaceChildren(
      ...unranked.map((f) => {
        const r = ratingOf(p, f.id),
          thumb = library.thumb(f);
        return h(
          "li",
          { class: "rank-row" + (thumb ? "" : " no-thumb") },
          thumb,
          h("span", { class: "rank-body" }, h("span", { class: "rank-title", text: f.t }), h("span", { class: "rank-meta", text: (r !== null ? starText(r) + " · " : t("No stars yet · ")) + f.y })),
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
      const undo = store.setRanking(order);
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
        ? t("Winners you'd keep: {n} of {total}", { n: keep, total: decided.length }) + (handed ? t(" · you'd hand {oscars} to another film", { oscars: plural(handed, "Oscar") }) : "") + (toJudge ? t(" · {n} to judge", { n: toJudge }) : "")
        : t("{winners} to judge", { winners: plural(toJudge, "winner") });
    if (!winners.length) return $("verdictList").replaceChildren(emptyState(t("No winners watched yet"), t("Watch a Best Picture winner to judge it here.")));
    $("verdictList").replaceChildren(
      ...winners.map((f) => {
        const group = h(
          "span",
          { class: "verdicts", attrs: { role: "group", "aria-label": t("Did {title} deserve Best Picture?", { title: f.t }) } },
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
        return h("li", {}, library.thumb(f), h("span", { class: "verdict-title", text: f.t + " (" + f.y + ")" }), group, snub);
      }),
    );
  }

  // ---------------------------------------------------------------- watch days
  // A calendar strip of recent weeks (Monday to Sunday). One hue, brighter for more films.
  watchDays() {
    const { store, catalog } = this.app,
      byDay = watchDayCounts(store.p, catalog);
    const weeks = matchMedia("(max-width: 540px)").matches ? 17 : 26;
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
    strip.replaceChildren(
      h("div", { class: "heat-months", attrs: { "aria-hidden": "true" } }, months),
      h("div", { class: "heat-grid", attrs: { role: "grid", "aria-label": t("Days you watched a film, last {n} weeks", { n: weeks }) } }, columns),
    );
    $("watchDaysSummary").textContent = days ? t("{films} on {evenings} in {n} weeks", { films: plural(films, "film"), evenings: plural(days, "evening"), n: weeks }) : t("No dated watches in the last {n} weeks", { n: weeks });
    $("heatTip").textContent = days ? t("Hover or tap a day to see what you watched.") : "";
    // Evening facts: longest run, favourite night, busiest week.
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
    const cards = computeMilestones(this.app.store.p, this.app.catalog);
    $("milestoneSummary").textContent = t("{n} of {total} earned", { n: cards.filter((c) => c.complete).length, total: cards.length });
    const grid = $("milestoneGrid");
    grid.replaceChildren(
      ...cards.map((c) =>
        h(
          "article",
          { class: "milestone" + (c.complete ? " earned" : "") },
          h("span", { class: "milestone-stamp", attrs: { "aria-hidden": "true" } }, h("b", { class: /^\d+$/.test(c.stamp) ? "" : "word", text: c.stamp })),
          h("h4", { text: c.title }),
          h("p", { text: c.description }),
          h("p", { class: "milestone-count", text: c.complete ? t("Earned") : t("{n} of {total}", { n: c.n, total: c.target }) }),
        ),
      ),
    );
  }
}

