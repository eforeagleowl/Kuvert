// Progress codes: "KU7." + base64url(JSON of the save, without posters and mood hints) + "." + checksum.
// KU4–KU7 codes all read the same way; older base-36 codes need the catalog chosen first.
import { validateProgress } from "./validate.js";
import { decodeLegacy } from "./legacy-code.js";

// FNV-1a over the text, as 8 hex digits. Also signs sync states (see serialize.js).
export function checksum(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function toBase64Url(text) {
  return btoa(Array.from(new TextEncoder().encode(text), (b) => String.fromCharCode(b)).join(""))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
export function fromBase64Url(b64) {
  return new TextDecoder().decode(Uint8Array.from(atob(b64.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0)));
}

/** @param {object} data a save from serialize.stateData(). Posters and mood hints reload from TMDB. */
export function encodeCode(data) {
  const { posterPaths: _p, moodSuggestions: _m, ...rest } = data;
  const b64 = toBase64Url(JSON.stringify(rest));
  return "KU7." + b64 + "." + checksum(b64);
}

export const isModernCode = (code) => typeof code === "string" && /^KU[4-7]\./.test(code.trim());

/**
 * Reads any progress code. Older codes need `legacyIds` (the catalog the person picked).
 * @param {import("./validate.js").ListContext} ctx
 */
export function parseCode(code, ctx, legacyIds = null) {
  if (typeof code !== "string" || code.length > 1000000) throw Error("Invalid progress code.");
  const v = code.trim();
  if (!/^KU[4-7]\./.test(v)) {
    if (!legacyIds) throw Error("Choose the movie list for this older code.");
    return { seen: decodeLegacy(v, legacyIds), dates: {}, current: null, saved: null, legacy: true };
  }
  const parts = v.split(".");
  if (parts.length !== 3 || checksum(parts[1]) !== parts[2]) throw Error("This code is incomplete or has a typo.");
  return validateProgress(JSON.parse(fromBase64Url(parts[1])), ctx);
}

// ---------------------------------------------------------------- friend codes
// "KF1." + the list's fingerprint + "." + one bit per film in the list's order + "." + checksum.
// Which films someone has watched, and nothing else: short enough to send in a message, for a friend's
// group night (js/state/group.js). The fingerprint ties it to one list as it is in this version.
const fingerprint = (ids) => parseInt(checksum(ids.join("\n")), 16).toString(36);
const sign = (body) => checksum(body).slice(0, 4);

/** @param {Iterable<string>} seen @param {string[]} ids the list's films, in its own order */
export function encodeFriendCode(seen, ids) {
  const has = new Set(seen);
  const bytes = new Uint8Array(Math.ceil(ids.length / 8));
  ids.forEach((id, i) => has.has(id) && (bytes[i >> 3] |= 1 << (i & 7)));
  let end = bytes.length;
  while (end && !bytes[end - 1]) end--;
  const bits = btoa(String.fromCharCode(...bytes.subarray(0, end)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  const body = "KF1." + fingerprint(ids) + "." + bits;
  return body + "." + sign(body);
}

export const isFriendCode = (code) => typeof code === "string" && /^KF\d+\./.test(code.trim());

/** The watched films in a friend code, for the list whose films are `ids`. */
export function parseFriendCode(code, ids) {
  const v = String(code).trim();
  const m = /^(KF1\.([0-9a-z]+)\.([A-Za-z0-9_-]*))\.([0-9a-f]{4})$/.exec(v);
  if (!m) throw Error(/^KF1\./.test(v) ? "This code is incomplete or has a typo." : "This friend code is from a newer Kuvert. Reload Kuvert and try again.");
  if (sign(m[1]) !== m[4]) throw Error("This code is incomplete or has a typo.");
  if (m[2] !== fingerprint(ids)) throw Error("This friend code is for another list, or another version of Kuvert. Ask them to open this list, reload, and copy a new one.");
  let bytes;
  try {
    bytes = Uint8Array.from(atob(m[3].replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
  } catch {
    throw Error("This code is incomplete or has a typo.");
  }
  return ids.filter((_, i) => bytes[i >> 3] & (1 << (i & 7)));
}
