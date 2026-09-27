// Kuvert's calendar. An evening lasts until 04:00: a film finished after midnight belongs to the
// evening it started on. Dates are stored as "YYYY-MM-DD" in local time.
export { validDate } from "../compat/validate.js";

export const LATE_NIGHT_CUTOFF_HOUR = 4;

export function isoDay(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export function defaultWatchDate(now = new Date()) {
  const d = new Date(now);
  if (d.getHours() < LATE_NIGHT_CUTOFF_HOUR) d.setDate(d.getDate() - 1);
  return isoDay(d);
}
export const todayISO = (now = new Date()) => isoDay(now);
export const isoToDate = (s) => new Date(s + "T12:00:00");
export const isLateNight = (now = new Date()) => now.getHours() < LATE_NIGHT_CUTOFF_HOUR;

const fmt = (s, opts) => isoToDate(s).toLocaleDateString("en-GB", opts);
export const fmtDay = (s) => fmt(s, { weekday: "short", day: "numeric", month: "short" });
export const fmtWhen = (s) => fmt(s, { day: "numeric", month: "short", year: "2-digit" });
export const dayLong = (s) => fmt(s, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const dayShort = (s) => fmt(s, { day: "numeric", month: "short" });
export const dateFull = (s) => fmt(s, { day: "numeric", month: "short", year: "numeric" });

// "10:27 PM" (or "22:27"), kept on one line.
export function clockLabel(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s/g, " ");
}

// How long ago a ticket was drawn, for "Drawn yesterday · still on for tonight?"
export function drawnDayLabel(iso, now = new Date()) {
  const days = Math.round((isoToDate(defaultWatchDate(now)) - isoToDate(iso)) / 86400000);
  if (days <= 1) return "yesterday";
  if (days < 7) return isoToDate(iso).toLocaleDateString("en-GB", { weekday: "long" });
  return isoToDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function mondayOf(d) {
  const m = new Date(d);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
