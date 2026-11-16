// The poster lights the room: two colours taken from a film's poster become the glow behind its ticket
// (css/tonight.css, .stage::before). A black-and-white poster gives a silver light.

const HUES = 12;
// Silver, a little warmer on one side: the light of a film with no colour in it.
const SILVER = [
  [176, 186, 202],
  [170, 158, 142],
];

/**
 * The two colours that carry a picture, from its RGBA pixels: [[r, g, b], [r, g, b]], or null when there
 * is nothing to see. Vivid, mid-bright pixels count for most; black bars and white borders for nothing.
 */
export function pickColours(data) {
  const bins = Array.from({ length: HUES }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  let seen = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    seen++;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d = max - min,
      light = (max + min) / 510;
    if (!d || light < 0.07 || light > 0.95) continue;
    const sat = d / (255 - Math.abs(max + min - 255));
    if (sat < 0.18) continue;
    const hue = ((max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360;
    const w = sat * sat * (1 - Math.abs(light - 0.5) * 1.2);
    if (w <= 0) continue;
    const bin = bins[Math.floor(hue / (360 / HUES)) % HUES];
    bin.w += w;
    bin.r += r * w;
    bin.g += g * w;
    bin.b += b * w;
  }
  if (!seen) return null;
  const ranked = bins.map((x, i) => ({ ...x, i })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w);
  if (!ranked.length || ranked.reduce((n, x) => n + x.w, 0) < seen * 0.004) return SILVER.map((c) => [...c]);
  const colour = (x) => [x.r / x.w, x.g / x.w, x.b / x.w].map(Math.round);
  const apart = (a, b) => Math.min(Math.abs(a - b), HUES - Math.abs(a - b));
  const first = ranked[0],
    second = ranked.find((x) => apart(x.i, first.i) >= 2 && x.w >= first.w * 0.12);
  const a = colour(first);
  // A poster in one colour lights the other side with the same colour, paler.
  return [a, second ? colour(second) : a.map((v) => Math.round(v * 0.55 + 90))];
}

const luminance = (colour) => {
  const [r, g, b] = colour.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
// As much light as a colour may give: above this, a yellow or a pale poster would wash out the words
// that sit on the page around the ticket.
const BRIGHTEST = 0.24;
/**
 * A picked colour as a light: first as bright as its hue goes, so a dark poster still glows, then down to
 * a brightness that leaves the page readable, so a yellow one doesn't glare.
 */
export function asLight([r, g, b]) {
  let colour = [r, g, b].map((v) => (v * 235) / Math.max(r, g, b, 1));
  const l = luminance(colour);
  if (l > BRIGHTEST) colour = colour.map((v) => v * (BRIGHTEST / l) ** (1 / 2.2));
  return colour.map((v) => Math.min(255, Math.round(v)));
}

let canvas = null;
/**
 * The light of a picture a canvas can draw (an image that has loaded, a bitmap): two colours as
 * [r, g, b], or null when there is nothing to see or the page may not read it (an image served without
 * permission to).
 */
export function lightOf(picture) {
  try {
    canvas ??= Object.assign(document.createElement("canvas"), { width: 24, height: 36 });
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, 24, 36);
    ctx.drawImage(picture, 0, 0, 24, 36);
    const picked = pickColours(ctx.getImageData(0, 0, 24, 36).data);
    return picked && picked.map(asLight);
  } catch {
    return null;
  }
}
/** The light of a poster on the page, once it has loaded: two CSS colours, or null. */
export function posterLight(img) {
  if (!img || img.hidden || !img.complete || !img.naturalWidth) return null;
  const lights = lightOf(img);
  return lights && lights.map(([r, g, b]) => "rgb(" + r + " " + g + " " + b + ")");
}
