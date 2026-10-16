// Sync between devices through a secret (unlisted) GitHub Gist. Each person brings their own GitHub token;
// it stays in this browser. One gist holds one file per movie list.
//
// On each sync, using the state both sides had at the last sync:
//   only this device changed  → upload
//   only the other changed    → take the other device's progress (undo is offered)
//   both changed              → merge film by film (the newest change to each film wins) and upload
import { KEYS, GIST } from "../compat/keys.js";
import { validateProgress } from "../compat/validate.js";
import { progressSignature } from "../compat/serialize.js";
import { t } from "../i18n/index.js";

export class Sync extends EventTarget {
  /** @param {{ store: import("../state/store.js").Store, storage: Storage, fetch?: typeof fetch }} o */
  constructor({ store, storage, fetch = globalThis.fetch.bind(globalThis) }) {
    super();
    this.store = store;
    this.storage = storage;
    this.fetch = fetch;
    this.cfg = this.read();
    this.busy = false;
    this.timer = null;
    this.error = "";
    this.applying = false;
    this.warning = "";
    this.conflicts = [];
    this.activeConnection = null;
  }
  read() {
    try {
      const c = JSON.parse(this.storage.getItem(KEYS.sync) || "null");
      return c && typeof c.token === "string" ? { last: {}, ...c } : { token: "", gistId: "", last: {} };
    } catch {
      return { token: "", gistId: "", last: {} };
    }
  }
  write() {
    try {
      // A different list/tab can have recorded its sync while this request was in flight.
      const latest = this.read();
      if (latest.token === this.cfg.token && latest.gistId === this.cfg.gistId) this.cfg.last = { ...latest.last, ...this.cfg.last };
      this.storage.setItem(KEYS.sync, JSON.stringify(this.cfg));
    } catch {}
  }
  get on() {
    return !!(this.cfg.token && this.cfg.gistId);
  }
  get file() {
    return GIST.file(this.store.list.id);
  }
  get last() {
    return this.cfg.last[this.file] || null;
  }
  changed() {
    this.dispatchEvent(new Event("change"));
  }

  async gh(path, { method = "GET", body, token = this.cfg.token } = {}) {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 20000);
    try {
      const r = await this.fetch("https://api.github.com" + path, {
        method,
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (r.status === 401) throw Error(t("GitHub didn't accept that token. Check it hasn't expired."));
      if (r.status === 403 || r.status === 404) throw Error(t("The token can't read and write Gists. Use a classic token with the gist scope and try again."));
      if (!r.ok) throw Error(t("GitHub is unavailable right now ({status}). Try again in a moment.", { status: r.status }));
      return r.status === 204 ? null : await r.json();
    } catch (e) {
      if (e.name === "AbortError") throw Error(t("GitHub took too long to answer. Try again."));
      if (e instanceof TypeError) throw Error(t("Couldn't reach GitHub. Check your connection."));
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  async findOrCreateGist(token) {
    for (let page = 1; page <= 10; page++) {
      const list = await this.gh("/gists?per_page=100&page=" + page, { token });
      const hit = list.find((g) => g.files && g.files[GIST.note]);
      if (hit) return hit.id;
      if (list.length < 100) break;
    }
    const g = await this.gh("/gists", {
      method: "POST",
      token,
      body: { description: GIST.description, public: false, files: { [GIST.note]: { content: GIST.noteText } } },
    });
    return g.id;
  }
  async readRemote() {
    this.assertConnection();
    const g = await this.gh("/gists/" + this.cfg.gistId);
    this.assertConnection();
    const f = g.files?.[this.file];
    if (!f) return null;
    const text = f.truncated ? await (await this.fetch(f.raw_url, { cache: "no-store" })).text() : f.content;
    this.assertConnection();
    return JSON.parse(text);
  }
  async writeRemote(data) {
    this.assertConnection();
    await this.gh("/gists/" + this.cfg.gistId, { method: "PATCH", body: { files: { [this.file]: { content: JSON.stringify(data) } } } });
  }
  record(localSig, remoteSig) {
    this.assertConnection();
    this.cfg.last[this.file] = { at: new Date().toISOString(), signature: localSig, remote: remoteSig, stamps: { ...this.store.p.stamps } };
    this.write();
  }
  assertConnection() {
    if (!this.activeConnection) return;
    const current = this.read();
    if (this.cfg.token !== this.activeConnection.token || this.cfg.gistId !== this.activeConnection.gistId || current.token !== this.activeConnection.token || current.gistId !== this.activeConnection.gistId)
      throw Error(t("Sync settings changed while this request was running. Run sync again."));
  }

  noteConflicts(remote, baseline = this.last?.stamps || {}) {
    const local = this.store.data(), a = local.stamps || {}, b = remote.stamps || {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!a[key] || !b[key] || a[key] === b[key] || a[key] === baseline[key] || b[key] === baseline[key]) continue;
      const record = (data) => key === "$current" ? JSON.stringify([data.current, data.drawnOn])
        : key === "$ranking" ? JSON.stringify(data.rankings)
          : JSON.stringify([(data.seen || []).includes(key), (data.skipped || []).includes(key), (data.shelf || []).includes(key), ...["dates", "reviews", "verdicts", "snubs", "moods", "lbx"].map((field) => data[field]?.[key] ?? null)]);
      if (record(local) !== record(remote) && !this.conflicts.includes(key)) this.conflicts.push(key);
    }
    if (this.conflicts.length) this.warning = t("Some choices changed on both devices. The newest change to each film was kept. Review these choices before continuing.");
  }

  applyRemote(remote, mode) {
    const d = validateProgress(remote, this.store.catalog.ctx);
    this.noteConflicts(remote);
    this.applying = true;
    try {
      const undo = this.store.applyRemote(d, mode);
      this.assertBrowserSave();
      return undo;
    }
    finally { this.applying = false; }
  }
  assertBrowserSave() {
    if (this.store.writeLocked) throw Error(t("Saved progress could not be read. You can restore a backup in Settings."));
    if (!this.store.storageOK) throw Error(t("Unsaved changes · Save progress to keep them"));
  }

  // GitHub explicitly does not support conditional PATCH unless an endpoint documents it; Gists
  // does not. https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api
  // A reread/merge and postwrite verification narrows the race, but is not compare-and-swap. A
  // racing update between the final GET and PATCH can still be overwritten by GitHub. Keep local
  // records until verified and stop after bounded retries instead of claiming guaranteed safety.
  async uploadReconciled(onApplied) {
    const store = this.store;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, 1000));
      const latest = await this.readRemote();
      store.reconcileStorage?.();
      this.assertBrowserSave();
      if (latest) {
        validateProgress(latest, store.catalog.ctx);
        if (progressSignature(latest) !== store.signature()) onApplied(this.applyRemote(latest, "merge"));
      }
      const data = store.data(), sig = progressSignature(data);
      // No PATCH is necessary when the reread already agrees (e.g. another device merged our copy).
      if (latest && progressSignature(latest) === sig) {
        this.record(sig, sig);
        return;
      }
      // Capture after the reread so edits made while syncing are included.
      const sent = store.data(), sentSig = progressSignature(sent);
      await this.writeRemote(sent);
      const confirmed = await this.readRemote();
      store.reconcileStorage?.();
      this.assertBrowserSave();
      if (confirmed) validateProgress(confirmed, store.catalog.ctx);
      if (confirmed && progressSignature(confirmed) === sentSig && store.signature() === sentSig) {
        this.record(sentSig, sentSig);
        return;
      }
      if (confirmed && progressSignature(confirmed) !== store.signature()) onApplied(this.applyRemote(confirmed, "merge"));
    }
    throw Error(t("Progress kept changing on another device. Your browser copy is safe. Sync again once both devices are idle."));
  }

  /**
   * Returns what happened: { applied: "replace" | "merge", undo } when the other device's progress came in.
   */
  async syncNow({ quiet = false } = {}) {
    // Not while this browser's save couldn't be read: its empty stand-in would look like the newer copy.
    if (!this.on || this.busy || !this.store.storageOK || this.store.writeLocked) return null;
    this.busy = true;
    this.error = "";
    this.warning = "";
    this.conflicts = [];
    this.activeConnection = { token: this.cfg.token, gistId: this.cfg.gistId };
    this.changed();
    let result = null;
    const mergeUndos = [];
    try {
      const store = this.store,
        last = this.last,
        remote = await this.readRemote();
      store.reconcileStorage?.();
      this.assertBrowserSave();
      const localSig = store.signature();
      if (remote) validateProgress(remote, store.catalog.ctx);
      const merged = (undo) => { mergeUndos.push(undo); result ||= { applied: "merge", undo }; };
      if (!remote) {
        await this.uploadReconciled(merged);
      } else {
        const remoteSig = progressSignature({ ...remote, seen: remote.seen || [] });
        const localChanged = !last || last.signature !== localSig,
          remoteChanged = !last || last.remote !== remoteSig;
        if (remoteSig === localSig) this.record(localSig, remoteSig);
        else if (!localChanged && remoteChanged) {
          const undo = this.applyRemote(remote, "replace");
          this.record(store.signature(), remoteSig);
          result = { applied: "replace", undo };
          mergeUndos.push(undo);
        } else if (localChanged && !remoteChanged) {
          await this.uploadReconciled(merged);
        } else {
          const undo = this.applyRemote(remote, "merge");
          merged(undo);
          await this.uploadReconciled(merged);
        }
      }
      if (result?.undo) store.extendUndo?.(result.undo, mergeUndos);
      if (this.conflicts.length) result = { ...(result || {}), conflicts: [...this.conflicts], warning: this.warning };
    } catch (e) {
      this.applying = false;
      this.error = e.message || t("Sync failed.");
      if (result?.undo) this.store.extendUndo?.(result.undo, mergeUndos);
      result = quiet ? null : { ...(result || {}), error: this.error, conflicts: [...this.conflicts] };
    } finally {
      this.busy = false;
      this.activeConnection = null;
      this.changed();
    }
    return result;
  }
  // Called after every change; batches quick changes into one upload.
  schedule(run) {
    if (!this.on || this.applying) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(run, 4000);
    this.changed();
  }
  async connect(token) {
    const gistId = await this.findOrCreateGist(token);
    this.cfg = { token, gistId, last: {} };
    this.write();
  }
  disconnect() {
    clearTimeout(this.timer);
    this.cfg = { token: "", gistId: "", last: {} };
    try {
      this.storage.removeItem(KEYS.sync);
    } catch {}
    this.error = "";
    this.warning = "";
    this.conflicts = [];
    this.changed();
  }
}
