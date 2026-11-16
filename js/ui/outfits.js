// What the dala horse wears on the days it keeps (js/state/calendar.js), drawn in the horse's own box: a
// hundred units by ninety, the horse facing left. Everything sits on the brow, a line from the forehead to
// behind the ear, and is drawn large for its size: on a phone the whole horse is some fifty pixels wide.
// The colours are each thing's own, whatever the palette: candle white, lingon green, the flag's blue.
import { s } from "./dom.js";

const BROW = { x: 15.2, y: 14.8, dx: 15.4, dy: -4.6 },
  LENGTH = Math.hypot(BROW.dx, BROW.dy),
  SLOPE = (Math.atan2(BROW.dy, BROW.dx) * 180) / Math.PI;
/** A point along the brow (0 at the forehead, 1 behind the ear), raised `up` above it. */
const brow = (at, up = 0) => [BROW.x + BROW.dx * at + (BROW.dy / LENGTH) * up, BROW.y + BROW.dy * at - (BROW.dx / LENGTH) * up].map((v) => +v.toFixed(2));

const C = {
  white: "#fbf5e6",
  cream: "#fdfaf0",
  green: "#3a7a3c",
  leaf: "#5c9c46",
  berry: "#d23a32",
  flame: "#ffc94f",
  red: "#cf332c",
  redDeep: "#8d1f1b",
  blue: "#4f7fe0",
  yellow: "#f7cf4d",
  ochre: "#b8901f",
  pink: "#ee6a86",
  gold: "#f2b93b",
  orange: "#e07f24",
  black: "#1d2430",
  flagBlue: "#0a6aa7",
  flagYellow: "#fecb00",
  wood: "#e2cfa8",
  bun: "#cf9550",
  crust: "#8a5524",
  veil: "#2c313c",
  shine: "#68758c",
};
const dot = (fill, [cx, cy], r) => s("circle", { fill, cx, cy, r });
const line = (d, colour, width, cap = "round") => s("path", { d, fill: "none", stroke: colour, "stroke-width": width, "stroke-linecap": cap, "stroke-linejoin": "round" });
const shape = (d, fill, edge = null, width = 0.5) => s("path", { d, fill, ...(edge ? { stroke: edge, "stroke-width": width, "stroke-linejoin": "round" } : {}) });
/** A size too large for the head, so a crown still reads on a horse forty pixels wide. */
const larger = (...parts) => s("g", { transform: "translate(22.5 17) scale(1.32) translate(-22.5 -17)" }, parts);
/** Its own corner of the brow: x runs back along the brow from that point, y down across it. */
const onBrow = (at, up, ...parts) => s("g", { transform: "translate(" + brow(at, up).join(" ") + ") rotate(" + SLOPE.toFixed(1) + ")" }, parts);

const CANDLES = [0.12, 0.38, 0.64, 0.9],
  BLOOMS = [
    [C.cream, C.gold, 0.02],
    [C.blue, C.cream, 0.26],
    [C.yellow, C.orange, 0.5],
    [C.pink, C.cream, 0.74],
    [C.cream, C.gold, 0.98],
  ];
const leaf = (at, up, turn) => s("ellipse", { fill: C.leaf, cx: brow(at, up)[0], cy: brow(at, up)[1], rx: 2.5, ry: 1.15, transform: "rotate(" + (SLOPE + turn).toFixed(1) + " " + brow(at, up).join(" ") + ")" });

/** Each of these draws one thing to wear: the parts, back to front. Named as the calendar names its days. */
export const OUTFITS = {
  // Easter: the kerchief of a påskkärring, the Easter witch children dress up as, knotted under the chin,
  // and a rosy cheek.
  pask: () => [
    shape("M" + brow(-0.03, 0.2) + " C17.5 7.5 21.5 1 24.5 1.2 C28.5 1.5 33 6 33.6 11.2 C33.5 17 30.5 23.5 26.2 29.8 L23.3 30.6 C24.2 24.5 24.2 19.5 22.6 15.2 Z", C.yellow, C.ochre),
    shape("M24.4 30 L20.8 34.8 L24.6 33.6 Z M25 30 L29 34.4 L25.4 33.8 Z", C.yellow, C.ochre),
    [[19.8, 9.2], [24.6, 5.2], [29.4, 8.6], [27.6, 14.6], [30.2, 19.6], [27, 24.6], [23.6, 10.6]].map((at) => dot(C.berry, at, 0.85)),
    dot("#f08aa0", [15.4, 25.4], 2.3),
  ],
  // Valborg, the last of April: the white student's cap, its black peak out over the forehead.
  valborg: () => [
    shape("M" + brow(-0.04, 1) + " C" + brow(-0.3, 6.4) + " " + brow(0.16, 9.6) + " " + brow(0.52, 9.4) + " C" + brow(0.9, 9.2) + " " + brow(1.34, 6.4) + " " + brow(1.06, 1) + " Z", C.white, "#cfc6b0"),
    shape("M" + brow(0.08, -1.4) + " Q" + brow(-0.26, -3.6) + " " + brow(-0.46, -2.2) + " Q" + brow(-0.24, 0.2) + " " + brow(0.02, 1) + " Z", C.black, C.shine, 0.6),
    line("M" + brow(-0.03) + " L" + brow(1.05), C.black, 3.2),
    dot(C.flagYellow, brow(0.13, 0.2), 1.7),
    dot(C.flagBlue, brow(0.13, 0.2), 0.85),
  ],
  // The National Day, the sixth of June: the flag, flying back from its pole. Sixteen by ten, as the law has it.
  nationaldag: () => [
    line("M" + brow(0.62, 0) + " L" + brow(0.62, 20), C.wood, 1.4),
    dot(C.flagYellow, brow(0.62, 20.6), 1),
    onBrow(0.62, 19.6, s("rect", { x: 0.6, y: 0, width: 14.4, height: 9, fill: C.flagBlue }), s("rect", { x: 5.1, y: 0, width: 1.8, height: 9, fill: C.flagYellow }), s("rect", { x: 0.6, y: 3.6, width: 14.4, height: 1.8, fill: C.flagYellow })),
  ],
  // Midsummer: a crown of flowers.
  midsommar: () =>
    larger(
      line("M" + brow(0) + " L" + brow(1), C.green, 3.8),
      [0.14, 0.38, 0.62, 0.86].map((at, i) => [leaf(at, 3.4, i % 2 ? 50 : -50), leaf(at, -0.2, i % 2 ? -40 : 40)]),
      BLOOMS.map(([petals, heart, at]) => [dot(petals, brow(at, 1.3), 2.9), dot(heart, brow(at, 1.3), 1.1)]),
    ),
  // The crayfish season, August: the paper hat of a kräftskiva, a crayfish printed on it.
  kraftskiva: () => [
    shape("M" + brow(0.04, 0.4) + " L" + brow(0.5, 21) + " L" + brow(0.96, 0.4) + " Z", C.yellow, C.ochre),
    onBrow(
      0.5,
      0,
      s("ellipse", { cx: 0, cy: -5.4, rx: 1.5, ry: 3, fill: C.red }),
      shape("M-2.3 -1.2 L0 -3.2 L2.3 -1.2 Z", C.red),
      line("M-1 -7.2 L-2.7 -9.3 M1 -7.2 L2.7 -9.3", C.red, 1),
      s("ellipse", { cx: -2.9, cy: -10.5, rx: 1.05, ry: 1.6, fill: C.red, transform: "rotate(-16 -2.9 -10.5)" }),
      s("ellipse", { cx: 2.9, cy: -10.5, rx: 1.05, ry: 1.6, fill: C.red, transform: "rotate(16 2.9 -10.5)" }),
    ),
    dot(C.red, brow(0.5, 21.6), 2),
  ],
  // Cinnamon bun day, the fourth of October: a bun, pearl sugar and all, carried on the head.
  kanelbulle: () =>
    onBrow(
      0.5,
      5.6,
      s("ellipse", { cx: 0, cy: 0, rx: 8.6, ry: 5.8, fill: C.bun, stroke: C.crust, "stroke-width": 0.7 }),
      line("M-6 0.8 C-5.8 -3.6 3.8 -4.8 5.3 -1 C6.3 2.2 0.6 4.2 -2.3 2.1 C-4.2 0.6 -1.7 -1.9 0.6 -1.1 C2 -0.5 1.5 1 0.2 0.8", C.crust, 1.1),
      [[-3.9, -2], [-0.9, -3.4], [2.6, -3], [4.9, 0.7], [1.7, 2.8], [-3.3, 2.4]].map((at) => dot(C.cream, at, 0.7)),
    ),
  // Saint Bridget of Sweden, the seventh of October: the crown of her order over a black veil. White linen,
  // a band round the head and two across it, with a red mark where they meet.
  birgitta: () => [
    shape("M" + brow(0, 0.6) + " C" + brow(0.06, 8.6) + " " + brow(0.8, 10.4) + " " + brow(1.1, 3.6) + " C36.4 8.6 38.8 14 39 25.4 C35.4 27.8 31.4 28 27.8 26.6 C28.2 21.5 27.7 16.6 26.6 " + brow(0.74)[1] + " Z", C.veil, C.shine, 0.6),
    line("M" + brow(0.02, 0.2) + " L" + brow(1, 0.2), C.white, 2.4),
    line("M" + brow(0.04, 0.8) + " Q" + brow(0.5, 14) + " " + brow(0.98, 0.8), C.white, 2),
    line("M" + brow(0.5, 0.8) + " L" + brow(0.5, 7.2), C.white, 2),
    [brow(0.04, 0.5), brow(0.5, 0.3), brow(0.98, 0.5), brow(0.5, 7.3)].map((at) => dot(C.berry, at, 1.05)),
  ],
  // Lucia, the thirteenth of December: a crown of lingon sprigs, berries and all, and four lit candles.
  lucia: () =>
    larger(
      line("M" + brow(0) + " L" + brow(1), C.green, 3.8),
      [0.25, 0.51, 0.77].map((at) => dot(C.berry, brow(at, -0.3), 0.95)),
      CANDLES.map((at) => line("M" + brow(at, 1.4) + " L" + brow(at, 9.6), C.white, 2.8, "butt")),
      CANDLES.map((at) => dot(C.flame, brow(at, 11.8), 2)),
    ),
  // Christmas: the tomte's red cap, its tip fallen back over the neck.
  jul: () => [
    shape("M" + brow(-0.05, 0.4) + " C16 2 21.5 -4.5 28 -2.5 C33 -1 37.5 3 39.8 8 C36.5 6.8 33.5 7.6 " + brow(1.05, 0.4) + " Z", C.red, C.redDeep, 0.7),
    line("M" + brow(-0.06) + " L" + brow(1.06), C.white, 4.4),
    dot(C.white, [40.2, 8.8], 3.1),
  ],
};
