// The Swedish calendar the dala horse keeps (js/ui/horse.js). On some days of the year it wears something
// (js/ui/outfits.js): a witch's kerchief at Easter, a student's cap on Valborg, the flag on the National Day,
// flowers at Midsummer, a paper hat in the crayfish season, a bun on cinnamon bun day, Saint Bridget's crown
// on her day, candles on Lucia, a tomte's cap over Christmas. A day here is one of Kuvert's, which lasts
// until four in the morning (js/state/dates.js): at one o'clock on the night after Lucia the candles are
// still lit.
import { defaultWatchDate, isoToDate } from "./dates.js";

/** Easter Sunday in the Gregorian calendar, by the computus of Meeus, Jones and Butcher. */
export function easterSunday(year) {
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100,
    h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30,
    l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7,
    n = h + l - 7 * Math.floor((a + 11 * h + 22 * l) / 451) + 114;
  return new Date(year, Math.floor(n / 31) - 1, (n % 31) + 1, 12);
}

/** Midsummer Eve: the Friday that falls between 19 and 25 June. */
export function midsummerEve(year) {
  const d = new Date(year, 5, 19, 12);
  d.setDate(19 + ((5 - d.getDay() + 7) % 7));
  return d;
}

/** How many days after `from` the day (month, day, year) falls; negative before it. */
const daysAfter = (from, m, d, y) => Math.round((new Date(y, m - 1, d, 12) - from) / 86400000);

// What it wears (an outfit in js/ui/outfits.js), the days it wears it (month, day, year), and what it says
// when patted. In the year's order; no two share a day.
const OCCASIONS = [
  // Easter, from Maundy Thursday, when the witches fly off to Blåkulla, to Easter Monday.
  { id: "pask", greeting: "Glad påsk!", on: (m, d, y) => daysAfter(easterSunday(y), m, d, y) >= -3 && daysAfter(easterSunday(y), m, d, y) <= 1 },
  // Walpurgis Night, the last of April: bonfires, and students in their caps.
  { id: "valborg", greeting: "Glad Valborg!", on: (m, d) => m === 4 && d === 30 },
  { id: "nationaldag", greeting: "Glad nationaldag!", on: (m, d) => m === 6 && d === 6 },
  // Midsummer Eve and Midsummer Day.
  { id: "midsommar", greeting: "Glad midsommar!", on: (m, d, y) => daysAfter(midsummerEve(y), m, d, y) >= 0 && daysAfter(midsummerEve(y), m, d, y) <= 1 },
  // The crayfish season: from the seventh of August, the old first day of fishing, to the end of the month.
  { id: "kraftskiva", greeting: "Skål!", on: (m, d) => m === 8 && d >= 7 },
  // Cinnamon bun day.
  { id: "kanelbulle", greeting: "Kanelbulle?", on: (m, d) => m === 10 && d === 4 },
  // Saint Bridget of Sweden, on the day Sweden keeps for her: the seventh of October, when she was made a
  // saint, which is the name day of every Birgitta too.
  { id: "birgitta", greeting: "Grattis, Birgitta!", on: (m, d) => m === 10 && d === 7 },
  { id: "lucia", greeting: "Glad Lucia!", on: (m, d) => m === 12 && d === 13 },
  // Christmas Eve, Christmas Day and the day after.
  { id: "jul", greeting: "God jul!", on: (m, d) => m === 12 && d >= 24 && d <= 26 },
];

/** Today's occasion ({ id, greeting }), or null on an ordinary day. */
export function occasion(now = new Date()) {
  const day = isoToDate(defaultWatchDate(now));
  const found = OCCASIONS.find((o) => o.on(day.getMonth() + 1, day.getDate(), day.getFullYear()));
  return found ? { id: found.id, greeting: found.greeting } : null;
}
