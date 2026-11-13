// What an award calls its own things. A list follows an award by naming it (`award` in its definition);
// the built-in list and Galan follow the Oscars. A list that follows none gets plain words: "the 3rd
// ceremony", "Deserved the win?". The words are English, like every key in Kuvert: Swedish comes from
// js/i18n/sv.js. A film's `c` is the award's ceremony, counted from its first.
import { BEST_PICTURE_FIELD } from "./catalogue.js";

export const AWARDS = {
  oscars: {
    prize: "Best Picture", // "Did Rocky deserve Best Picture?"
    event: "Academy Awards", // "Lost to Rocky at the 49th Academy Awards."
    trophy: "Oscar", // "you'd hand 2 Oscars to another film"
    field: (c) => BEST_PICTURE_FIELD[c - 1] || null, // how many films competed at ceremony c, if the list has them all
  },
};

/** The award a list follows, or null. */
export function awardFor(list) {
  return AWARDS[list.award] || (!list.custom || list.id === "gala" ? AWARDS.oscars : null);
}
