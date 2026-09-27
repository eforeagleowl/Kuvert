// Group night: friends add their progress codes, and the draw only picks films none of you has seen.
// Only each friend's name and watched films are kept, on this device, per list; their notes, stars and
// everything else in the code are left out. Nothing here goes into your own progress, backups or sync.
import { KEYS } from "../compat/keys.js";
import { parseCode } from "../compat/codes.js";
import { validateProgress } from "../compat/validate.js";
import { LOCAL_LEGACY_IDS } from "../compat/legacy-ids.js";

const MAX_PEOPLE = 12;

/** A friend's watched films, from a progress code or a backup file's text. */
export function readFriend(text, ctx) {
  const v = String(text || "").trim();
  if (!v) throw Error("Paste their progress code first.");
  let d;
  if (v.startsWith("{")) {
    let obj;
    try {
      obj = JSON.parse(v);
    } catch {
      throw Error("That isn't a Kuvert progress code or backup file.");
    }
    d = validateProgress(obj, ctx, { legacyIds: LOCAL_LEGACY_IDS });
  } else d = parseCode(v, ctx, LOCAL_LEGACY_IDS); // an old code: read as the updated list
  return [...d.seen];
}

export class Group extends EventTarget {
  /** @param {{ storage: Storage | null, store: object }} o */
  constructor({ storage, store }) {
    super();
    this.storage = storage;
    this.store = store;
    this.key = KEYS.group(store.list.id);
    this.on = false;
    this.people = [];
    this.load();
  }
  load() {
    let saved = null;
    try {
      saved = JSON.parse(this.storage?.getItem(this.key));
    } catch {}
    const ids = this.store.catalog.ids;
    this.people = (Array.isArray(saved?.people) ? saved.people : [])
      .filter((x) => x && typeof x.name === "string" && Array.isArray(x.seen))
      .slice(0, MAX_PEOPLE)
      .map((x) => ({ name: x.name.slice(0, 40), seen: [...new Set(x.seen.filter((id) => ids.has(id)))], added: x.added || null }));
    this.on = !!saved?.on && this.people.length > 0;
    this.apply();
  }
  save() {
    try {
      if (this.people.length) this.storage?.setItem(this.key, JSON.stringify({ on: this.on, people: this.people }));
      else this.storage?.removeItem(this.key);
    } catch {}
    this.apply();
    this.dispatchEvent(new Event("change"));
  }
  // The draw leaves out every film anyone in the group has seen, while group night is on.
  apply() {
    this.store.exclude = this.on ? this.exclude() : null;
  }
  exclude() {
    return new Set(this.people.flatMap((x) => x.seen));
  }
  /** Who in the group has seen a film. */
  seenBy(id) {
    return this.people.filter((x) => x.seen.includes(id)).map((x) => x.name);
  }
  nextName() {
    for (let n = 1; ; n++) if (!this.people.some((x) => x.name === "Friend " + n)) return "Friend " + n;
  }
  /** Adds a friend (or refreshes one with the same name) from their code or backup. */
  add(name, text) {
    const seen = readFriend(text, this.store.catalog.ctx);
    const clean = String(name || "").trim().slice(0, 40) || this.nextName();
    const existing = this.people.find((x) => x.name.toLowerCase() === clean.toLowerCase());
    if (!existing && this.people.length >= MAX_PEOPLE) throw Error("A group night fits " + MAX_PEOPLE + " friends.");
    if (existing) Object.assign(existing, { seen, added: new Date().toISOString() });
    else this.people.push({ name: clean, seen, added: new Date().toISOString() });
    this.on = true;
    this.save();
    return { name: clean, count: seen.length, refreshed: !!existing };
  }
  remove(index) {
    this.people.splice(index, 1);
    if (!this.people.length) this.on = false;
    this.save();
  }
  rename(index, name) {
    const clean = String(name || "").trim().slice(0, 40);
    if (!clean || !this.people[index]) return;
    this.people[index].name = clean;
    this.save();
  }
  setOn(on) {
    this.on = !!on && this.people.length > 0;
    this.save();
  }
}
