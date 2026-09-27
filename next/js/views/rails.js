// Wide screens only: stubs of your latest films on the left, a bar per decade on the right, and kurbits
// flowers (Dalarna folk painting) down both margins that get painted in as you watch.
import { $, h, s } from "../ui/dom.js";
import { decadeOf } from "../state/catalog.js";
import { fmtDay } from "../state/dates.js";
import { recentWatched, starText } from "../state/stats.js";

const BLOOMS_PER_SIDE = 8;

export class Rails {
  constructor(app) {
    this.app = app;
    if (app.seagal) return;
    for (const side of ["kurbitsLeft", "kurbitsRight"])
      $(side).replaceChildren(
        ...Array.from({ length: BLOOMS_PER_SIDE }, (_, i) =>
          h(
            "span",
            { class: "bloom" + ((i + (side === "kurbitsRight" ? 1 : 0)) % 3 === 1 ? " alt" : "") },
            s("svg", { class: "b-line", viewBox: "0 0 40 56" }, s("use", { href: "#kurbits" })),
            s("svg", { class: "b-paint", viewBox: "0 0 40 56" }, s("use", { href: "#kurbits" })),
          ),
        ),
      );
  }
  render() {
    if (this.app.seagal) return;
    const { store, catalog, stage } = this.app,
      p = store.p;
    // Painted bottom-up, alternating sides, like a garden growing.
    const total = BLOOMS_PER_SIDE * 2,
      n = p.seen.size,
      painted = !n ? 0 : n >= catalog.films.length ? total : Math.max(1, Math.floor((total * n) / catalog.films.length));
    const left = $("kurbitsLeft").children,
      right = $("kurbitsRight").children;
    for (let k = 0; k < total; k++) (k % 2 ? right : left)[BLOOMS_PER_SIDE - 1 - Math.floor(k / 2)]?.classList.toggle("painted", k < painted);

    const films = recentWatched(p, catalog);
    $("stubList").replaceChildren(
      ...(films.length
        ? films.map((f) => {
            const r = p.reviews[f.id]?.rating;
            return h(
              "li",
              {},
              h(
                "button",
                {
                  class: "stub",
                  type: "button",
                  dataset: { key: "stub-" + f.id },
                  attrs: { "aria-label": "Open your ticket for " + f.t + (r ? ", " + r + (r === 1 ? " star" : " stars") : "") },
                  on: { click: () => stage.openFilm(f.id) },
                },
                h("b", { text: f.t }),
                h("small", { text: f.y + (p.dates[f.id] ? " · " + fmtDay(p.dates[f.id]) : "") }),
                r ? h("span", { class: "stub-stars", text: starText(r) }) : null,
              ),
            );
          })
        : [h("li", {}, h("div", { class: "stub empty-stub" }, h("b", { text: "Your stubs land here" }), h("small", { text: "After your first film" })))]),
    );
    const byDec = new Map();
    for (const f of catalog.films) {
      const c = byDec.get(decadeOf(f)) || byDec.set(decadeOf(f), { t: 0, w: 0 }).get(decadeOf(f));
      c.t++;
      if (p.seen.has(f.id)) c.w++;
    }
    $("decadeRailList").replaceChildren(
      ...[...byDec]
        .sort((a, b) => a[0] - b[0])
        .map(([dk, c]) =>
          h(
            "li",
            {},
            h(
              "button",
              {
                class: "dec-row" + (c.w === c.t ? " done" : ""),
                type: "button",
                dataset: { key: "rdec-" + dk },
                attrs: { "aria-label": dk + "s: " + c.w + " of " + c.t + " watched. Show them in the Library." },
                on: {
                  click: () => {
                    store.set({ decadeFilter: dk });
                    this.app.router.show("library");
                  },
                },
              },
              h("span", { text: dk + "s" }),
              h("span", { class: "meter" }, h("i", { style: { "--p": Math.round((c.w / c.t) * 100) + "%" } })),
              h("span", { text: c.w + "/" + c.t }),
            ),
          ),
        ),
    );
  }
}
