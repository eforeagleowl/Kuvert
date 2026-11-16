// The Swedish calendar the dala horse keeps (js/ui/horse.js). On a few days of the year it wears something:
// a crown of candles on Lucia, a tomte's cap over Christmas, a crown of flowers at Midsummer. A day here is
// one of Kuvert's, which lasts until four in the morning (js/state/dates.js): at one o'clock on the night
// after Lucia the candles are still lit.
import { defaultWatchDate, isoToDate } from "./dates.js";

/** Midsummer Eve: the Friday that falls between 19 and 25 June. */
export function midsummerEve(year) {
  const d = new Date(year, 5, 19, 12);
  d.setDate(19 + ((5 - d.getDay() + 7) % 7));
  return d;
}

// What it wears, the days it wears it (month, day, year), and what it says when patted.
const OCCASIONS = [
  { id: "lucia", greeting: "Glad Lucia!", on: (m, d) => m === 12 && d === 13 },
  // Christmas Eve, Christmas Day and the day after.
  { id: "jul", greeting: "God jul!", on: (m, d) => m === 12 && d >= 24 && d <= 26 },
  // Midsummer Eve and Midsummer Day.
  { id: "midsommar", greeting: "Glad midsommar!", on: (m, d, y) => m === 6 && d - midsummerEve(y).getDate() >= 0 && d - midsummerEve(y).getDate() <= 1 },
];

/** Today's occasion ({ id, greeting }), or null on an ordinary day. */
export function occasion(now = new Date()) {
  const day = isoToDate(defaultWatchDate(now));
  const found = OCCASIONS.find((o) => o.on(day.getMonth() + 1, day.getDate(), day.getFullYear()));
  return found ? { id: found.id, greeting: found.greeting } : null;
}
