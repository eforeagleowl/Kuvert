// Settings: your data (sync, backup file, progress code, reset), movie details from TMDB (the credential,
// loading details for every film, streaming country and services), lists and imports, sound, and About.
import { $, h, copyText } from "../ui/dom.js";
import { KEYS } from "../compat/keys.js";
import { KUVERT } from "../data/catalogue.js";
import { readCustomLists, writeCustomLists, exportableList } from "../data/lists.js";
import { download } from "../storage/files.js";
import { readLetterboxd, letterboxdPlan, listRowsFromText } from "../import/importers.js";
import { progressSignature } from "../compat/serialize.js";
import { soundsOn } from "../ui/sounds.js";
import { plural } from "../state/stats.js";

export const APP_VERSION = "4.0";
export const BUILT = "27 Sep 2026";

export class Settings {
  constructor(app) {
    this.app = app;
    this.loader = null; // { controller } while loading details for every film
    this.providerRun = 0;
    this.providerLoading = false;
    const on = (id, fn, type = "click") => $(id).addEventListener(type, fn);
    const { store, files, sync, dialogs, storage } = app;

    // ------------------------------------------------ sync
    on("syncConnect", () => this.connectSync());
    on("syncToken", (e) => e.key === "Enter" && this.connectSync(), "keydown");
    on("syncNow", () => this.syncNow());
    on("syncDisconnect", async () => {
      const ok = await dialogs.confirm({
        title: "Turn off sync on this device?",
        text: "Your progress stays in this browser and in the gist. You can reconnect with the same token later.",
        confirm: "Turn off sync",
      });
      if (ok) sync.disconnect();
    });
    sync.addEventListener("change", () => this.renderSync());
    document.addEventListener("visibilitychange", () => !document.hidden && this.syncNow({ quiet: true }));
    window.addEventListener("online", () => this.syncNow({ quiet: true }));

    // ------------------------------------------------ backup file and code
    $("fhint").textContent = files.canPick ? "After the first backup, Kuvert keeps that file up to date." : "Download a backup to move to another device or keep an extra copy.";
    on("saveFile", async () => {
      if (app.store.writeLocked) return app.toast.show("Restore a backup or start fresh first: Kuvert couldn't read this browser's save.");
      const out = await files.save();
      if (out === "download") app.toast.show("Progress backup download requested.");
      this.renderBackup();
    });
    // The share sheet, where there is one: Notes, Files, iCloud Drive, Mail.
    $("shareCopy").hidden = !app.safekeeping.canShareFile;
    on("shareCopy", async () => {
      const r = await app.safekeeping.saveCopy({ share: true });
      if (r) app.toast.show("Copy saved. Keep it somewhere you'll find it.");
      this.renderBackup();
    });
    on("openFile", async () => {
      try {
        const picked = await files.pick();
        if (!picked) return;
        if (!picked.file) return $("fileInput").click();
        await dialogs.readProgress(picked.file, picked.handle);
      } catch (e) {
        app.toast.show(e.message || "Could not load that file.");
      }
    });
    on(
      "fileInput",
      async (e) => {
        const f = e.target.files?.[0];
        try {
          if (f) await dialogs.readProgress(f);
        } catch (err) {
          app.toast.show(err.message || "Could not read that backup.");
        }
        e.target.value = "";
      },
      "change",
    );
    on("reconnect", async () => {
      try {
        const got = await files.reconnect();
        if (got) await dialogs.readProgress(got.file, got.handle);
      } catch (e) {
        app.toast.show(e.message?.startsWith("File access") ? e.message : "Could not reconnect. Use Load progress to select the file again.");
      }
    });
    files.remembered().then((h) => {
      if (h && !files.handle) {
        $("reconnect").textContent = "Reconnect " + h.name;
        $("reconnect").hidden = false;
      }
    });
    files.addEventListener("change", () => app.renderSoon());
    on("copyCode", async () => {
      const ok = await copyText(store.code(), null);
      if (ok) app.toast.show("Progress code copied.");
      else {
        $("code").focus();
        $("code").select();
        app.toast.show("Select and copy the progress code.");
      }
    });
    on("loadCode", () => dialogs.openCode());
    on("resetBtn", async () => {
      const ok = await dialogs.confirm({
        title: "Clear all progress?",
        text: "This removes every watched mark, date, note, ranking and verdict for " + app.list.name + ". You can undo it straight after.",
        confirm: "Clear all progress",
        danger: true,
      });
      if (!ok) return;
      const undo = store.reset();
      app.stage.syncPick();
      app.toast.show("Progress cleared.", undo);
    });

    // ------------------------------------------------ TMDB
    on("tmdbSave", () => this.connectTmdb());
    on("tmdbTok", (e) => e.key === "Enter" && this.connectTmdb(), "keydown");
    on("tmdbClear", () => {
      this.loader?.controller.abort();
      this.providerRun++;
      this.providerLoading = false;
      app.library.stopPosters();
      app.details.cache.clear();
      store.setTmdbToken(null);
      $("tmdbTok").value = "";
      this.renderTmdb();
      app.stage.showInfo(app.stage.shown);
      app.renderSoon();
      app.toast.show("Disconnected. Older backups made by the original app may still contain your credential.");
    });
    on("loadAll", () => this.loadAll());
    on("showMissing", () => {
      store.set({ filter: "missing" });
      app.router.show("library");
    });
    on(
      "country",
      (e) => {
        store.set({ country: e.target.value });
        this.renderServices();
        if ($("servicesPanel").open) this.loadServices();
        if (app.stage.shown) app.stage.showInfo(app.stage.shown);
      },
      "change",
    );
    on("servicesPanel", () => $("servicesPanel").open && (this.renderServices(), app.details.connected && this.loadServices()), "toggle");
    on("serviceSearch", () => this.renderServices(), "input");
    on("loadServices", () => this.loadServices(true));
    on("refreshAvailability", () => app.evening.checkDetails({ refresh: true }));

    // ------------------------------------------------ lists and imports
    on("listSelect", (e) => this.switchList(e.target.value), "change");
    on("importList", () => $("listFile").click());
    on(
      "listFile",
      async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        try {
          if (f.size > 5_000_000) throw Error("That file is too large for a movie list.");
          dialogs.listDraft(listRowsFromText(await f.text(), f.name));
        } catch (err) {
          app.toast.show(err.message || "That list could not be read.");
        }
      },
      "change",
    );
    on("exportList", () => {
      const { fileName, body } = exportableList(app.list);
      download(JSON.stringify(body, null, 2), fileName);
      app.toast.show("List exported as " + fileName + ".");
    });
    on("deleteList", async () => {
      if (!app.list.custom) return;
      const ok = await dialogs.confirm({
        title: "Delete " + app.list.name + "?",
        text: "This removes the list and its progress from this browser. Back up your progress first if you might want it again.",
        confirm: "Delete list",
        danger: true,
      });
      if (!ok) return;
      const lists = readCustomLists(storage);
      delete lists[app.list.id];
      writeCustomLists(storage, lists);
      try {
        storage.removeItem(app.list.storageKey);
      } catch {}
      storage.setItem(KEYS.activeList, "builtin");
      location.reload();
    });
    on("lbxChoose", () => $("lbxFile").click());
    on(
      "lbxFile",
      async (e) => {
        const chosen = [...(e.target.files || [])];
        e.target.value = "";
        if (!chosen.length) return;
        $("lbxStatus").textContent = "Reading your export…";
        try {
          const result = await readLetterboxd(chosen, app.catalog.films);
          $("lbxStatus").textContent = "";
          dialogs.letterboxd(letterboxdPlan(result, store.p), result.unmatched, (changes) => {
            const { undo, n } = store.applyLetterboxd(changes);
            $("lbxStatus").textContent = "Imported " + n + " changes from Letterboxd.";
            app.toast.show("Letterboxd import finished: " + n + " changes.", undo);
          });
        } catch (err) {
          $("lbxStatus").textContent = err.message || "That file could not be read.";
        }
      },
      "change",
    );

    // ------------------------------------------------ sound and About
    $("paperSounds").checked = soundsOn(storage);
    on(
      "paperSounds",
      (e) => {
        try {
          storage.setItem(KEYS.sounds, e.target.checked ? "on" : "off");
        } catch {}
        if (e.target.checked) app.play("stamp");
      },
      "change",
    );
    $("aboutVersion").textContent = APP_VERSION + " · built " + BUILT;
    on("aboutLink", () => this.open("aboutSection"));
    this.renderLists();
    this.renderTmdb();
    this.renderSync();
    if (app.details.connected) this.loadCountries();
  }

  /** Opens Settings, optionally scrolled to and focused on one control. */
  open(focusId = null) {
    if (focusId && !$(focusId)) focusId = null;
    this.app.router.show("settings", { focus: !focusId });
    if (focusId) {
      requestAnimationFrame(() => {
        const el = $(focusId);
        el?.scrollIntoView({ block: el.matches("section") ? "start" : "center" });
        el?.focus({ preventScroll: true });
      });
    }
  }
  openMovieSettings() {
    this.open(this.app.details.connected ? "country" : "tmdbTok");
  }
  openServices() {
    if (!this.app.details.connected) return this.open("tmdbTok");
    $("servicesPanel").open = true;
    this.open("serviceSearch");
  }

  render() {
    this.renderBackup();
    this.renderLoader();
    this.renderSync();
    $("code").value = this.app.store.code();
  }

  // ------------------------------------------------ backup status and the save line
  renderBackup() {
    const { store, sync, files } = this.app;
    const last = store.lastBackup;
    const stale = !last || last.signature !== progressSignature(store.data());
    let text = !last
      ? "No file backup yet. Back up progress to keep an extra copy."
      : (last.kind === "download" ? "Last backup download: " : "Last file backup: ") + new Date(last.at).toLocaleString() + (stale ? " · Your progress has newer changes." : " · Up to date.");
    let warn = stale;
    // With sync on, the gist is a second copy, so the file backup stops nagging.
    if (sync.on && sync.last) {
      text = "Sync keeps a copy in your gist (last synced " + new Date(sync.last.at).toLocaleString() + "). A file backup is optional." + (last ? " " + text : "");
      warn = false;
    }
    $("backupStatus").textContent = text;
    $("storageStatus").textContent = this.app.safekeeping.statusText();
    $("backupStatus").classList.toggle("warn", warn);
    const line = $("saveState");
    line.textContent = this.app.seagal ? files.message().replace(/Saved in this browser/, "Intel secured").replace(/ watched/, " neutralized") : files.message();
    line.classList.toggle("warn", files.warn || store.dirty);
  }

  // ------------------------------------------------ sync
  async connectSync() {
    const token = $("syncToken").value.trim();
    if (!token) return;
    $("syncConnect").disabled = true;
    this.renderSync("Connecting to GitHub…");
    try {
      await this.app.sync.connect(token);
      $("syncToken").value = "";
      await this.syncNow();
      if (!this.app.sync.error) this.app.toast.show("Sync is on. Connect your other device with the same token.");
    } catch (e) {
      this.app.sync.error = e.message;
      this.renderSync();
    } finally {
      $("syncConnect").disabled = false;
    }
  }
  async syncNow({ quiet = false } = {}) {
    const r = await this.app.sync.syncNow({ quiet });
    if (!r) return;
    if (r.error) return this.app.toast.show("Sync didn't finish: " + r.error);
    this.app.stage.syncPick();
    this.app.toast.show(r.applied === "merge" ? "Synced: merged changes from both devices." : "Synced progress from your other device.", r.undo);
  }
  renderSync(busyText = "") {
    const { sync, store } = this.app;
    $("syncSetup").hidden = sync.on;
    $("syncActions").hidden = !sync.on;
    $("syncNow").disabled = sync.busy;
    const last = sync.last;
    $("syncState").textContent =
      busyText ||
      (sync.busy
        ? "Syncing…"
        : sync.error
          ? "Sync problem: " + sync.error
          : sync.on
            ? last
              ? "Sync is on. Last synced " + new Date(last.at).toLocaleString() + (last.signature !== store.signature() ? " · changes waiting to upload." : ".")
              : "Sync is on."
            : "Keep your devices in step through a secret GitHub Gist. It's unlisted: only someone with its exact link can open it.");
    $("syncState").classList.toggle("warn", !!sync.error);
  }

  // ------------------------------------------------ TMDB
  renderTmdb() {
    const on = this.app.details.connected;
    $("tmdbConnectRow").hidden = on;
    $("tmdbHelp").hidden = on;
    $("tmdbConnected").hidden = !on;
    $("tmdbState").textContent = on ? "Connected. Streaming availability comes from JustWatch via TMDB." : "Optional. Adds the poster, runtime and where to stream each film.";
  }
  async connectTmdb() {
    const { store, details, stage } = this.app;
    const value = $("tmdbTok").value.trim();
    if (!value) return;
    const before = store.tmdbToken;
    store.tmdbToken = value;
    $("tmdbSave").disabled = true;
    $("tmdbState").textContent = "Checking…";
    try {
      await details.call("/configuration");
      store.setTmdbToken(value);
      $("tmdbTok").value = "";
      this.renderTmdb();
      if (stage.shown) stage.showInfo(stage.shown);
      this.loadCountries();
      if ($("servicesPanel").open) this.loadServices();
      this.app.renderSoon();
    } catch (e) {
      store.tmdbToken = before;
      $("tmdbState").textContent = e.name === "AbortError" ? "Connection timed out. Try again." : e.message;
    } finally {
      $("tmdbSave").disabled = false;
    }
  }
  async loadCountries() {
    try {
      const countries = await this.app.details.countries();
      if (!countries) return;
      const current = this.app.store.settings.country;
      $("country").replaceChildren(...countries.map((c) => new Option(c.english_name, c.iso_3166_1)));
      if (!countries.some((c) => c.iso_3166_1 === current)) $("country").add(new Option(current, current));
      $("country").value = current;
    } catch {
      // The countries already listed stay usable.
    }
  }
  renderServices() {
    const { store, details } = this.app,
      st = store.settings,
      region = st.country;
    const query = $("serviceSearch").value.trim().toLowerCase();
    const all = store.caches.providerDirectories[region]?.providers || [],
      selected = st.selectedServices[region] || [];
    const providers = [...all, ...selected.filter((id) => !all.some((p) => p.id === id)).map((id) => ({ id, name: "Saved service " + id }))];
    providers.sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)) || a.name.localeCompare(b.name));
    const shown = providers.filter((p) => p.name.toLowerCase().includes(query));
    $("serviceChoices").replaceChildren(
      ...(shown.length
        ? shown.map((provider) =>
            h(
              "label",
              { class: "service-choice" },
              h("input", {
                type: "checkbox",
                value: String(provider.id),
                checked: selected.includes(provider.id),
                on: {
                  change: (e) => {
                    const ids = new Set(st.selectedServices[region] || []);
                    e.target.checked ? ids.add(provider.id) : ids.delete(provider.id);
                    store.set({ selectedServices: { ...st.selectedServices, [region]: [...ids] } });
                  },
                },
              }),
              provider.name,
            ),
          )
        : [h("p", { class: "fine", text: all.length ? "No service matches that search." : details.connected ? "Load the service list for " + region + "." : "Connect TMDB in Settings to load services." })]),
    );
    $("servicesCountry").textContent = "Services in " + region + " · uses your streaming country above";
    $("loadServices").textContent = all.length ? "Refresh services" : "Load services";
    $("loadServices").disabled = this.providerLoading;
    $("refreshAvailability").disabled = !!this.app.evening.checking;
  }
  async loadServices(force = false) {
    const { store, details } = this.app;
    if (!details.connected) {
      this.openMovieSettings();
      return this.app.toast.show("Connect TMDB to choose your streaming services.");
    }
    const region = store.settings.country,
      cached = store.caches.providerDirectories[region];
    if (!force && cached && Date.now() - cached.at < 7 * 24 * 60 * 60 * 1000) return this.renderServices();
    const run = ++this.providerRun;
    this.providerLoading = true;
    $("serviceStatus").textContent = "Loading services for " + region + "…";
    this.renderServices();
    try {
      const providers = await details.providers(region);
      if (run !== this.providerRun || region !== store.settings.country) return;
      store.setProviderDirectory(region, providers);
      $("serviceStatus").textContent = providers.length ? "Services updated. Choose the subscriptions you have." : "No services are listed for this country.";
    } catch (e) {
      if (run === this.providerRun) $("serviceStatus").textContent = e.name === "AbortError" ? "Service list timed out. Try again." : e.message;
    } finally {
      if (run === this.providerRun) {
        this.providerLoading = false;
        this.renderServices();
        this.app.renderSoon();
      }
    }
  }

  // ------------------------------------------------ details for the whole list
  detailsLoaded(f) {
    const p = this.app.store.p;
    return p.runtimes[f.id] > 0 && p.posterPaths[f.id] !== undefined && Object.hasOwn(p.moodSuggestions, f.id);
  }
  renderLoader() {
    const { catalog, details, store } = this.app;
    const done = catalog.films.filter((f) => this.detailsLoaded(f)).length,
      missing = catalog.films.filter((f) => !store.p.runtimes[f.id]).length;
    $("loaderStatus").textContent = details.connected
      ? "Loaded for " + done + " of " + catalog.films.length + " films. Time and mood filters only use films with details."
      : "Connect TMDB above to load posters, runtimes and moods for every film at once.";
    $("loaderMeter").style.setProperty("--p", (done / catalog.films.length) * 100 + "%");
    $("loadAll").textContent = this.loader ? "Stop loading" : done === catalog.films.length ? "Refresh every film" : "Load details for every film";
    $("loadAll").disabled = !details.connected && !this.loader;
    $("showMissing").hidden = !!this.loader || !missing || missing === catalog.films.length;
    $("showMissing").textContent = "Show the " + plural(missing, "film") + " still missing a runtime";
  }
  async loadAll() {
    const { catalog, details, store } = this.app;
    if (this.loader) return this.loader.controller.abort();
    if (!details.connected) return this.open("tmdbTok");
    const everything = catalog.films.every((f) => this.detailsLoaded(f));
    const queue = catalog.films.filter((f) => everything || !this.detailsLoaded(f));
    if (!queue.length) return;
    const controller = new AbortController(),
      signal = controller.signal;
    this.loader = { controller };
    let next = 0,
      completed = 0,
      failures = 0,
      lastError = "";
    const unresolved = [];
    this.renderLoader();
    $("loaderProgress").textContent = "Loading 0 of " + queue.length + "…";
    const worker = async () => {
      while (next < queue.length && !signal.aborted) {
        const f = queue[next++];
        try {
          const d = await details.fetchInfo(f, signal, { force: everything });
          if (d?.choices) unresolved.push(f);
          failures = 0;
        } catch (e) {
          if (signal.aborted) break;
          lastError = e.message;
          unresolved.push(f);
          if (++failures >= 4) controller.abort();
        }
        completed++;
        $("loaderProgress").textContent = "Loading " + completed + " of " + queue.length + "…";
        this.renderLoader();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    this.loader = null;
    store.save("details"); // runtimes and matches travel with sync and backups
    $("loaderProgress").replaceChildren(
      (signal.aborted ? "Stopped after " : "Finished: ") +
        completed +
        " of " +
        queue.length +
        " checked." +
        (unresolved.length ? " " + plural(unresolved.length, "film needs", "films need") + " a match choice." : "") +
        (lastError && signal.aborted ? " " + lastError : ""),
      ...unresolved.slice(0, 5).flatMap((f) => [" ", h("button", { class: "link", type: "button", text: "Match " + f.t, on: { click: () => this.app.stage.openFilm(f.id) } })]),
    );
    this.renderLoader();
  }

  // ------------------------------------------------ lists
  renderLists() {
    const { list, storage } = this.app;
    const lists = readCustomLists(storage);
    $("listSelect").replaceChildren(new Option(KUVERT.name + " (built-in)", "builtin"), ...Object.values(lists).map((l) => new Option(l.name + " · " + l.films.length + " films", l.id)));
    $("listSelect").value = list.id;
    $("deleteList").hidden = !list.custom;
  }
  async switchList(id) {
    const { list, store, dialogs, storage } = this.app;
    if (id === list.id) return;
    if (store.dirty) {
      const ok = await dialogs.confirm({ title: "Switch lists?", text: "Some changes couldn't be saved in this browser. Back up your progress first, or switch anyway.", confirm: "Switch anyway" });
      if (!ok) {
        $("listSelect").value = list.id;
        return;
      }
    }
    storage.setItem(KEYS.activeList, id);
    location.reload();
  }
}
