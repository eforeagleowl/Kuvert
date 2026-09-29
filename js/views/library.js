// The collection: every film, filters and a forgiving search, decade coverage, the shelf, skipped and
// recent views, and the watched archive with its poster wall.
import { $, h, check, mark, emptyState, keepFocus } from "../ui/dom.js";
import { imageUrl } from "../tmdb/client.js";
import { byYear, decadeOf } from "../state/catalog.js";
import { fmtWhen } from "../state/dates.js";
import { plural, ratingLabel, starText, wallFilms, watchedFilms } from "../state/stats.js";
import { t, listOf, decimal } from "../i18n/index.js";

const ARCHIVES = ["skipped", "recent", "missing", "shelf"];

export class Library {
  constructor(app) {
    this.app = app;
    this.posterRun = { controller: null, attempts: new Set(), imageFailures: new Set() };
    // Films whose TMDB search found more than one candidate: only you can pick, from the film's ticket.
    this.needsMatch = new Set();
    this.rowPosters = { observer: null, queue: [], tried: new Set(), busy: 0 };
    // Lookups that keep failing (no connection, TMDB busy or refusing) pause and try again by themselves,
    // instead of stopping for the rest of the session. `reason` is what TMDB or the network said.
    this.pause = { until: 0, streak: 0, reason: "", timer: null, tries: new Map() };
    addEventListener("online", () => this.resumeLookups());
    const store = app.store;
    $("libraryTabs").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-f]");
      if (b) store.set({ filter: b.dataset.f });
    });
    $("shelfFilters").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-s]");
      if (b) store.set({ statusFilter: store.settings.statusFilter === b.dataset.s ? null : b.dataset.s });
    });
    $("search").value = store.settings.query;
    $("search").addEventListener("input", (e) => store.set({ query: e.target.value }));
    $("drawSelection").checked = store.settings.drawSelection;
    $("drawSelection").addEventListener("change", (e) => store.set({ drawSelection: e.target.checked }));
    $("wallSort").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-sort]");
      if (b) store.set({ wallSort: b.dataset.sort });
    });
    $("loadPosters").addEventListener("click", () => this.retryPosters());
    $("watchedArchive").addEventListener("toggle", () => {
      this.render();
      this.syncPosters();
    });
  }

  // ---------------------------------------------------------------- posters
  // Library images load as they come near the screen. The app does this itself instead of leaving it to
  // the browser's lazy loading, which some browsers never start inside the folding Watched section.
  deferredImage(src, onError) {
    const img = h("img", { alt: "", decoding: "async", crossOrigin: "anonymous", dataset: { src }, on: { error: onError } });
    this.observeImage(img);
    return img;
  }
  observeImage(img) {
    if (!("IntersectionObserver" in window)) return void (img.src = img.dataset.src);
    this.imageObserver ??= new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          this.imageObserver.unobserve(e.target);
          e.target.src = e.target.dataset.src;
        }
      },
      { rootMargin: "400px 0px" },
    );
    this.imageObserver.observe(img);
  }
  // Rows are rebuilt on every render: stop watching the old images, then pick up any still waiting.
  reobserveImages() {
    this.imageObserver?.disconnect();
    for (const img of $("page-library").querySelectorAll("img[data-src]:not([src])")) this.observeImage(img);
  }
  // A small poster beside a title, from the list's own posters or once TMDB is connected. Rows keep
  // their shape while it loads.
  thumb(f) {
    const { details, store, catalog } = this.app;
    if (!details.connected && !catalog.hasPosters) return null;
    const span = h("span", { class: "thumb", dataset: { film: f.id }, attrs: { "aria-hidden": "true" } });
    const path = store.posterPath(f.id);
    if (path) span.append(this.thumbImage(path));
    else {
      span.append(mark("dala-mark", "poster-mark"));
      if (path === undefined) this.watchThumb(span);
    }
    return span;
  }
  thumbImage(path) {
    return this.deferredImage(imageUrl("w92", path), (e) => e.target.remove());
  }
  // Rows fetch their poster when they scroll into view, two at a time.
  watchThumb(span) {
    const rp = this.rowPosters;
    if (rp.tried.has(span.dataset.film) || !("IntersectionObserver" in window)) return;
    rp.observer ??= new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          rp.observer.unobserve(e.target);
          const f = this.app.catalog.byId.get(e.target.dataset.film);
          if (f && !rp.tried.has(f.id)) {
            rp.tried.add(f.id);
            rp.queue.push(f);
          }
        }
        this.pumpRows();
      },
      { rootMargin: "300px 0px" },
    );
    rp.observer.observe(span);
  }
  pumpRows() {
    const rp = this.rowPosters,
      { details, store } = this.app;
    while (rp.busy < 2 && rp.queue.length && details.connected && !this.paused()) {
      const f = rp.queue.shift();
      if (store.posterPath(f.id) !== undefined) {
        this.fillThumbs(f);
        continue;
      }
      rp.busy++;
      details
        .fetchInfo(f)
        .then((d) => {
          this.lookupWorked();
          if (d?.choices) this.needsMatch.add(f.id);
          this.fillThumbs(f);
        })
        .catch((e) => this.lookupFailed(f, e) && rp.queue.push(f))
        .finally(() => {
          rp.busy--;
          this.pumpRows();
        });
    }
  }
  paused() {
    return Date.now() < this.pause.until;
  }
  lookupWorked() {
    const pz = this.pause;
    pz.streak = 0;
    pz.reason = "";
    // TMDB is answering again: no need to wait out the rest of a pause.
    if (pz.until) this.resumeLookups();
  }
  // Three failures in a row pause every poster lookup: 30 seconds, then longer each time, up to 5 minutes.
  // Returns whether this film should be tried again later (each gets three tries a session).
  lookupFailed(f, e) {
    const pz = this.pause,
      tries = (pz.tries.get(f.id) || 0) + 1;
    pz.tries.set(f.id, tries);
    pz.reason = e?.name === "AbortError" ? t("TMDB took too long to answer.") : t(e?.message || "TMDB didn't answer.");
    if (++pz.streak % 3 === 0) {
      const wait = Math.min(300000, 30000 * 2 ** (pz.streak / 3 - 1));
      pz.until = Date.now() + wait;
      clearTimeout(pz.timer);
      pz.timer = setTimeout(() => this.resumeLookups(), wait);
      this.renderWall();
    }
    return tries < 3;
  }
  resumeLookups() {
    clearTimeout(this.pause.timer);
    this.pause.until = 0;
    this.renderWall();
    this.pumpRows();
    this.syncPosters();
  }
  fillThumbs(f) {
    const path = this.app.store.posterPath(f.id);
    if (!path) return;
    for (const span of document.querySelectorAll('.thumb[data-film="' + CSS.escape(f.id) + '"]')) if (!span.querySelector("img")) span.replaceChildren(this.thumbImage(path));
  }

  // ---------------------------------------------------------------- rows
  tick(f) {
    const seen = this.app.store.p.seen.has(f.id);
    return h(
      "button",
      {
        class: "tick",
        type: "button",
        dataset: { key: "tick-" + f.id },
        attrs: { "aria-pressed": String(seen), "aria-label": t(seen ? "Mark unwatched: {title}" : "Mark watched: {title}", { title: f.t }) },
        on: { click: () => this.app.stage.toggleSeen(f.id) },
      },
      check(),
    );
  }
  title(f, key = "title-") {
    return h("button", { class: "film-title", type: "button", text: f.t, dataset: { key: key + f.id }, on: { click: () => this.app.stage.openFilm(f.id) } });
  }
  shelfTag(f) {
    const shelf = this.app.catalog.shelfOf(f);
    return shelf ? h("span", { class: "tag " + f.s.toLowerCase(), text: t(shelf.chip) }) : h("span");
  }
  // A film row. "thumb" in `cells` becomes the poster thumbnail (when TMDB is connected).
  row(f, cells, cls = "") {
    const thumb = this.thumb(f);
    return h("li", { class: [cls, thumb ? "" : "no-thumb"].filter(Boolean).join(" ") }, cells.map((c) => (c === "thumb" ? thumb : c)));
  }

  render() {
    const { store, catalog } = this.app,
      p = store.p,
      st = store.settings;
    this.rowPosters.observer?.disconnect();
    // The missing-runtimes view opens from Settings; its tab only shows while you're in it.
    const missing = catalog.films.filter((f) => !p.runtimes[f.id]).map((f) => f.id);
    if (!missing.length && st.filter === "missing") st.filter = "unseen";
    const isArchive = ARCHIVES.includes(st.filter);
    for (const b of $("libraryTabs").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.f === st.filter));
    $("missingTab").hidden = st.filter !== "missing";
    $("skippedTab").replaceChildren(this.app.sg("Skipped", "Cowardice"), h("span", { class: "n", text: String(p.skipped.size) }));
    $("shelfTab").replaceChildren(t("Shelf"), h("span", { class: "n", text: String(p.shelf.size) }));
    $("missingTab").replaceChildren(t("Missing runtimes"), h("span", { class: "n", text: String(missing.length) }));
    $("shelfFilters").hidden = isArchive || !catalog.hasShelves;
    for (const b of $("shelfFilters").querySelectorAll("button")) {
      b.hidden = !catalog.usedShelves.has(b.dataset.s);
      if (catalog.shelves[b.dataset.s]) b.textContent = t(catalog.shelves[b.dataset.s].chip);
      b.setAttribute("aria-pressed", String(b.dataset.s === st.statusFilter));
    }
    if (document.activeElement !== $("search")) $("search").value = st.query;
    $("drawSelection").checked = st.drawSelection;

    // Decades and what's left.
    const byDec = new Map();
    for (const f of catalog.films) {
      const c = byDec.get(decadeOf(f)) || byDec.set(decadeOf(f), { t: 0, w: 0 }).get(decadeOf(f));
      c.t++;
      if (p.seen.has(f.id)) c.w++;
    }
    keepFocus(() =>
      $("decs").replaceChildren(
        ...[...byDec].sort((a, b) => a[0] - b[0]).map(([dk, c]) =>
          h(
            "button",
            {
              class: "dec",
              type: "button",
              title: t("{decade}s — {n} of {total} watched. Click to filter the list.", { decade: dk, n: c.w, total: c.t }),
              dataset: { key: "dec-" + dk },
              attrs: { "aria-pressed": String(st.decadeFilter === dk), "aria-label": t("{decade}s: {n} of {total} watched", { decade: dk, n: c.w, total: c.t }) },
              on: { click: () => store.set({ decadeFilter: st.decadeFilter === dk ? null : dk }) },
            },
            h("span", { text: "’" + String(dk).slice(2) }),
            h("span", { class: "bar" }, h("i", { style: { "--p": Math.round((c.w / c.t) * 100) + "%" } })),
            h("b", { text: c.w + "/" + c.t }),
          ),
        ),
      ),
    );
    $("decs").hidden = isArchive;
    const left = catalog.films.filter((f) => !p.seen.has(f.id));
    const parts = catalog.hasShelves
      ? Object.entries(catalog.shelves)
          .map(([k, shelf]) => [left.filter((f) => f.s === k).length, t(shelf.plural).toLowerCase()])
          .filter(([n]) => n)
          .map(([n, label]) => plural(n, label.replace(/s$/, ""), label))
      : [plural(left.length, "film")];
    $("leftline").textContent = left.length ? listOf(parts) + this.app.sg(" still to watch.", " still at large.") : t("Every film watched.");

    keepFocus(() => {
      this.renderList(isArchive);
      this.renderArchive(isArchive, missing);
      this.renderWatched();
    });
    this.renderWall();
    this.reobserveImages();
    this.syncPosters();
  }

  renderList(isArchive) {
    const { store, catalog } = this.app,
      p = store.p,
      st = store.settings,
      q = st.query.trim();
    $("list").hidden = isArchive;
    if (isArchive) return;
    const rows = catalog.films
      .filter((f) => {
        if (st.filter === "unseen" && (p.seen.has(f.id) || p.skipped.has(f.id))) return false;
        if (st.statusFilter && f.s !== st.statusFilter) return false;
        if (st.decadeFilter !== null && decadeOf(f) !== st.decadeFilter) return false;
        if (q && !catalog.matchesSearch(f, q)) return false;
        return true;
      })
      .sort(byYear);
    if (!rows.length) {
      $("list").replaceChildren(
        q
          ? emptyState(t("No title matches “{q}”", { q }), t("Try part of the title, a year, or a nickname like lotr."))
          : st.filter === "unseen"
            ? emptyState(t("Nothing left here"), t("Every film that matches these filters is watched or set aside."), { label: t("Show all films"), run: () => store.set({ filter: "all" }) })
            : emptyState(t("Nothing matches these filters")),
      );
      return;
    }
    $("list").replaceChildren(...rows.map((f) => this.row(f, [this.tick(f), "thumb", this.title(f), this.shelfTag(f), h("span", { class: "yr", text: String(f.y) })], p.seen.has(f.id) ? "done" : "")));
  }

  renderArchive(isArchive, missingIds) {
    const { store, catalog } = this.app,
      p = store.p,
      st = store.settings,
      q = st.query.trim();
    const list = $("shortcutsList");
    list.hidden = !isArchive;
    $("archiveHint").hidden = !isArchive;
    if (!isArchive) return;
    const source =
      st.filter === "skipped"
        ? catalog.films.filter((f) => p.skipped.has(f.id)).map((f) => f.id)
        : st.filter === "recent"
          ? p.recent
          : st.filter === "shelf"
            ? [...catalog.films].sort((a, b) => a.y - b.y).filter((f) => p.shelf.has(f.id)).map((f) => f.id)
            : missingIds;
    const ids = source.filter((id) => !q || catalog.matchesSearch(catalog.byId.get(id), q));
    $("archiveHint").textContent = t(
      st.filter === "skipped"
        ? "Watch your skipped film before skipping another. Open it here and mark it watched when you finish. Older backups with several skips must be cleared by watching those films."
        : st.filter === "recent"
          ? "Your last five picks. Open a movie to return to it directly."
          : st.filter === "shelf"
            ? "Films you own on disc. With “What I can watch tonight” on, these always count as available. Search to add more, or tap “I own this on disc” on any ticket."
            : "These movies do not yet have a saved runtime, including watched films. Open one to fetch its details, then use Change movie match if TMDB chose the wrong film.",
    );
    // On the shelf view a search also offers films to add.
    const addable = st.filter === "shelf" && q ? catalog.films.filter((f) => !p.shelf.has(f.id) && catalog.matchesSearch(f, q)).slice(0, 12) : [];
    if (!ids.length && !addable.length) {
      list.replaceChildren(
        emptyState(
          t(
            q
            ? "No titles match your search."
            : st.filter === "skipped"
              ? "No skipped movies yet."
              : st.filter === "recent"
                ? "Your recent picks will appear here."
                : st.filter === "shelf"
                  ? "No discs yet. Search above to add films you own."
                  : "Every available movie has a saved runtime.",
          ),
        ),
      );
      return;
    }
    list.replaceChildren(
      ...addable.map((f) =>
        h(
          "li",
          {},
          h("div", { class: "archive-main" }, h("span", { class: "film-title", text: f.t }), h("span", { class: "archive-meta", text: f.y + t(" · not on your shelf") })),
          h("button", {
            class: "btn btn-sm",
            type: "button",
            text: t("Add to shelf"),
            dataset: { key: "shelfadd-" + f.id },
            attrs: { "aria-label": t("Add {title} to your shelf", { title: f.t }) },
            on: { click: () => this.app.toggleShelf(f.id) },
          }),
          h("span"),
        ),
      ),
      ...ids.map((id) => {
        const f = catalog.byId.get(id);
        const meta = f.y + (p.seen.has(id) ? t(" · Watched") : p.skipped.has(id) ? t(" · Skipped") : "") + (p.runtimes[id] ? " · " + p.runtimes[id] + " min" : "");
        const extra =
          st.filter === "shelf"
            ? h("button", { class: "btn btn-sm", type: "button", text: t("Remove"), dataset: { key: "shelfoff-" + id }, attrs: { "aria-label": t("Take {title} off your shelf", { title: f.t }) }, on: { click: () => this.app.toggleShelf(id) } })
            : p.seen.has(id)
              ? h("button", { class: "btn btn-sm", type: "button", text: t(p.reviews[id] ? "Edit note" : "Add note"), on: { click: () => this.app.dialogs.editReview(id) } })
              : h("span");
        return h(
          "li",
          {},
          h("div", { class: "archive-main" }, this.title(f, "open-"), h("span", { class: "archive-meta", text: meta })),
          h("button", { class: "btn btn-sm", type: "button", text: t("Open"), dataset: { key: "direct-" + id }, attrs: { "aria-label": t("Open {title}", { title: f.t }) }, on: { click: () => this.app.stage.openFilm(id) } }),
          extra,
        );
      }),
    );
  }

  renderWatched() {
    const { store, catalog } = this.app,
      p = store.p;
    const watched = watchedFilms(p, catalog);
    $("seenCount").textContent = String(watched.length);
    if (!watched.length) {
      $("seenList").replaceChildren(emptyState(t("Nothing watched yet"), this.app.sg("Films you mark watched collect here, like stubs in a shoebox.", "Films you mark watched collect here.")));
      return;
    }
    $("seenList").replaceChildren(
      ...watched.map((f) => {
        const r = p.reviews[f.id];
        return this.row(f, [
          this.tick(f),
          "thumb",
          this.title(f),
          h("span", { class: "yr", text: String(f.y) }),
          h("button", {
            class: "when",
            type: "button",
            text: p.dates[f.id] ? fmtWhen(p.dates[f.id]) : t("+ date"),
            title: t("Edit watch date"),
            dataset: { key: "date-" + f.id },
            attrs: { "aria-label": t("Edit watch date for {title}", { title: f.t }) },
            on: { click: () => this.app.dialogs.editDate(f.id) },
          }),
          h("button", {
            class: "btn btn-sm btn-quiet",
            type: "button",
            text: r ? (r.rating ? ratingLabel(r.rating) + t(" · Note") : t("Edit note")) : t("Add note"),
            dataset: { key: "review-" + f.id },
            attrs: { "aria-label": t("Movie note for {title}", { title: f.t }) },
            on: { click: () => this.app.dialogs.editReview(f.id) },
          }),
        ]);
      }),
    );
  }

  // ---------------------------------------------------------------- the poster wall
  wallVisible() {
    return $("watchedArchive").open && !$("page-library").hidden;
  }
  renderWall() {
    const { store, catalog, details } = this.app,
      p = store.p,
      pr = this.posterRun;
    const films = wallFilms(p, catalog, store.settings.wallSort),
      wall = $("posterWall"),
      ranked = p.rankings.filter((id) => p.seen.has(id));
    $("posterWallHeading").hidden = !films.length;
    wall.hidden = !films.length;
    for (const b of $("wallSort").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.sort === store.settings.wallSort));
    const existing = new Map([...wall.children].map((el) => [el.dataset.film, el]));
    const nodes = films.map((f) => {
      let tile = existing.get(f.id);
      if (!tile) {
        tile = h(
          "button",
          { class: "wall-film", type: "button", dataset: { film: f.id, key: "wall-" + f.id }, on: { click: () => this.app.stage.openFilm(f.id) } },
          h("span", { class: "wall-art", attrs: { "aria-hidden": "true" } }, mark("dala-mark", "poster-mark"), h("span", { class: "wall-rank" })),
          h("span", { class: "wall-caption", text: f.t }),
          h("span", { class: "wall-year" }),
        );
      }
      const r = p.reviews[f.id]?.rating,
        at = ranked.indexOf(f.id);
      tile.querySelector(".wall-year").textContent = (r ? starText(r) + " · " : "") + f.y;
      const badge = tile.querySelector(".wall-rank");
      badge.textContent = at >= 0 ? "#" + (at + 1) : "";
      badge.hidden = store.settings.wallSort !== "rank" || at < 0;
      tile.setAttribute("aria-label", t("Open your ticket for {title}, {year}", { title: f.t, year: f.y }) + (r ? t(", {n} stars", { n: decimal(r) }) : "") + (at >= 0 ? t(", ranked {n}", { n: at + 1 }) : ""));
      const path = store.posterPath(f.id) || "";
      if (tile.dataset.poster !== path) {
        tile.dataset.poster = path;
        pr.imageFailures.delete(f.id);
        tile.querySelector("img")?.remove();
        if (path)
          tile.querySelector(".wall-art").append(
            this.deferredImage(imageUrl("w342", path), (e) => {
              if (tile.dataset.poster !== path) return;
              pr.imageFailures.add(f.id);
              e.target.remove();
              this.renderWall();
            }),
          );
      }
      return tile;
    });
    if (nodes.length !== wall.children.length || nodes.some((n, i) => wall.children[i] !== n)) keepFocus(() => wall.replaceChildren(...nodes));
    const count = films.filter((f) => store.posterPath(f.id) && !pr.imageFailures.has(f.id)).length;
    const unmatched = new Set(films.filter((f) => store.posterPath(f.id) === undefined && this.needsMatch.has(f.id)).map((f) => f.id));
    const pending = films.filter((f) => store.posterPath(f.id) === undefined && !unmatched.has(f.id)).length;
    for (const tile of wall.children) tile.title = unmatched.has(tile.dataset.film) ? "Open to pick the right movie for its poster" : "";
    const paused = this.paused() && pending > 0;
    $("posterWallStatus").textContent = paused
      ? t("{n} of {posters} · Paused: {reason} Trying again shortly.", { n: count, posters: plural(films.length, "poster"), reason: this.pause.reason })
      : pr.controller
        ? t("Collecting posters…")
        : !details.connected && !catalog.hasPosters
          ? t("Connect TMDB in Settings for posters.")
          : t("{n} of {posters}", { n: count, posters: plural(films.length, "poster") }) +
            (unmatched.size ? t(unmatched.size === 1 ? " · 1 needs you to pick the right movie: open it to choose" : " · {n} need you to pick the right movie: open it to choose", { n: unmatched.size }) : "");
    $("loadPosters").hidden = (!details.connected || !pending) && !films.some((f) => pr.imageFailures.has(f.id));
    $("loadPosters").disabled = !!pr.controller;
    $("loadPosters").textContent = t(pr.controller ? "Loading posters…" : "Retry missing posters");
  }
  stopPosters() {
    const pr = this.posterRun;
    if (!pr.controller) return;
    pr.controller.abort();
    pr.controller = null;
    this.renderWall();
  }
  retryPosters() {
    const pr = this.posterRun;
    pr.attempts.clear();
    this.pause.tries.clear();
    this.pause.streak = 0;
    for (const tile of $("posterWall").children) if (pr.imageFailures.has(tile.dataset.film)) delete tile.dataset.poster;
    pr.imageFailures.clear();
    this.resumeLookups();
  }
  // While the archive is open, posters for watched films are fetched two at a time.
  async syncPosters() {
    const { store, catalog, details } = this.app,
      pr = this.posterRun;
    if (!this.wallVisible() || !details.connected) return this.stopPosters();
    if (pr.controller || this.paused()) return;
    const queue = watchedFilms(store.p, catalog).filter((f) => store.posterPath(f.id) === undefined && !pr.attempts.has(f.id));
    if (!queue.length) return;
    const controller = new AbortController();
    pr.controller = controller;
    this.renderWall();
    const worker = async () => {
      while (queue.length && !controller.signal.aborted && !this.paused()) {
        const f = queue.shift();
        if (!store.p.seen.has(f.id)) continue;
        try {
          const d = await details.fetchInfo(f, controller.signal);
          if (controller.signal.aborted) return;
          if (d?.choices) this.needsMatch.add(f.id);
          pr.attempts.add(f.id);
          this.lookupWorked();
          this.renderWall();
        } catch (e) {
          if (controller.signal.aborted) return;
          if (!this.lookupFailed(f, e)) pr.attempts.add(f.id);
        }
      }
    };
    try {
      await Promise.all([worker(), worker()]);
    } finally {
      if (pr.controller === controller) {
        pr.controller = null;
        this.renderWall();
        this.syncPosters();
      }
    }
  }
}

