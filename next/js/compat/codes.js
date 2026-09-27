// Progress codes: "KU7." + base64url(JSON of the save, without posters and mood hints) + "." + checksum.
// KU4–KU7 codes all read the same way; older base-36 codes need the catalogue chosen first.
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
 * Reads any progress code. Older codes need `legacyIds` (the catalogue the person picked).
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
