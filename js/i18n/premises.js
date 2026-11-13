// What a film is about, in one line. The lines are a file per language (js/data/premises-en.js and
// premises-sv.js), fetched when the first ticket asks for one: Kuvert starts without them, and offline
// they come from the service worker's copy like everything else.
import { swedish } from "./index.js";

let lines = null;

/** @returns {Promise<Record<string, string>>} film id → its line, in the page's language */
export function premises() {
  lines ||= import(swedish ? "../data/premises-sv.js" : "../data/premises-en.js").then(
    (m) => m.PREMISES,
    () => {
      // Couldn't be fetched just now: the ticket goes without, and the next one asks again.
      lines = null;
      return {};
    },
  );
  return lines;
}
