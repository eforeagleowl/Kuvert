// Backup files. Where the browser allows it (File System Access), the first backup picks a file and
// Kuvert keeps it up to date after every change; elsewhere a backup is a download.
import { IDB, BACKUP_FILE } from "../compat/keys.js";
import { t } from "../i18n/index.js";

export async function idbStore(action, value) {
  let db;
  try {
    db = await new Promise((resolve, reject) => {
      const r = indexedDB.open(IDB.name, IDB.version);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB.store);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB.store, action === "get" ? "readonly" : "readwrite");
      const store = tx.objectStore(IDB.store);
      const req = action === "get" ? store.get(IDB.key) : action === "put" ? store.put(value, IDB.key) : store.delete(IDB.key);
      let result;
      req.onsuccess = () => (result = req.result);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

export function download(text, fileName, type = "application/json") {
  const blob = new Blob([text], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export class FileBackup extends EventTarget {
  /** @param {{ store: import("../state/store.js").Store }} o */
  constructor({ store }) {
    super();
    this.store = store;
    this.handle = null;
    this.storedHandle = null;
    this.fileRevision = -1;
    this.warn = false;
    this.chain = Promise.resolve();
  }
  get canPick() {
    return typeof window !== "undefined" && !!window.showSaveFilePicker;
  }
  get pending() {
    return !!this.handle && this.fileRevision < this.store.revision;
  }
  changed() {
    this.dispatchEvent(new Event("change"));
  }
  // Writes the current progress to the chosen file, one write at a time.
  queueWrite() {
    if (this.store.writeLocked) return this.chain; // never replace a backup with the empty stand-in
    const handle = this.handle,
      rev = this.store.revision,
      data = this.store.data(),
      body = JSON.stringify(data, null, 2);
    this.chain = this.chain.then(async () => {
      if (handle !== this.handle) return;
      try {
        const w = await handle.createWritable();
        try {
          await w.write(body);
          await w.close();
        } catch (e) {
          try {
            await w.abort();
          } catch {}
          throw e;
        }
        if (handle === this.handle) {
          this.fileRevision = rev;
          this.warn = false;
          this.store.recordBackup(data);
        }
      } catch {
        if (handle === this.handle) this.warn = true;
      }
      this.changed();
    });
    this.changed();
    return this.chain;
  }
  /** "Back up progress": returns "file", "download" or null (cancelled). */
  async save() {
    if (this.store.writeLocked) return null;
    if (this.canPick) {
      try {
        if (!this.handle) {
          this.handle = await window.showSaveFilePicker({
            suggestedName: BACKUP_FILE,
            types: [{ description: "Kuvert progress", accept: { "application/json": [".json"] } }],
          });
          await idbStore("put", this.handle);
        }
        await this.queueWrite();
        if (!this.warn) return "file";
      } catch (e) {
        if (e.name === "AbortError") return null;
      }
    }
    const data = this.store.data();
    download(JSON.stringify(data, null, 2), BACKUP_FILE);
    this.store.recordBackup(data, "download");
    return "download";
  }
  /** "Load progress": resolves to { file, handle } or null. */
  async pick() {
    if (typeof window !== "undefined" && window.showOpenFilePicker) {
      try {
        const [h] = await window.showOpenFilePicker({ types: [{ description: "Kuvert progress", accept: { "application/json": [".json"] } }] });
        return { file: await h.getFile(), handle: h };
      } catch (e) {
        if (e.name === "AbortError") return null;
        throw e;
      }
    }
    return { file: null, handle: null }; // the caller falls back to a file input
  }
  adopt(handle) {
    this.handle = handle;
    this.fileRevision = -1;
    idbStore("put", handle);
    this.changed();
  }
  async remembered() {
    this.storedHandle = await idbStore("get");
    return this.storedHandle;
  }
  async reconnect() {
    const h = this.storedHandle;
    if (!h) return null;
    if (h.requestPermission && (await h.requestPermission({ mode: "readwrite" })) !== "granted") throw Error("File access was not granted. Your browser progress is unchanged.");
    return { file: await h.getFile(), handle: h };
  }
  message() {
    const s = this.store;
    return this.warn
      ? t("Couldn’t update your file. Use Back up progress to try again.")
      : this.handle
        ? t(this.pending ? "Saving to {file}" : "Saved to {file}", { file: this.handle.name })
        : s.storageOK
          ? t("Saved in this browser · {n} watched", { n: s.p.seen.size })
          : s.dirty
            ? t("Unsaved changes · Save progress to keep them")
            : t("{n} watched · Keep a backup", { n: s.p.seen.size });
  }
}

// Reads a backup file's text, with the size limit the original app uses.
export async function readBackupFile(file) {
  if (file.size > 1000000) throw Error("That file is too large to be a Kuvert backup.");
  return JSON.parse(await file.text());
}
