// Every ticket is engraved for its film: a band of woven lines along its top edge and a rosette in the
// paper, both drawn from the film's id, the way printed tickets and banknotes carry a pattern of their own.
// The same film always gets the same engraving; no two films share one.

/** A number from a string, the same every time. */
export function seedOf(text) {
  let h = 2166136261;
  for (const c of String(text)) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// A small repeatable sequence of numbers between 0 and 1 (mulberry32).
function sequence(seed) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const n = (v) => Math.round(v * 100) / 100;

/**
 * The engraving for one film: SVG path data for the band (a 600 × 12 box, stretched to the ticket's
 * width) and for the rosette (a 200 × 200 box), with the numbers they were drawn from.
 */
export function engraving(id) {
  const next = sequence(seedOf(id));
  const pick = (from, to) => from + Math.floor(next() * (to - from + 1));
  // The band: lines of one long wave and one short ripple, each a step out of phase with the last.
  const waves = pick(9, 17),
    ripple = pick(2, 4) * waves + pick(1, 3),
    lines = pick(5, 7),
    lean = next() * Math.PI * 2;
  const band = Array.from({ length: lines }, (_, k) => {
    const phase = lean + (k / lines) * Math.PI * 2;
    let d = "";
    for (let x = 0; x <= 600; x += 2) {
      const a = (x / 600) * Math.PI * 2;
      d += (x ? "L" : "M") + x + " " + n(6 + 3.5 * Math.sin(waves * a + phase) + 1.2 * Math.sin(ripple * a - phase * 2));
    }
    return d;
  });
  // The rosette: rings of petals, each ring turned against the one inside it, with a fine ripple on top.
  const petals = pick(7, 16),
    rings = pick(4, 6),
    fine = pick(2, 4) * petals + (next() < 0.5 ? 1 : -1),
    twist = next() * Math.PI;
  const rosette = Array.from({ length: rings }, (_, k) => {
    const base = 26 + k * (52 / rings),
      depth = 7 + k * 1.8,
      turn = twist * (k % 2 ? 1 : -1) + (k * Math.PI) / petals;
    let d = "";
    for (let i = 0; i < 360; i++) {
      const a = (i / 360) * Math.PI * 2,
        r = base + depth * Math.cos(petals * a + turn) + 2.2 * Math.cos(fine * a - turn);
      d += (i ? "L" : "M") + n(100 + r * Math.cos(a)) + " " + n(100 + r * Math.sin(a));
    }
    return d + "Z";
  });
  return { band, rosette, waves, lines, petals, rings };
}
