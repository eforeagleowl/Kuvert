// One station engine (js/views/station.js), three stations. Kuvert C is the Swedish central station.
// Union Station, Los Angeles, is Galan's: Art Deco in black and gold, opened in 1939, the year of Gone with
// the Wind. Dark Territory is SEAGAL's: a restricted rail depot, after Under Siege 2, where Seagal fights
// on a train. Each profile holds what makes a station itself: its sign, its words, its clock, its remarks,
// what the ticker and the announcer say, and how it sounds.
//
// Signs are in the station's own language with the visitor's under them where that differs: Kuvert C is
// Swedish (English under it for English visitors), Union Station American (Swedish under it in Swedish
// mode). The depot is SEAGAL's, and SEAGAL is English only.
import { t, swedish } from "../i18n/index.js";
import * as T from "./timetable.js";
import { britishVoice, swedishVoice, americanVoice } from "./audio.js";

const reader = () => (swedish ? "sv" : "en");
/** A sign's two lines: the station's own words, and under them a note, or the visitor's language where it differs. */
export const sign = (st, words) => [words[st.local] ?? "", words.note ?? (st.local !== reader() ? words[reader()] || "" : "")];
/** The same, run together on one line (the ticker, the countdown). */
const both = (st, words) => sign(st, words).filter(Boolean).join(" · ");
const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
const REMARKS = { W: "Won", N: "Nominated", H: "Honorable mention" };

// ---------------------------------------------------------------- Kuvert C
// The markup in index.html is Kuvert C's own, so nothing there is repainted; its words live in timetable.js.
export const KUVERT_C = {
  id: "kuvert",
  local: "sv",
  boards: {
    dep: { name: { sv: "Avgångar", en: "Departures" }, labels: { time: { sv: "TID", en: "Time" }, year: { sv: "ÅR", en: "Year" }, title: { sv: "TILL", en: "To" }, track: { sv: "SPÅR", en: "Track" }, rem: { sv: "ANM.", en: "Remarks" } } },
    arr: { name: { sv: "Ankomster", en: "Arrivals" }, labels: { date: { sv: "DATUM", en: "Date" }, year: { sv: "ÅR", en: "Year" }, title: { sv: "FRÅN", en: "From" }, stars: { sv: "BETYG", en: "Stars" } } },
  },
  time: T.hhmm,
  months: T.MONTHS_SV,
  rem: (row) => T.remark(row.film),
  remText: (row) => (row.hl ? t("Tonight's film.") + " " : "") + t(REMARKS[row.film.s] || ""),
  empty: { done: "ALLT SETT!", none: "INGA TÅG", arrivals: "INGA ANKOMSTER" },
  idleTicker: T.idleTicker,
  drawnTicker: T.drawnTicker,
  arrivalsTicker: T.arrivalsTicker,
  updating: T.updating,
  announcement: T.announcement,
  chip: T.chip,
  draw: { fresh: { sv: "Dra kvällens film", en: "Draw tonight’s film" }, again: { sv: "Dra igen", en: "Draw again" }, pending: { sv: "Skriv ut biljetten", en: "Print your saved ticket" } },
  live: { dep: () => t("Departures."), arr: () => t("Arrivals: the films you've watched, latest first."), updating: () => t("Updating the timetable…"), drawn: (v) => t("Tonight's film: {title} ({year}). Departs {time} from track {track}. Your ticket is printed below.", v) },
  ticket: {
    head: (list) => list.name + " · Biobiljett",
    number: (n, total) => "Nr " + n + " / " + total,
    fields: (v) => [[t("Departs"), v.time, true], [t("Track"), v.track], [t("Ceremony"), T.ceremonyLine(v.film)]],
    take: { sv: "Ta biljetten", en: "Take your ticket" },
    note: () => t("Rate it and mark it watched there."),
    from: (list) => list.name + " C",
    trackLabel: "Spår",
    stamp: (date) => "KUVERT C · AVGÅNGAR · " + date + " ·",
    soon: (m) => ({ sv: "om " + m + " min", en: "in " + m + " min" }),
    boarding: { sv: "Ombordstigning", en: "Now boarding" },
  },
  voice: { pick: (voices) => (swedish ? swedishVoice(voices) : britishVoice(voices)), lang: () => (swedish ? "sv-SE" : "en-GB"), rate: 0.95, pitch: 1 },
  sounds: "bell",
};

// ---------------------------------------------------------------- Union Station, Los Angeles (Galan)
const shelfEn = (f) => (Number.isInteger(f.c) ? { W: `Best Picture winner, ${T.ordEn(f.c)} Academy Awards`, N: `Best Picture nominee, ${T.ordEn(f.c)} Academy Awards` }[f.s] : "") || "";
export const UNION_STATION = {
  id: "union",
  local: "en",
  name: "Union Station",
  place: "Los Angeles",
  tagline: () => t("Every nominee leaves from here, one track for each ceremony. Draw one and take the ticket."),
  leave: { en: "Back to the envelope", sv: "Tillbaka till kuvertet" },
  toStation: { en: "Go to Union Station", sv: "Gå till stationen" },
  clock: "Time",
  tray: () => t("Your ticket prints here."),
  boards: {
    dep: { name: { en: "Departures", sv: "Avgångar" }, labels: { time: { en: "TIME", sv: "Tid" }, year: { en: "YEAR", sv: "År" }, title: { en: "TO", sv: "Till" }, track: { en: "TRACK", sv: "Spår" }, rem: { en: "REMARKS", sv: "Anm." } } },
    arr: { name: { en: "Arrivals", sv: "Ankomster" }, labels: { date: { en: "DATE", sv: "Datum" }, year: { en: "YEAR", sv: "År" }, title: { en: "FROM", sv: "Från" }, stars: { en: "STARS", sv: "Betyg" } } },
  },
  time: T.hhmm,
  months: T.MONTHS_EN,
  rem: (row) => ({ W: "WON", N: "NOM", H: "HM" })[row.film.s] || "",
  remText: KUVERT_C.remText,
  empty: { done: "ALL SEEN!", none: "NO TRAINS", arrivals: "NO ARRIVALS" },
  idleTicker({ count, saved, allWatched }) {
    if (!count)
      return allWatched
        ? both(this, { en: "All seen · Every nominee on the ballot is watched · Your final ticket waits on Tonight", sv: "Allt sett · Alla nominerade är sedda · Din slutbiljett väntar i kuvertet" })
        : both(this, { en: "No trains just now · No films match tonight's filters · Adjust them on Tonight", sv: "Inga tåg just nu · Inga filmer passar kvällens filter · Ändra dem i kuvertet" });
    return both(this, {
      en: `Welcome to Union Station, Los Angeles · ${plural(count, "nominee", "nominees")} on the timetable · One track for every ceremony` + (saved ? " · Your saved ticket is waiting in the envelope" : "") + " · Press Draw for tonight's picture",
      sv: `Välkommen till Union Station · ${count} nominerade på tidtabellen` + (saved ? " · Din sparade biljett väntar i kuvertet" : "") + " · Tryck på Dra kvällens film för din biljett",
    });
  },
  drawnTicker(row, catalog) {
    const f = row.film,
      tr = T.track(f, catalog),
      shelf = shelfEn(f);
    return `Now boarding: ${f.t} (${f.y})${shelf ? " · " + shelf : ""} · Departs ${T.hhmm(row.time)} from track ${tr}` + (swedish ? ` · Avgår från spår ${tr}` : "") + " · All aboard";
  },
  arrivalsTicker(rows, count) {
    if (!count) return both(this, { en: "No arrivals yet · The films you watch arrive here", sv: "Inga ankomster ännu · Filmerna du ser anländer hit" });
    const last = rows[0],
      stars = last.rating ? " " + T.flapStars(last.rating) : "";
    return `Arrivals · ${count === 1 ? "1 film has" : count + " films have"} arrived · Latest: ${last.film.t} (${last.film.y})${stars}` + (swedish ? ` · ${count} ${count === 1 ? "film har" : "filmer har"} anlänt` : "") + " · Thank you for traveling with us";
  },
  updating() {
    return both(this, { en: "Updating the timetable", sv: "Tidtabellen uppdateras" });
  },
  /** A 1940s newsreel voice: "Ladies and gentlemen…". In Swedish mode, in Swedish. */
  announcement(row, catalog) {
    const f = row.film,
      tr = T.track(f, catalog),
      c = Number.isInteger(f.c) ? f.c : null;
    if (swedish) {
      const shelf = c ? { W: `Vinnare av Bästa film vid den ${T.ordSv(c)} galan. `, N: `Nominerad till Bästa film vid den ${T.ordSv(c)} galan. ` }[f.s] || "" : "";
      return `Mina damer och herrar, kvällens film: ${f.t}, från ${f.y}. ${shelf}Hollywood Limited klockan ${T.hhmm(row.time).replace(":", ".")} avgår från spår ${tr}. Välkommen ombord, och njut av filmen!`;
    }
    const shelf = c ? { W: `Winner of Best Picture at the ${T.ordEn(c)} Academy Awards. `, N: `Nominated for Best Picture at the ${T.ordEn(c)} Academy Awards. ` }[f.s] || "" : "";
    return `Ladies and gentlemen, tonight's feature: ${f.t}, from ${f.y}. ${shelf}The ${T.time12(row.time)} Hollywood Limited is now boarding on track ${tr}. All aboard, and enjoy the picture!`;
  },
  chip: (f, catalog) => (f.tri && f.ord > 1 ? "Next part" : catalog.isWinner(f) ? "Tonight’s winner" : "Tonight’s picture"),
  draw: { fresh: { en: "Draw tonight’s picture", sv: "Dra kvällens film" }, again: { en: "Draw again", sv: "Dra igen" }, pending: { en: "Print your saved ticket", sv: "Skriv ut biljetten" } },
  live: KUVERT_C.live,
  ticket: {
    head: () => "Union Station · Admit one",
    number: (n, total) => "No. " + n + " / " + total,
    fields: KUVERT_C.ticket.fields,
    take: { en: "Take your ticket", sv: "Ta biljetten" },
    note: KUVERT_C.ticket.note,
    from: () => "Union Station",
    trackLabel: "Track",
    stamp: (date) => "UNION STATION · L.A. · " + date + " ·",
    soon: (m) => ({ en: "in " + m + " min", sv: "om " + m + " min" }),
    boarding: { en: "Now boarding", sv: "Ombordstigning" },
  },
  voice: { pick: (voices) => (swedish ? swedishVoice(voices) : americanVoice(voices)), lang: () => (swedish ? "sv-SE" : "en-US"), rate: 0.97, pitch: 0.9 },
  sounds: "nbc",
};

// ---------------------------------------------------------------- Dark Territory (SEAGAL)
// Every train's status is its own, the same each visit; tonight's target is GO.
const STATUS = [["HOLD", "Holding"], ["DARK", "Dark territory"], ["HOT", "Hot"], ["LIVE", "Live"], ["LOCK", "Locked down"]];
const statusOf = (row) => (row.hl ? ["GO", "Go"] : STATUS[[...row.film.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % STATUS.length]);
const DIGITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
/** "1940Z" as a dispatcher says it: "1940 Zulu", digit by digit when it starts with a zero. */
export const spokenZulu = (z) => (z.startsWith("0") ? [...z.slice(0, 4)].map((d) => DIGITS[d]).join(" ") : z.slice(0, 4)) + " Zulu";
export const DARK_TERRITORY = {
  id: "depot",
  local: "en",
  name: "Dark Territory",
  place: "Restricted rail depot",
  tagline: () => "Every target leaves from here. No signals, no radio contact. Deploy, and take your orders.",
  leave: { en: "Back to the case file" },
  toStation: { en: "Go to the depot" },
  clock: "Zulu",
  tray: () => "Your orders print here.",
  horse: { title: "Target lock", label: "Tap the reticle" },
  boards: {
    dep: { name: { en: "Deployments" }, labels: { time: { en: "ZULU" }, year: { en: "YEAR" }, title: { en: "TARGET" }, track: { en: "LINE" }, rem: { en: "STATUS" } } },
    arr: { name: { en: "Neutralized" }, labels: { date: { en: "DATE" }, year: { en: "YEAR" }, title: { en: "TARGET" }, stars: { en: "RATING" } } },
  },
  time: T.zulu,
  months: T.MONTHS_EN,
  rem: (row) => statusOf(row)[0],
  remText: (row) => (row.hl ? "Tonight's target. " : "") + statusOf(row)[1],
  // The screen-reader table's column headers.
  heads: { dep: ["Zulu time", "Target", "Year", "Line", "Status"], arr: ["Date", "Target", "Year", "Rating"] },
  empty: { done: "ALL CLEAR", none: "NO TARGETS", arrivals: "NONE YET" },
  counts: { some: (n) => plural(n, "target", "targets") + " on the board", done: "Every target is neutralized.", none: "No targets match tonight’s filters." },
  idleTicker({ count, saved, allWatched }) {
    if (!count) return allWatched ? "All targets neutralized · Final orders wait in the case file" : "No targets match tonight's filters · Adjust them on the Mission page";
    return `Dark Territory rail depot · ${plural(count, "target", "targets")} on the board · No signals · No radio contact` + (saved ? " · Sealed orders waiting in the case file" : "") + " · Press Deploy for tonight's orders";
  },
  drawnTicker: (row, catalog) => `Target acquired: ${row.film.t} (${row.film.y}) · Deploys ${T.zulu(row.time)} on line ${T.track(row.film, catalog)} · Godspeed`,
  arrivalsTicker(rows, count) {
    if (!count) return "Nothing neutralized yet · Completed missions are logged here";
    const last = rows[0],
      stars = last.rating ? " " + T.flapStars(last.rating) : "";
    return `Neutralized · ${plural(count, "target", "targets")} down · Last: ${last.film.t} (${last.film.y})${stars} · Mission log updated`;
  },
  updating: () => "Decrypting the board",
  /** A radio dispatcher. */
  announcement: (row, catalog) => `Dispatch to all units. Target acquired: ${row.film.t}, ${row.film.y}. Deployment at ${spokenZulu(T.zulu(row.time))}, line ${T.track(row.film, catalog)}. Take your orders. Dispatch out.`,
  chip: (f) => (f.tri && f.ord > 1 ? "Next mission" : "Tonight’s target"),
  draw: { fresh: { en: "Deploy", note: "Draw tonight’s target" }, again: { en: "Redeploy", note: "Draw another target" }, pending: { en: "Open sealed orders", note: "Print your saved target" } },
  live: {
    dep: () => "Deployments.",
    arr: () => "Neutralized: the targets you've taken down, latest first.",
    updating: () => "Decrypting the board…",
    drawn: (v) => `Tonight's target: ${v.title} (${v.year}). Deploys ${v.time} on line ${v.track}. Your orders are printed below.`,
  },
  ticket: {
    head: () => "Dark Territory · Deployment order",
    number: (n, total) => "Case " + n + " / " + total,
    fields: (v) => [["Deploys", v.time, true], ["Line", v.track], ["Clearance", "Top secret"]],
    take: { en: "Take your orders" },
    note: () => "Rate it and mark it neutralized there.",
    from: () => "Dark Territory",
    trackLabel: "Line",
    stamp: (date) => "CLASSIFIED · " + date + " ·",
    reticle: true,
    soon: (m) => ({ en: "T-minus " + m + " min" }),
    boarding: { en: "Deploying now" },
  },
  voice: { pick: americanVoice, lang: () => "en-US", rate: 1.06, pitch: 0.8 },
  sounds: "radio",
  terminal: true,
};

/** The station for this list: SEAGAL's depot, Galan's Union Station, or Kuvert C. */
export const stationFor = ({ seagal, gala }) => (seagal ? DARK_TERRITORY : gala ? UNION_STATION : KUVERT_C);
