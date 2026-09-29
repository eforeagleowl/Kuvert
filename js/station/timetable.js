// The station's timetable, without the page: which characters a flap can show, how a title fits on the
// board, which track a film leaves from, when trains depart, how the board is laid out at a given width,
// and what the ticker and the announcer say. Kept apart so it can be tested on its own.
import { ordinal } from "../state/catalog.js";
import { swedish } from "../i18n/index.js";

// Every character a flap carries, in the order it turns through them (stars for the arrivals' ratings).
export const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ0123456789.,:-'&!?()/★½";
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
    // …unless that leaves too little to know the film by ("ON" for On the Waterfront): then it's
    // abbreviated as station boards do, after a consonant and with a full stop ("ON THE WATERFR.").
    if (words.length >= Math.min(n, 6)) s = words;
    else {
      let cut = s.slice(0, n - 1);
      while (cut.length > n - 4 && /[AEIOUYÅÄÖ]$/.test(cut)) cut = cut.slice(0, -1);
      cut = cut.replace(/[\s,:&'-]+$/, "");
      s = /[A-ZÅÄÖ0-9]/.test(s[cut.length] || "") ? cut + "." : cut;
    }
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

/**
 * The arrivals board: date, year, the film and your stars. Narrower boards drop the year, then the date.
 */
export function chooseArrivals(width) {
  const gap = 0.8,
    lamp = 1.2;
  const units = (groups) => lamp + groups.reduce((a, [, n]) => a + n, 0) + gap * (groups.length - 1);
  const tries = [
    [[["date", 6], ["year", 4], ["title", 24], ["stars", 5]], 15.5],
    [[["date", 6], ["title", 16], ["stars", 5]], 14],
  ];
  for (const [groups, min] of tries) {
    const cw = width / units(groups);
    if (cw >= min) return { groups, cw: Math.floor(Math.min(cw, 27) * 4) / 4, rows: 8 };
  }
  const titleN = Math.max(8, Math.min(16, Math.floor(width / 14 - 5 - gap - lamp)));
  const groups = [["title", titleN], ["stars", 5]];
  return { groups, cw: Math.floor(Math.min(width / units(groups), 22) * 4) / 4, rows: 8 };
}

// Month names on the flaps are Swedish, like the board's own labels.
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAJ", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"];
/** "2026-09-29" → "29 SEP". */
export const flapDate = (iso) => (iso ? String(Number(iso.slice(8, 10))).padStart(2, " ") + " " + MONTHS[Number(iso.slice(5, 7)) - 1] : "");
/** "★★★★½" for 4.5. */
export const flapStars = (r) => (r ? "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "") : "");

/**
 * The films that have arrived: the most recently watched first (by the date you watched them; undated
 * ones by when they were marked), `n` of them. `tonight` marks the ones watched this evening.
 */
export function arrivals(p, catalog, n, today) {
  const order = [...p.seen];
  return order
    .map((id, i) => ({ film: catalog.byId.get(id), date: p.dates[id] || "", i }))
    .filter((r) => r.film)
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.i - a.i)
    .slice(0, n)
    .map(({ film, date }) => ({ film, date, rating: p.reviews[film.id]?.rating || null, tonight: !!date && date === today }));
}
export function arrivalStrings(row, groups) {
  return groups.map(([k, n]) => {
    if (k === "date") return flapDate(row.date);
    if (k === "year") return String(row.film.y);
    if (k === "title") return fit(row.film, n);
    if (k === "stars") return flapStars(row.rating);
    return "";
  });
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
// The ticker runs in Swedish with the English after it; in Swedish mode, Swedish only.
const both = (sv, en) => (swedish ? sv : sv + " · " + en);

/** The ticker while waiting for a draw. It never names a saved ticket: that stays sealed in the envelope. */
export function idleTicker({ listName, count, saved, allWatched }) {
  if (!count)
    return allWatched
      ? both("Allt sett · Varje film på din lista är sedd · Din slutbiljett väntar i kuvertet", "Every film on your list is watched · Your final ticket waits on Tonight")
      : both("Inga tåg just nu · Inga filmer passar kvällens filter · Ändra dem i kuvertet", "No films match tonight's filters · Adjust them on Tonight");
  return (
    `Välkommen till ${listName} C · ${count} ${count === 1 ? "film" : "filmer"} på tidtabellen` +
    (saved ? " · " + both("Din sparade biljett väntar i kuvertet", "Your saved ticket is waiting in the envelope") : "") +
    " · " +
    both("Tryck på Dra kvällens film för din biljett", `Welcome to ${listName} Central · Press Draw for tonight's ticket`)
  );
}
export const updating = () => both("Tidtabellen uppdateras", "Updating the timetable");

/** The ticker once a film is drawn: the film, its shelf, the departure and the track. */
export function drawnTicker(row, catalog) {
  const f = row.film,
    time = hhmm(row.time),
    tr = track(f, catalog),
    gala = Number.isInteger(f.c) ? ` vid den ${ordSv(f.c)} galan` : "";
  const shelf = catalog.hasShelves ? { W: "Vann Bästa film" + gala, N: "Nominerad till Bästa film" + gala, H: "Hedersomnämnande" }[f.s] : null;
  return (
    `Kvällens film: ${f.t} (${f.y})${shelf ? " · " + shelf : ""} · Avgår ${time} från spår ${tr} · ` +
    (swedish ? "" : `Tonight's film departs ${time} from track ${tr} · `) +
    "Välkommen ombord"
  );
}

/** The arrivals ticker: how many have arrived, and the latest. */
export function arrivalsTicker(rows, count) {
  if (!count) return both("Inga ankomster ännu · Filmerna du ser anländer hit", "No arrivals yet · The films you watch arrive here");
  const last = rows[0],
    stars = last.rating ? " " + flapStars(last.rating) : "";
  return (
    `Ankomster · ${count} ${count === 1 ? "film har" : "filmer har"} anlänt · Senast: ${last.film.t} (${last.film.y})${stars} · ` +
    both("Tack för att du reste med oss", `Arrivals · ${count} ${count === 1 ? "film" : "films"} arrived · Thank you for travelling with us`)
  );
}

/** The announcer: like a British station announcement, or in Swedish mode a Swedish one. */
export function announcement(row, catalog) {
  const f = row.film,
    time = hhmm(row.time),
    tr = track(f, catalog);
  if (swedish) {
    const shelf = catalog.hasShelves ? { W: "Vinnare av Bästa film. ", N: "Nominerad till Bästa film. ", H: "Ett hedersomnämnande. " }[f.s] || "" : "";
    return `Kvällens film: ${f.t}, från ${f.y}. ${shelf}Tåget klockan ${time.replace(":", ".")} avgår från spår ${tr}. Ta din biljett, och njut av filmen.`;
  }
  const shelf = catalog.hasShelves ? { W: "A Best Picture winner. ", N: "A Best Picture nominee. ", H: "An honorable mention. " }[f.s] || "" : "";
  return `Tonight's film: ${f.t}, from ${f.y}. ${shelf}The ${time} service will depart from platform ${tr}. Please take your ticket, and enjoy the film.`;
}

/** The chip on the printed ticket. */
export function chip(film, catalog) {
  if (film.tri && film.ord > 1) return "Nästa del";
  return catalog.isWinner(film) ? "Kvällens vinnare" : "Kvällens film";
}

/** "15th · 1943", or a dash for films without a ceremony. */
export const ceremonyLine = (film) => (Number.isInteger(film.c) ? ordinal(film.c) + " · " + ceremonyYear(film.c) : "—");
