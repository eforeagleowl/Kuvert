// Award lists: every winner of one prize, as a list of its own beside Kuvert's and the envelopes. Each
// follows an award (js/data/awards.js) for its wording, and takes its films from the film table, so
// what you have watched anywhere in Kuvert is already watched here (js/state/shared.js).
//
// To add one: its winners as rows in a file of their own (see bafta.js), its words in awards.js, and an
// entry here. Bump `version` when a ceremony is added: installed copies are rebuilt, and since film ids
// never change, progress stays (js/views/journeys.js upgradeCurated).
import { listed } from "./films.js";
import { BAFTA_WINNERS, BAFTA_FIRST_YEAR, BAFTA_SOURCE } from "./bafta.js";

// A winner as the list carries it. Series are left out: an award list rarely has every part, and a
// series plays in order only where it is whole.
const winners = (rows) => rows.flatMap(([c, ...ids]) => ids.map((id) => { const { tri: _tri, ord: _ord, ...film } = listed(id, { s: "W", c }); return film; }));

export const AWARD_LISTS = [
  {
    id: "bafta", version: 1, award: "bafta", palette: "natt", art: "bafta", badge: "BAFTA", series: {},
    name: "BAFTA Best Film",
    title: { en: "BAFTA Best Film", sv: "BAFTA: Bästa film" },
    subtitle: { en: "Every film the British Academy has named the best of its year", sv: "Alla filmer som brittiska filmakademin har utsett till årets bästa" },
    shelves: { W: { chip: "Won", label: "Best Film winner", plural: "Winners", winner: true } },
    ceremonies: BAFTA_WINNERS.length, firstYear: BAFTA_FIRST_YEAR, lastYear: BAFTA_FIRST_YEAR + BAFTA_WINNERS.length - 1,
    source: BAFTA_SOURCE,
    films: winners(BAFTA_WINNERS),
  },
];
