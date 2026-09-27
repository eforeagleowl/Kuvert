// Tonight's preferences and everything around the envelope: time, mood and streaming filters as chips,
// the eligible count, missing-details help, finish estimate, intermission, the saved ticket, the set-aside
// reminder, the sleepy note and the first-visit welcome.
import { $, h, icon } from "../ui/dom.js";
import { MOODS } from "../data/catalogue.js";
import { KEYS } from "../compat/keys.js";
import { clockLabel, defaultWatchDate, drawnDayLabel, isLateNight } from "../state/dates.js";
import { baseDrawFilms, missingForDraw, remainingMinutes, preferenceChips, hasActiveFilters } from "../state/draw.js";
import { allWatched } from "../state/stats.js";

export class Evening {
  constructor(app) {
    this.app = app;
    this.checking = null; // { controller } while "Check missing movie details" runs
    const store = app.store;
    for (const mood of MOODS) $("moodFilter").add(new Option(mood, mood));
    this.syncInputs();
    $("moodFilter").addEventListener("change", (e) => store.set({ moodFilter: e.target.value }));
    $("runtimeLimit").addEventListener("change", (e) => {
      store.setTimeMode(e.target.value);
      this.syncInputs();
      if (e.target.value === "finish") $("finishBy").focus();
    });
    $("finishBy").addEventListener("change", (e) => {
      store.setFinishTime(e.target.value);
      if (!e.target.value) store.set({ timeMode: "finish" });
      this.syncInputs();
    });
    $("clearFinish").addEventListener("click", () => {
      store.setFinishTime("");
      this.syncInputs();
      $("runtimeLimit").focus();
    });
    $("subscriptionOnly").addEventListener("change", (e) => {
      store.set({ subscriptionOnly: e.target.checked });
      if (e.target.checked && !(store.settings.selectedServices[store.settings.country] || []).length) app.settings.openServices();
    });
    $("changeServices").addEventListener("click", () => app.settings.openServices());
    $("clearFilters").addEventListener("click", () => {
      store.clearDrawFilters();
      this.syncInputs();
      $("search").value = "";
      $("drawSelection").checked = false;
    });
    $("adjustPreferences").addEventListener("click", () => this.setOpen($("preferencesPanel").hidden));
    $("donePreferences").addEventListener("click", () => this.setOpen(false));
    $("preferencesPanel").addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.setOpen(false);
      }
    });
    $("checkDetails").addEventListener("click", () => this.checkDetails());
    $("resumeFilm").addEventListener("click", () => app.stage.resume());
    $("keepTicket").addEventListener("click", () => {
      store.keepTicket();
      app.stage.resume();
    });
    $("putBack").addEventListener("click", () => app.stage.putBack());
    $("putBackTonight").addEventListener("click", () => app.stage.putBack());
    $("openSkipped").addEventListener("click", () => {
      const id = [...store.p.skipped].find((x) => !store.p.seen.has(x));
      if (id) app.stage.openFilm(id);
    });
    // Deadlines and availability are re-evaluated while open and on returning to the app.
    setInterval(() => !document.hidden && (store.settings.finishTime || store.settings.subscriptionOnly) && app.renderSoon(), 30000);
    document.addEventListener("visibilitychange", () => !document.hidden && app.renderSoon());
    this.welcome();
  }
  setOpen(open) {
    $("preferencesPanel").hidden = !open;
    $("adjustPreferences").setAttribute("aria-expanded", String(open));
    $("adjustPreferences").querySelector("span").textContent = open ? "Close" : "Adjust";
    if (open) $("runtimeLimit").focus({ preventScroll: true });
    else $("adjustPreferences").focus({ preventScroll: true });
  }
  syncInputs() {
    const st = this.app.store.settings;
    $("moodFilter").value = st.moodFilter;
    $("finishBy").value = st.finishTime;
    $("subscriptionOnly").checked = st.subscriptionOnly;
    $("runtimeLimit").value = st.timeMode;
    $("finishField").hidden = st.timeMode !== "finish";
  }
  formatDeadline() {
    const st = this.app.store.settings;
    return Number.isFinite(st.finishDeadline) ? clockLabel(new Date(st.finishDeadline)) : st.finishTime;
  }

  render() {
    const { store, catalog, stage, seagal } = this.app,
      st = store.settings,
      p = store.p,
      env = store.env();
    const films = baseDrawFilms(env),
      pending = films.filter((f) => missingForDraw(env, f)).length,
      units = store.units(),
      eligible = units.length,
      active = hasActiveFilters(st);
    const noTime = st.timeMode === "finish" && !st.finishTime,
      expired = !!st.finishTime && remainingMinutes(st) <= 0;
    const choices = st.selectedServices[st.country] || [],
      providers = store.caches.providerDirectories[st.country]?.providers || [];
    const labels = choices.map((id) => providers.find((x) => x.id === id)?.name || "Service " + id);
    $("servicesSummary").textContent = labels.length ? labels.join(", ") + " · " + st.country : "No services selected for " + st.country + ".";
    $("finishField").hidden = st.timeMode !== "finish";
    $("clearFinish").hidden = !st.finishTime;
    if (st.finishTime) {
      const remaining = remainingMinutes(st),
        tomorrow = new Date(st.finishDeadline).toDateString() !== new Date().toDateString();
      $("finishHint").textContent =
        remaining > 0
          ? remaining + " min available · finish " + (tomorrow ? "tomorrow " : "") + "at " + this.formatDeadline() + ". Starts now; no breaks included."
          : "This finish time has passed. Choose a new time or clear it.";
    } else $("finishHint").textContent = "Assumes you start now. An earlier time means tomorrow.";

    // Keeping progress safe: the unreadable-save notice, or a reminder to keep a copy.
    $("unreadable").hidden = !store.writeLocked;
    const remind = this.app.safekeeping.reminder();
    $("keepCopy").hidden = !remind || stage.open || !!store.writeLocked;
    if (remind) $("keepCopyText").textContent = remind + (this.app.safekeeping.canShareFile && !this.app.files.canPick ? " Send one to Notes, Files or iCloud Drive with one tap." : " A backup file takes one click.");

    // The eligible count.
    const drawWord = seagal ? (eligible === 1 ? "live target" : "live targets") : eligible === 1 ? "eligible ticket" : "eligible tickets";
    $("eligibleCount").textContent =
      eligible + " " + drawWord + (active ? this.app.sg(" · tonight’s filters apply", " · rules of engagement apply") : this.app.sg(" · drawing from all unseen films", " · all hostiles in play"));

    // Missing details for tonight's filters.
    $("metadataTools").hidden = !(this.checking || (active && (pending > 0 || eligible === 0)));
    const messages = [];
    if (noTime) messages.push("Choose a finish time in Adjust, or select Any length.");
    else if (expired) messages.push("Your finish time has passed. Adjust it to draw a film.");
    else if (st.subscriptionOnly && !choices.length && !p.shelf.size) messages.push("Choose your streaming services in Settings, or add discs to your shelf.");
    else if (active && !eligible) messages.push("No films match this combination. Adjust or clear a filter.");
    if (pending && !noTime && !expired) messages.push(pending + (pending === 1 ? " film needs details before it can enter this draw." : " films need details before they can enter this draw."));
    if (st.moodFilter && films.some((f) => !store.moodsFor(f.id).length) && !pending) messages.push("Films without mood tags are excluded. You can edit their tags in Film details.");
    if (pending && !this.app.details.connected && !noTime && !expired) messages.push("Connect TMDB in Settings to check them.");
    $("metadataHint").textContent = messages.join(" ");
    $("checkDetails").textContent = this.checking ? "Stop checking" : "Check missing movie details";
    $("checkDetails").hidden = !this.checking && (!pending || noTime || expired);

    // Preference chips.
    const chips = preferenceChips(st, catalog, () => this.formatDeadline());
    const focused = document.activeElement?.closest?.("[data-preference]")?.dataset.preference;
    $("activeChips").replaceChildren(
      ...(chips.length
        ? chips.map(({ kind, label }) =>
            h(
              "button",
              {
                class: "chip",
                type: "button",
                dataset: { preference: kind },
                attrs: { "aria-label": "Remove " + label + " filter" },
                on: {
                  click: () => {
                    store.removePreference(kind);
                    if (kind === "search") $("search").value = "";
                    this.syncInputs();
                    $("adjustPreferences").focus({ preventScroll: true });
                  },
                },
              },
              label,
              h("span", { class: "x", attrs: { "aria-hidden": "true" } }, icon("x")),
            ),
          )
        : [h("span", { class: "chip chip-quiet", text: "Any mood · Any length · All services" })]),
    );
    if (focused) $("activeChips").querySelector('[data-preference="' + focused + '"]')?.focus({ preventScroll: true });
    $("clearFilters").hidden = !chips.length;

    // Set-aside reminder.
    const skippedIds = [...p.skipped].filter((id) => !p.seen.has(id));
    $("skipReminder").hidden = !skippedIds.length;
    if (skippedIds.length) {
      $("skipReminderText").textContent =
        skippedIds.length === 1 ? "One film set aside. Watch it before setting aside another." : skippedIds.length + " skipped films in your saved progress. Watch them before setting aside another.";
      $("openSkipped").textContent = "Open " + catalog.byId.get(skippedIds[0]).t;
    }

    // On the ticket: when you'd finish if you start now, and an intermission for 3+ hour films.
    const cur = store.currentFilm;
    const onTicket = stage.mode === "tonight" && cur && stage.shown === cur && stage.open;
    const run = onTicket && !seagal ? p.runtimes[cur.id] || 0 : 0;
    $("intermission").hidden = run < 180;
    if (run >= 180) {
      const half = Math.round(run / 2),
        at = new Date(Date.now() + half * 60000);
      $("intermission").replaceChildren(h("b", { lang: "sv", text: "Paus" }), " Halfway is " + Math.floor(half / 60) + "h " + (half % 60) + "m in, around " + clockLabel(at) + " if you start now. Time for a fika.");
    }
    const end = onTicket && p.runtimes[cur.id] ? new Date(Date.now() + p.runtimes[cur.id] * 60000) : null;
    $("finishEstimate").hidden = !end;
    if (end)
      $("finishEstimate").textContent =
        this.app.sg("Start now · finishes around ", "Deploy now · extraction around ") +
        clockLabel(end) +
        (end.toDateString() !== new Date().toDateString() ? " tomorrow" : "") +
        (st.finishTime && end.getTime() > st.finishDeadline ? " · past your finish time" : "");

    // Your saved ticket (house rule: a film is pulled on the evening you watch it; an older ticket asks first).
    const resume = !!cur && !p.seen.has(cur.id) && !stage.open;
    $("resumePick").hidden = !resume;
    if (resume) {
      const stale = !!p.drawnOn && p.drawnOn < defaultWatchDate();
      $("resumePick").classList.toggle("stale", stale);
      $("resumeLabel").textContent = stale ? "Drawn " + drawnDayLabel(p.drawnOn) + " · still on for tonight?" : this.app.sg("Your saved ticket", "Active mission");
      $("resumeFilm").textContent = stale ? cur.t : this.app.sg("Continue with ", "Resume operation: ") + cur.t;
      $("staleActions").hidden = !stale;
      $("putBackTonight").hidden = stale;
    }
    $("sleepyNote").hidden = seagal || !isLateNight() || stage.open || allWatched(p, catalog);
  }

  // "Check missing movie details": three at a time, stopping after three failures.
  async checkDetails({ refresh = false } = {}) {
    const { store, details } = this.app;
    if (this.checking) {
      this.checking.controller.abort();
      return;
    }
    if (!details.connected) {
      this.app.settings.openMovieSettings();
      this.app.toast.show("Connect TMDB to check movie details.");
      return;
    }
    const env = store.env();
    const pending = baseDrawFilms(env).filter((f) => refresh || missingForDraw(env, f));
    if (!pending.length) {
      this.app.toast.show("Movie details are up to date for this selection.");
      return;
    }
    const controller = new AbortController(),
      signal = controller.signal,
      region = store.settings.country;
    this.checking = { controller };
    let next = 0,
      completed = 0,
      unresolved = 0,
      failures = 0,
      lastError = "";
    const unresolvedIds = [];
    const status = refresh ? $("serviceStatus") : $("metadataStatus");
    status.textContent = "Checking 0 of " + pending.length + " films…";
    this.app.renderSoon();
    const worker = async () => {
      while (next < pending.length && !signal.aborted && region === store.settings.country) {
        const f = pending[next++];
        try {
          const d = await details.fetchInfo(f, signal, { force: refresh || (store.settings.subscriptionOnly && !store.caches.availability[region]?.[f.id]) });
          if (signal.aborted) break;
          if (d.choices || missingForDraw(store.env(), f)) {
            unresolved++;
            unresolvedIds.push(f.id);
          }
        } catch (e) {
          if (signal.aborted) break;
          unresolved++;
          unresolvedIds.push(f.id);
          lastError = e.message;
          if (++failures >= 3) controller.abort();
        }
        completed++;
        status.textContent = "Checked " + completed + " of " + pending.length + " films…";
        this.app.renderSoon();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    this.checking = null;
    store.persist();
    status.replaceChildren(
      (signal.aborted ? "Stopped. " : "Finished. ") +
        completed +
        " of " +
        pending.length +
        " checked" +
        (unresolved ? " · " + unresolved + " unresolved. Open a film to confirm its match or edit its mood tags." : ".") +
        (lastError ? " " + lastError : ""),
      ...unresolvedIds.slice(0, 3).flatMap((id) => [" ", h("button", { class: "link", type: "button", text: "Open " + this.app.catalog.byId.get(id).t, on: { click: () => this.app.stage.openFilm(id) } })]),
    );
    this.app.renderSoon();
  }

  // The first-visit welcome card.
  welcome() {
    const { store, storage, sync } = this.app;
    let show = false;
    try {
      show = !storage?.getItem(KEYS.welcomed) && !store.p.seen.size && !store.p.current && !store.lastBackup && !sync.on;
    } catch {}
    $("welcome").hidden = !show || this.app.seagal;
    const dismiss = () => {
      try {
        storage?.setItem(KEYS.welcomed, "1");
      } catch {}
      $("welcome").hidden = true;
    };
    $("welcomeStart").addEventListener("click", () => {
      dismiss();
      $("drawBtn").focus();
    });
    $("welcomeImport").addEventListener("click", () => {
      dismiss();
      this.app.settings.open("importList");
    });
    $("welcomeTmdb").addEventListener("click", () => {
      dismiss();
      this.app.settings.open("tmdbTok");
    });
    $("welcomeSync").addEventListener("click", () => {
      dismiss();
      this.app.settings.open("syncToken");
    });
  }
}
