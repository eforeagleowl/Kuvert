// Keeping your progress safe. It lives in one browser, which can lose it: a deleted home-screen icon,
// or a browser clearing data for space or after weeks away. So Kuvert asks the browser to keep it,
// makes a copy easy to put somewhere else, and reminds you on Tonight when there's no recent copy.
import { KEYS, BACKUP_FILE } from "../compat/keys.js";
import { download } from "./files.js";

const DAY = 864e5;
/** When Tonight reminds you: this many films or days since your last copy, once you've watched a few. */
export const REMIND = Object.freeze({ films: 5, days: 14, minWatched: 3, snoozeDays: 3 });

export class Safekeeping {
  /** @param {{ store: object, storage: Storage | null, files: object, sync: object }} o */
  constructor({ store, storage, files, sync }) {
    this.store = store;
    this.storage = storage;
    this.files = files;
    this.sync = sync;
    this.persisted = null; // true, false, or null when the browser can't say
    this.asked = false;
    // Every copy counts, however it was made (the file picker, a download, the share sheet).
    store.addEventListener("change", (e) => {
      if (e.detail.kind === "backup") this.write({ count: store.p.seen.size, snoozed: null });
    });
  }
  read() {
    try {
      return JSON.parse(this.storage?.getItem(KEYS.safekeeping)) || {};
    } catch {
      return {};
    }
  }
  write(changes) {
    try {
      this.storage?.setItem(KEYS.safekeeping, JSON.stringify({ ...this.read(), ...changes }));
    } catch {}
  }

  /** Whether the browser has agreed to keep Kuvert's data (no prompt). */
  async check() {
    try {
      this.persisted = (await navigator.storage?.persisted?.()) ?? null;
    } catch {
      this.persisted = null;
    }
    return this.persisted;
  }
  /** Asks the browser to keep Kuvert's data. Some browsers ask you, so this follows something you did. */
  async ask() {
    if (this.asked || this.persisted) return this.persisted;
    this.asked = true;
    try {
      this.persisted = (await navigator.storage?.persist?.()) ?? this.persisted;
    } catch {}
    return this.persisted;
  }

  backupFile(data = this.store.data()) {
    return new File([JSON.stringify(data, null, 2)], BACKUP_FILE, { type: "application/json" });
  }
  /** The share sheet can take a file here (phones, Safari): Notes, Files, iCloud Drive, Mail… */
  get canShareFile() {
    try {
      return !!navigator.canShare?.({ files: [this.backupFile({})] });
    } catch {
      return false;
    }
  }
  /**
   * Makes a copy outside this browser: a file Kuvert keeps up to date where the browser allows it,
   * the share sheet on phones, a download everywhere else. Resolves to "file", "shared", "downloaded"
   * or null when cancelled.
   */
  async saveCopy({ share = !this.files.canPick } = {}) {
    if (this.store.writeLocked) return null;
    if (!share && this.files.canPick) {
      const r = await this.files.save();
      return r === "download" ? "downloaded" : r;
    }
    const data = this.store.data();
    if (this.canShareFile) {
      try {
        await navigator.share({ files: [this.backupFile(data)], title: "Kuvert progress" });
        this.store.recordBackup(data, "download"); // "download": the classic app's word for a copy elsewhere
        this.ask();
        return "shared";
      } catch (e) {
        if (e.name === "AbortError") return null;
      }
    }
    download(JSON.stringify(data, null, 2), BACKUP_FILE);
    this.store.recordBackup(data, "download");
    this.ask();
    return "downloaded";
  }
  snooze(now = Date.now()) {
    this.write({ snoozed: new Date(now + REMIND.snoozeDays * DAY).toISOString() });
  }

  /** What Tonight should say, or null. */
  reminder(now = Date.now()) {
    const { store, files, sync } = this,
      n = store.p.seen.size;
    if (store.writeLocked || n < REMIND.minWatched) return null;
    if (sync.on && sync.last && !sync.error) return null; // the gist is a copy
    if (files.handle && !files.warn) return null; // a file kept up to date
    const last = store.lastBackup;
    if (last && last.signature === store.signature()) return null;
    const meta = this.read();
    if (meta.snoozed && Date.parse(meta.snoozed) > now) return null;
    if (!last) return n === 1 ? "Your watched film lives only in this browser." : "Your " + n + " watched films live only in this browser.";
    const since = Number.isInteger(meta.count) ? n - meta.count : null;
    if (since !== null && since >= REMIND.films) return "You've watched " + since + " films since your last copy.";
    const days = Math.floor((now - Date.parse(last.at)) / DAY);
    if (days >= REMIND.days) return "Your last copy is " + days + " days old.";
    return null;
  }
  /** One line for Settings about how safe this browser's copy is. */
  statusText() {
    if (this.persisted === true) return "This browser keeps Kuvert's data permanently. A copy elsewhere still guards against a lost phone or a deleted home-screen icon.";
    return "This browser may clear Kuvert's data to free up space or after a long time away, and deleting a home-screen icon deletes its data too. Keep a copy somewhere else.";
  }
}
