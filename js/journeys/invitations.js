// A sealed reveal is an interaction, not encryption. The fragment stays on the device;
// it contains only the film and the message the sender explicitly chooses to share.
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const MAX = 4000;
export function validateInvitation(value) {
  if (!value || value.v !== 1 || !value.film || typeof value.film !== "object") throw Error("That invitation could not be read.");
  const f = value.film;
  if (typeof f.t !== "string" || !f.t.trim() || f.t.length > 200 || !Number.isInteger(f.y) || f.y < 1870 || f.y > 2100 || typeof f.id !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(f.id)) throw Error("That invitation could not be read.");
  const date = value.date || "";
  if (typeof date !== "string" || (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0,10) !== date))) throw Error("Choose a valid invitation date.");
  if (typeof (value.message ?? "") !== "string" || (value.message || "").length > 180) throw Error("Keep the invitation message under 180 characters.");
  return { v: 1, film: { id: f.id, t: f.t.trim(), y: f.y }, date, message: value.message || "" };
}
export function encodeInvitation(value) {
  const bytes = encoder.encode(JSON.stringify(validateInvitation(value)));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
export function decodeInvitation(code) {
  if (typeof code !== "string" || code.length > MAX || !/^[A-Za-z0-9_-]+$/.test(code)) throw Error("That invitation could not be read.");
  try {
    const raw = atob(code.replaceAll("-", "+").replaceAll("_", "/"));
    return validateInvitation(JSON.parse(decoder.decode(Uint8Array.from(raw, c => c.charCodeAt(0)))));
  } catch { throw Error("That invitation could not be read."); }
}
export function invitationURL(base, value) {
  const url = new URL(base);
  if (!/^https?:$/.test(url.protocol)) throw Error("Serve Kuvert from a web address to share an invitation.");
  url.search = "";
  url.hash = "invite=" + encodeInvitation(value);
  return url.href;
}
