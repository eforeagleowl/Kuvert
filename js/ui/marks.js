// The envelope collects a mark for each milestone earned (js/state/stats.js, envelopeMarks): the wavy
// lines of a postmark, a registered-mail label, an airmail label, an express stamp, a gold seal. They sit
// on the envelope's front, each in its own place (css/tonight.css).
import { h, s } from "./dom.js";

const WAVES = [4, 9.5, 15, 20.5];

/** One mark as an element. `title` says which milestone it is for. */
export function envelopeMark({ kind, title, n }) {
  const mark = (...kids) => h("span", { class: "mark mark-" + kind, attrs: { title } }, ...kids);
  if (kind === "waves") return mark(s("svg", { viewBox: "0 0 60 24" }, ...WAVES.map((y) => s("path", { d: "M1 " + y + " q7.25 -5 14.5 0 t14.5 0 t14.5 0 t14.5 0" }))));
  if (kind === "rek") return mark(h("b", { text: "R" }), h("span", {}, "Kuvert", h("br"), "Nr " + String(n).padStart(3, "0")));
  if (kind === "flyg") return mark(h("span", { text: "Par avion" }), h("small", { text: "Flygpost" }));
  if (kind === "express") return mark("Express");
  return mark(s("svg", { viewBox: "0 0 24 20" }, s("use", { href: "#crowns" })), h("b", { text: String(n) }));
}
