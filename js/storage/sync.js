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
      if (r.status === 401) throw Error("GitHub didn't accept that token. Check it hasn't expired.");
      if (r.status === 403 || r.status === 404) throw Error("The token can't read and write Gists. Use a classic token with the gist scope and try again.");
      if (!r.ok) throw Error("GitHub is unavailable right now (" + r.status + "). Try again in a moment.");
      return r.status === 204 ? null : await r.json();
    } catch (e) {
      if (e.name === "AbortError") throw Error("GitHub took too long to answer. Try again.");
      if (e instanceof TypeError) throw Error("Couldn't reach GitHub. Check your connection.");
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
    const g = await this.gh("/gists/" + this.cfg.gistId);
    const f = g.files?.[this.file];
    if (!f) return null;
    const text = f.truncated ? await (await this.fetch(f.raw_url, { cache: "no-store" })).text() : f.content;
    return JSON.parse(text);
  }
  async writeRemote(data) {
    await this.gh("/gists/" + this.cfg.gistId, { method: "PATCH", body: { files: { [this.file]: { content: JSON.stringify(data) } } } });
  }
  record(localSig, remoteSig) {
    this.cfg.last[this.file] = { at: new Date().toISOString(), signature: localSig, remote: remoteSig };
    this.write();
  }

  /**
   * Returns what happened: { applied: "replace" | "merge", undo } when the other device's progress came in.
   */
  async syncNow({ quiet = false } = {}) {
    // Not while this browser's save couldn't be read: its empty stand-in would look like the newer copy.
    if (!this.on || this.busy || !this.store.storageOK || this.store.writeLocked) return null;
    this.busy = true;
    this.error = "";
    this.changed();
    let result = null;
    try {
      const store = this.store,
        last = this.last,
        remote = await this.readRemote(),
        localSig = store.signature();
      if (!remote) {
        const data = store.data();
        await this.writeRemote(data);
        this.record(localSig, progressSignature(data));
      } else {
        const remoteSig = progressSignature({ ...remote, seen: remote.seen || [] });
        const localChanged = !last || last.signature !== localSig,
          remoteChanged = !last || last.remote !== remoteSig;
        if (remoteSig === localSig) this.record(localSig, remoteSig);
        else if (!localChanged && remoteChanged) {
          const d = validateProgress(remote, store.catalog.ctx);
          this.applying = true;
          const undo = store.applyRemote(d, "replace");
          this.applying = false;
          this.record(store.signature(), remoteSig);
          result = { applied: "replace", undo };
        } else if (localChanged && !remoteChanged) {
          const data = store.data();
          await this.writeRemote(data);
          this.record(localSig, progressSignature(data));
        } else {
          const d = validateProgress(remote, store.catalog.ctx);
          this.applying = true;
          const undo = store.applyRemote(d, "merge");
          this.applying = false;
          const data = store.data();
          await this.writeRemote(data);
          const sig = progressSignature(data);
          this.record(sig, sig);
          result = { applied: "merge", undo };
        }
      }
    } catch (e) {
      this.applying = false;
      this.error = e.message || "Sync failed.";
      if (!quiet) result = { error: this.error };
    } finally {
      this.busy = false;
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
    this.changed();
  }
}
