// Shared limits for the small, provider-independent film-club service.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const fail = (status, code, message) => { throw new ApiError(status, code, message); };
export const object = (x) => !!x && typeof x === "object" && !Array.isArray(x);
export function text(x, label, max, { optional = false } = {}) {
  if (optional && (x === undefined || x === null || x === "")) return "";
  if (typeof x !== "string" || !x.trim() || x.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x))
    fail(400, "invalid_input", `${label} must contain 1–${max} characters.`);
  return x.trim();
}
export function strings(x, label, limit, max = 100) {
  if (!Array.isArray(x) || x.length > limit) fail(400, "invalid_input", `${label} must be a list of at most ${limit} items.`);
  return [...new Set(x.map((v) => {
    if (typeof v !== "string" && !(typeof v === "number" && Number.isSafeInteger(v))) fail(400, "invalid_input", `${label} must contain text or numeric IDs.`);
    return text(String(v), label, max);
  }))];
}
export function constraints(x = {}) {
  if (!object(x)) fail(400, "invalid_input", "Constraints must be an object.");
  const maxMinutes = x.maxMinutes == null || x.maxMinutes === "" ? null : Number(x.maxMinutes);
  if (maxMinutes !== null && (!Number.isInteger(maxMinutes) || maxMinutes < 1 || maxMinutes > 600))
    fail(400, "invalid_input", "Available time must be between 1 and 600 minutes.");
  if (x.requireStreaming !== undefined && typeof x.requireStreaming !== "boolean")
    fail(400, "invalid_input", "The streaming requirement must be true or false.");
  return {
    maxMinutes,
    services: strings(x.services || [], "Streaming services", 50, 80),
    watchedIds: strings(x.watchedIds || [], "Watched films", 2000),
    requireStreaming: x.requireStreaming === true,
  };
}
export function catalogue(x) {
  if (!Array.isArray(x) || !x.length || x.length > 1500) fail(400, "invalid_input", "Choose between 1 and 1,500 films for the club.");
  const ids = new Set();
  return x.map((f) => {
    if (!object(f)) fail(400, "invalid_input", "Every film must be an object.");
    const id = text(f.id, "Film ID", 100);
    if (ids.has(id)) fail(400, "invalid_input", "Film IDs must be unique.");
    ids.add(id);
    const year = f.year == null ? null : Number(f.year);
    const runtime = f.runtime == null || f.runtime === "" ? null : Number(f.runtime);
    if (year !== null && (!Number.isInteger(year) || year < 1888 || year > 2200)) fail(400, "invalid_input", "Film year is invalid.");
    if (runtime !== null && (!Number.isInteger(runtime) || runtime < 1 || runtime > 600)) fail(400, "invalid_input", "Film runtime is invalid.");
    return {
      id, title: text(f.title, "Film title", 200), year, runtime,
      services: strings(f.services || [], "Film streaming services", 50, 80),
      servicesKnown: f.servicesKnown === true,
    };
  });
}
export function rating(x) {
  if (!object(x)) fail(400, "invalid_input", "The rating must be an object.");
  const stars = Number(x.stars);
  if (!Number.isFinite(stars) || stars < 0.5 || stars > 5 || !Number.isInteger(stars * 2))
    fail(400, "invalid_input", "Choose a rating from ½ to 5 stars, in half-star steps.");
  return { stars, note: text(x.note, "Your note", 2000, { optional: true }) };
}
export function startsAt(x) {
  if (x === undefined || x === null || x === "") return null;
  if (typeof x !== "string" || x.length > 40 || !Number.isFinite(Date.parse(x))) fail(400, "invalid_input", "Film-night date is invalid.");
  return new Date(x).toISOString();
}
