// The station's timetable, without the page: which characters a flap can show, how a title fits on the
// board, which track a film leaves from, when trains depart, how the board is laid out at a given width,
// and what the ticker and the announcer say. Kept apart so it can be tested on its own.
import { ordinal } from "../state/catalog.js";

// Every character a flap carries, in the order it turns through them.
export const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ0123456789.,:-'&!?()/";
export const CHAR_INDEX = new Map(Array.from(CHARS, (c, i) => [c, i]));

/** Upper case, with anything a flap doesn't carry turned into its plain letter (é → E) or a space. */
export function toFlap(text) {
  let out = "";
  for (const ch of String(text).toUpperCase().replace(/[’‘`]/g, "'")) {
    if (CHAR_INDEX.has(ch)) {
      out += ch;
      continue;
    }
    const base = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    out += CHAR_INDEX.has(base) ? base : " ";
  }
  return out;
}

/** A film's title in at most `n` flaps: drops brackets and subtitles (keeps a series part's own name), "and" becomes "&", then "The" goes, then it's cut at a word. */
export function fit(film, n) {
  let s = toFlap(film.t).replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  s = s.replace(/\s*\([^)]*\)/g, "").replace(/\s+OR$/, "").trim();
  if (s.length > n && s.includes(":")) {
    const i = s.indexOf(":"),
      a = s.slice(0, i).trim(),
      b = s.slice(i + 1).trim();
    s = film.tri ? (b.length >= 10 ? b : a + " " + film.ord) : a;
  }
  if (s.length > n) s = s.replace(/ AND /g, " & ");
  if (s.length > n) s = s.replace(/^THE /, "");
  if (s.length > n) {
    // At the last space or hyphen that fits, without a dangling "of the"…
    let cut = n;
    while (cut > 0 && s[cut] !== " " && s[cut] !== "-") cut--;
    let words = s.slice(0, cut),
      prev;
    do {
      prev = words;
      words = words.replace(/[\s,:&'-]+$/, "").replace(/(^|\s)(OF|THE|A|AN|AND|IN|ON|TO|FOR|FROM|WITH)$/, "");
    } while (words !== prev);
    // …unless that leaves too little to know the film by ("ON" for On the Waterfront): then flaps run out mid-word.
    s = words.length >= Math.min(n, 6) ? words : s.slice(0, n).replace(/[\s,:&'-]+$/, "");
  }
  return s;
}

/** The track a film leaves from: its ceremony (the 56th Academy Awards leaves from track 56). Lists without ceremonies get a steady one of 1–19. */
export const track = (film, catalog) => (Number.isInteger(film.c) ? film.c : (Number(catalog.ticketNumber(film)) % 19) + 1);

/** VANN, NOM or HM on the board. */
export const remark = (film) => ({ W: "VANN", N: "NOM", H: "HM" })[film.s] || "";

/** The year a ceremony was held: the first five straddled years, then every one the year after its films. */
export const ceremonyYear = (c) => (c <= 5 ? [1929, 1930, 1930, 1931, 1932][c - 1] : 1928 + c);

const pad2 = (n) => String(n).padStart(2, "0");
export const hhmm = (d) => pad2(d.getHours()) + ":" + pad2(d.getMinutes());
/** Swedish ordinals: 1:a, 2:a, 3:e, 11:e, 21:a, 56:e. */
export const ordSv = (n) => n + ((n % 10 === 1 || n % 10 === 2) && n % 100 !== 11 && n % 100 !== 12 ? ":a" : ":e");

/** Departure times: the first 6 to 15 minutes from now, on the five minutes, then every 5 to 25 minutes. */
export function schedule(n, from = new Date(), random = Math.random) {
  const t = new Date(from);
  t.setSeconds(0, 0);
  t.setMinutes(Math.ceil((t.getMinutes() + 6 + Math.floor(random() * 6)) / 5) * 5);
  const out = [new Date(t)];
  for (let i = 1; i < n; i++) {
    t.setMinutes(t.getMinutes() + 5 * (1 + Math.floor(random() * 5)));
    out.push(new Date(t));
  }
  return out;
}

/** Minutes until a departure, rounded up; 0 or less once it has left. */
export const minutesUntil = (time, now = new Date()) => Math.ceil((time.getTime() - now.getTime()) / 60000);

/**
 * The board's columns for a width in CSS pixels: all five (time, year, destination, track, remarks) when
 * there's room, then without the track, then time and destination only. `cw` is one flap's width.
 */
export function chooseLayout(width) {
  const gap = 0.8,
    lamp = 1.2;
  const units = (groups) => lamp + groups.reduce((a, [, n]) => a + n, 0) + gap * (groups.length - 1);
  const tries = [
    [[["time", 5], ["year", 4], ["title", 26], ["track", 2], ["rem", 4]], 15.5],
    [[["time", 5], ["year", 4], ["title", 18], ["rem", 4]], 14],
  ];
  for (const [groups, min] of tries) {
    const cw = width / units(groups);
    if (cw >= min) return { groups, cw: Math.floor(Math.min(cw, 27) * 4) / 4, rows: 8 };
  }
  // Phones: smaller flaps (about 14px) so a title has room to be recognised.
  const titleN = Math.max(9, Math.min(18, Math.floor(width / 14 - 5 - gap - lamp)));
  const groups = [["time", 5], ["title", titleN]];
  return { groups, cw: Math.floor(Math.min(width / units(groups), 22) * 4) / 4, rows: 8 };
}

/** What each column of a row says. */
export function rowStrings(row, groups, catalog) {
  const f = row.film;
  return groups.map(([k, n]) => {
    if (k === "time") return hhmm(row.time);
    if (k === "year") return String(f.y);
    if (k === "title") return fit(f, n);
    if (k === "track") return String(track(f, catalog)).padStart(n, " ");
    if (k === "rem") return remark(f);
    return "";
  });
}

// ---------------------------------------------------------------- words
/** The ticker while waiting for a draw. It never names a saved ticket: that stays sealed in the envelope. */
export function idleTicker({ listName, count, saved, allWatched }) {
  if (!count)
    return allWatched
      ? "Allt sett · Every film on your list is watched · Your final ticket waits on Tonight"
      : "Inga tåg just nu · No films match tonight's filters · Adjust them on Tonight";
  return (
    `Välkommen till ${listName} C · ${count} ${count === 1 ? "film" : "filmer"} på tidtabellen` +
    (saved ? " · Din sparade biljett väntar i kuvertet · Your saved ticket is waiting in the envelope" : "") +
    ` · Tryck på Dra kvällens film för din biljett · Welcome to ${listName} Central · Press Draw for tonight's ticket`
  );
}
export const UPDATING = "Tidtabellen uppdateras · Updating the timetable";

/** The ticker once a film is drawn: the film, its shelf, the departure and the track, in Swedish and English. */
export function drawnTicker(row, catalog) {
  const f = row.film,
    t = hhmm(row.time),
    tr = track(f, catalog),
    gala = Number.isInteger(f.c) ? ` vid den ${ordSv(f.c)} galan` : "";
  const shelf = catalog.hasShelves ? { W: "Vann Bästa film" + gala, N: "Nominerad till Bästa film" + gala, H: "Hedersomnämnande" }[f.s] : null;
  return `Kvällens film: ${f.t} (${f.y})${shelf ? " · " + shelf : ""} · Avgår ${t} från spår ${tr} · Tonight's film departs ${t} from track ${tr} · Välkommen ombord`;
}

/** The announcer, in English, like a British station announcement. */
export function announcement(row, catalog) {
  const f = row.film;
  const shelf = catalog.hasShelves ? { W: "A Best Picture winner. ", N: "A Best Picture nominee. ", H: "An honorable mention. " }[f.s] || "" : "";
  return `Tonight's film: ${f.t}, from ${f.y}. ${shelf}The ${hhmm(row.time)} service will depart from platform ${track(f, catalog)}. Please take your ticket, and enjoy the film.`;
}

/** The chip on the printed ticket. */
export function chip(film, catalog) {
  if (film.tri && film.ord > 1) return "Nästa del";
  return catalog.isWinner(film) ? "Kvällens vinnare" : "Kvällens film";
}

/** "15th · 1943", or a dash for films without a ceremony. */
export const ceremonyLine = (film) => (Number.isInteger(film.c) ? ordinal(film.c) + " · " + ceremonyYear(film.c) : "—");
