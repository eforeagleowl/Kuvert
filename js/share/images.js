// Share images for the group chat: a ticket, your ranking and your film year, drawn on a canvas in
// Kuvert's style and sent through the phone's share sheet, or saved as a PNG on desktop. They carry the
// look of the app itself: the ticket is on its decade's paper with the film's own engraving, in the light
// of its poster; the best of a ranking or a year are stamps from the album, postmarked on the day.
import { imageUrl } from "../tmdb/client.js";
import { STAR_PATH } from "../ui/stars.js";
import { HORSE_BODY } from "../ui/horse.js";
import { engraving, stockOf, strikeTurn } from "../ui/engraving.js";
import { lightOf } from "../ui/light.js";
import { slugify } from "../data/lists.js";
import { dayLong } from "../state/dates.js";
import { rankedFilms, ratingOf, stampValue } from "../state/stats.js";
import { download } from "../storage/files.js";
import { t, plural, LOCALE } from "../i18n/index.js";
import { exportLibrary } from "../storage/library-backup.js";
import { passportRecords } from "../journeys/passport.js";
import { reviewYears, pickYear, yearReview } from "../state/year.js";

const F_SEAGAL = '"Michroma", "Arial Black", sans-serif';
const RETICLE = "M50 3a42 42 0 1 0 0.01 0zM50 10a35 35 0 1 1 -0.01 0z M47 0h6v30h-6zM47 60h6v30h-6zM4 42h30v6h-30zM66 42h30v6h-30zM50 40a5 5 0 1 0 0.01 0z";

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
async function loadPoster(path, size = "w500") {
  if (!path) return null;
  try {
    const r = await fetch(imageUrl(size, path), { mode: "cors" });
    if (!r.ok) return null;
    return await createImageBitmap(await r.blob());
  } catch {
    return null;
  }
}
function cssVar(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
function hexRgb(hex) {
  let x = String(hex).trim().replace("#", "");
  if (x.length === 3) x = [...x].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) || 0);
}
// The same as CSS color-mix(in srgb, a weight, b).
function mixHex(a, b, weight) {
  const x = hexRgb(a),
    y = hexRgb(b);
  return "#" + x.map((v, i) => Math.round(v * weight + y[i] * (1 - weight)).toString(16).padStart(2, "0")).join("");
}
function wrapLines(ctx, text, maxWidth, maxLines = 3) {
  const words = String(text).split(/\s+/),
    lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + "…").width > maxWidth && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = last + "…";
  }
  return lines;
}
function spaced(ctx, text, x, y, spacing, align = "left") {
  ctx.textAlign = align;
  if ("letterSpacing" in ctx) ctx.letterSpacing = spacing + "px";
  ctx.fillText(text, x, y);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}
function drawStars(ctx, x, y, size, rating, fill, empty, count = 5) {
  const path = new Path2D(STAR_PATH);
  for (let i = 0; i < count; i++) {
    const part = Math.max(0, Math.min(1, rating - i));
    ctx.save();
    ctx.translate(x + i * size * 1.12, y);
    ctx.scale(size / 24, size / 24);
    ctx.fillStyle = empty;
    ctx.fill(path);
    if (part > 0) {
      ctx.beginPath();
      ctx.rect(0, 0, 24 * part, 24);
      ctx.clip();
      ctx.fillStyle = fill;
      ctx.fill(path);
    }
    ctx.restore();
  }
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
/** The paper and the band of a film's ticket, as the stylesheet has them: its decade's stock, brass for a winner. */
function ticketStock(f, winner, c) {
  const probe = Object.assign(document.createElement("div"), { className: "ticket" + (winner ? " win" : ""), hidden: true });
  probe.dataset.stock = stockOf(f.y);
  document.body.append(probe);
  const style = getComputedStyle(probe),
    stock = { paper: style.getPropertyValue("--stock").trim() || c.paper, band: style.getPropertyValue("--band").trim() || (winner ? c.brass : c.blue) };
  probe.remove();
  return stock;
}
/** Strokes lines drawn in a box of their own (bw by bh) into a place on the canvas, the pen's width unscaled. */
function strokeIn(ctx, lines, x, y, w, h, bw, bh) {
  const place = new DOMMatrix().translateSelf(x, y).scaleSelf(w / bw, h / bh);
  for (const d of lines) {
    const path = new Path2D();
    path.addPath(new Path2D(d), place);
    ctx.stroke(path);
  }
}
/**
 * A stamp from the watched wall's album (css/pages.css, .stamp): perforated paper, the poster, and a foot
 * with Kuvert's name and the stamp's value, which is your stars. Drawn apart from the picture, so that
 * its holes are holes when it is laid on.
 */
function stampCanvas({ w, poster, value, rank, c, F }) {
  const pad = Math.round(w * 0.05),
    aw = w - 2 * pad,
    ah = Math.round(aw * 1.5),
    foot = Math.round(w * 0.115),
    under = Math.round(w * 0.028),
    h = pad + ah + Math.round(w * 0.022) + foot + under;
  const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h }),
    ctx = canvas.getContext("2d");
  const paper = ctx.createLinearGradient(0, 0, w * 0.18, h);
  paper.addColorStop(0, mixHex(c.paper, "#ffffff", 0.94));
  paper.addColorStop(1, mixHex(c.paper, c.ink, 0.92));
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  // The poster, or the horse on a dark ground where there is none.
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad, pad, aw, ah);
  ctx.clip();
  if (poster) {
    const sc = Math.max(aw / poster.width, ah / poster.height);
    ctx.drawImage(poster, pad + (aw - poster.width * sc) / 2, pad + (ah - poster.height * sc) / 2, poster.width * sc, poster.height * sc);
  } else {
    const ground = ctx.createLinearGradient(pad, pad, pad + aw * 0.4, pad + ah);
    ground.addColorStop(0, mixHex(c.house, c.paper, 0.87));
    ground.addColorStop(1, c.deep);
    ctx.fillStyle = ground;
    ctx.fillRect(pad, pad, aw, ah);
    const scale = (aw * 0.5) / 100;
    ctx.translate(pad + aw * 0.25, pad + (ah - 90 * scale) / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = mixHex(c.house, c.paper, 0.76);
    ctx.fill(new Path2D(HORSE_BODY));
  }
  ctx.restore();
  // Its place in the ranking, on a brass tab in the corner.
  if (rank) {
    ctx.font = "700 " + Math.round(w * 0.086) + "px " + F.mono;
    const label = "#" + rank,
      at = pad + Math.round(w * 0.043),
      bh = Math.round(w * 0.125);
    ctx.fillStyle = c.brass;
    roundRect(ctx, at, at, ctx.measureText(label).width + w * 0.1, bh, w * 0.028);
    ctx.fill();
    ctx.fillStyle = c.ink;
    ctx.textBaseline = "middle";
    spaced(ctx, label, at + w * 0.05, at + bh / 2 + 1, 0);
    ctx.textBaseline = "alphabetic";
  }
  // The foot is print: Kuvert's name, and the value. In the album the value is a bare number; here it has
  // a star beside it, for the people in the chat who have never seen the album.
  const base = h - under - Math.round(foot * 0.2);
  ctx.fillStyle = mixHex(c.ink, c.paper, 0.8);
  ctx.font = "600 " + Math.round(w * 0.057) + "px " + F.body;
  spaced(ctx, "KUVERT", pad + 1, base, w * 0.057 * 0.22);
  if (value) {
    const star = w * 0.074;
    ctx.fillStyle = c.ink;
    ctx.font = "700 " + Math.round(w * 0.107) + "px " + F.display;
    spaced(ctx, value, w - pad - star - w * 0.018, base, 0, "right");
    drawStars(ctx, w - pad - star, base - star * 0.93, star, 1, c.ink, c.ink, 1);
  }
  // The perforation: a row of holes bitten out of each edge, a whole number of them to a side.
  const hole = w * 0.0215,
    across = Math.round(w / (hole * 3.4)),
    down = Math.round(h / (hole * 3.4));
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  const bite = (x, y) => {
    ctx.moveTo(x + hole, y);
    ctx.arc(x, y, hole, 0, Math.PI * 2);
  };
  for (let i = 0; i <= across; i++) for (const y of [0, h]) bite((i * w) / across, y);
  for (let j = 1; j < down; j++) for (const x of [0, w]) bite(x, (j * h) / down);
  ctx.fill();
  return canvas;
}
/**
 * The day a film was watched, struck across the corner of its stamp (css/pages.css, .stamp-cancel): two
 * rings and the date, in dark ink with a pale edge, so it reads on the paper, on a dark poster and on the
 * dark of the picture beside it. `d` is the mark's width.
 */
function postmark(ctx, cx, cy, d, date, id, c, F) {
  const [year, month, day] = /^\d{4}-\d\d-\d\d$/.test(date || "") ? date.split("-") : [];
  if (!year) return;
  const k = d / 46,
    pale = (alpha) => "rgba(" + hexRgb(c.paper).join(",") + "," + alpha + ")";
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((strikeTurn(id) * Math.PI) / 180);
  for (const [radius, width] of [[d / 2 - 0.65 * k, 1.3 * k], [d / 2 - 5.7 * k, 0.8 * k]]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = width + 1.6 * k;
    ctx.strokeStyle = pale(0.5);
    ctx.stroke();
    ctx.lineWidth = width;
    ctx.strokeStyle = c.postmark;
    ctx.stroke();
  }
  ctx.font = "700 " + (8.4 * k).toFixed(1) + "px " + F.mono;
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  for (const [text, y] of [[day + "." + month, -1.9 * k], [year, 7.9 * k]]) {
    ctx.lineWidth = 2.2 * k;
    ctx.strokeStyle = pale(0.9);
    ctx.strokeText(text, 0, y);
    ctx.fillStyle = c.postmark;
    ctx.fillText(text, 0, y);
  }
  ctx.restore();
}

export class Share {
  constructor(app) {
    this.app = app;
    this.sharing = false;
  }
  sg(a, b) {
    return this.app.sg(a, b);
  }
  fonts() {
    const seagal = this.app.seagal;
    return {
      display: seagal ? F_SEAGAL : '"Playfair Display", Georgia, "Times New Roman", serif',
      body: seagal ? F_SEAGAL : '"Familjen Grotesk", system-ui, sans-serif',
      mono: seagal ? F_SEAGAL : '"Courier Prime", "Courier New", ui-monospace, monospace',
      // SEAGAL's one face runs wide: smaller sizes.
      f: (spec) => (seagal ? spec.replace(/italic\s+/, "").replace(/(\d+)px/, (m, n) => Math.round(n * 0.74) + "px") : spec),
    };
  }
  async ensureFonts() {
    const specs = this.app.seagal
      ? ['400 40px "Michroma"']
      : ['600 80px "Playfair Display"', '700 80px "Playfair Display"', 'italic 500 30px "Playfair Display"', '400 28px "Familjen Grotesk"', '600 28px "Familjen Grotesk"', '400 24px "Courier Prime"', '700 24px "Courier Prime"'];
    try {
      await Promise.all(specs.map((f) => document.fonts.load(f)));
    } catch {}
  }
  colors() {
    const night = cssVar("--night", "#102136"),
      blue = cssVar("--blue", "#245B8F"),
      ink = cssVar("--ink", "#17263A");
    return {
      house: night,
      deep: mixHex(night, "#000000", 0.55),
      glow: mixHex(night, blue, 0.65),
      brass: cssVar("--brass", "#E3C36E"),
      paper: cssVar("--paper", "#F3EBD9"),
      ink,
      velvet: cssVar("--velvet", "#9A3E39"),
      blue,
      postmark: cssVar("--deep", "#081320"),
    };
  }
  async horse(c) {
    const svg = this.app.seagal
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90"><path fill-rule="evenodd" fill="' + c.brass + '" d="' + RETICLE + '"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90"><path fill="' + c.velvet + '" d="' + HORSE_BODY + '"/></svg>';
    try {
      return await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
    } catch {
      return null;
    }
  }
  backdrop(ctx, W, H, c) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c.house);
    g.addColorStop(1, c.deep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const r = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.9);
    r.addColorStop(0, c.glow);
    r.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, W, H);
  }
  /**
   * The poster lights the room, as it does on Tonight while a ticket is out (css/tonight.css, .room-light):
   * one of its two colours glows from the upper left, the other from the lower right.
   */
  roomLight(ctx, W, H, lights) {
    const flat = 62 / 84,
      reach = Math.min(W, H) * 0.84;
    for (const [i, [r, g, b]] of lights.entries()) {
      const cx = W * (i ? 0.92 : 0.08),
        cy = H * (i ? 0.86 : 0.18);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, flat);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, reach);
      glow.addColorStop(0, "rgba(" + r + "," + g + "," + b + "," + (i ? 0.44 : 0.5) + ")");
      glow.addColorStop(0.66, "rgba(" + r + "," + g + "," + b + ",0)");
      ctx.fillStyle = glow;
      ctx.fillRect(-reach, -reach, reach * 2, reach * 2);
      ctx.restore();
    }
  }
  /**
   * Films as stamps, each with its poster where one can be had: [{ f, stamp, date }]. Null in SEAGAL, whose
   * files carry no marks from the post, and when not one poster came: the plain list says more than a row
   * of blanks would. `about` gives a film's value, date and place.
   */
  async stamps(films, w, about) {
    if (this.app.seagal || !films.length) return null;
    const posters = await Promise.all(films.map((f) => loadPoster(this.app.store.posterPath(f.id), "w342")));
    if (!posters.some(Boolean)) return null;
    const c = this.colors(),
      F = this.fonts();
    return films.map((f, i) => ({ f, date: about(f, i).date, stamp: stampCanvas({ w, poster: posters[i], c, F, ...about(f, i) }) }));
  }
  /** Lays a stamp on the picture, its shadow under it and its postmark across the corner. */
  layStamp(ctx, { f, stamp, date }, x, y, c, F) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.5)";
    ctx.shadowBlur = stamp.width * 0.09;
    ctx.shadowOffsetY = stamp.width * 0.035;
    ctx.drawImage(stamp, x, y);
    ctx.restore();
    const d = stamp.width * 0.33;
    postmark(ctx, x + stamp.width + d * 0.2 - d / 2, y - d * 0.15 + d / 2, d, date, f.id, c, F);
  }
  /** A film's name under its stamp, centred, on two lines at most. */
  caption(ctx, text, cx, y, width, size, F) {
    ctx.fillStyle = "#E1E6EB";
    ctx.font = "400 " + size + "px " + F.body;
    ctx.textAlign = "center";
    wrapLines(ctx, text, width, 2).forEach((line, i) => ctx.fillText(line, cx, y + i * Math.round(size * 1.26)));
  }
  // The horse and the list name, centered as one mark.
  brand(ctx, W, baseline, horse, c, F) {
    ctx.font = "700 46px " + F.display;
    const label = this.sg(this.app.list.name.toUpperCase(), "SEAGAL"),
      tw = ctx.measureText(label).width + ("letterSpacing" in ctx ? label.length * 5 : 0),
      hw = horse ? 62 : 0,
      gap = hw ? 18 : 0,
      x0 = (W - (hw + gap + tw)) / 2;
    if (horse) ctx.drawImage(horse, x0, baseline - 48, 62, 56);
    ctx.fillStyle = c.paper;
    spaced(ctx, label, x0 + hw + gap, baseline, 5);
  }

  async ticketCanvas(f) {
    await this.ensureFonts();
    const { store, catalog } = this.app,
      p = store.p,
      c = this.colors(),
      F = this.fonts(),
      W = 1080,
      H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (this.app.seagal && "fontVariantCaps" in ctx) ctx.fontVariantCaps = "small-caps";
    const [poster, paper, horse] = await Promise.all([loadPoster(this.app.store.posterPath(f.id)), loadImage("assets/paper.webp").catch(() => null), this.horse(c)]);
    // As on Tonight: the ticket is printed on its decade's paper and engraved for its film, and its poster
    // lights the room. SEAGAL's case file is none of that.
    const dressed = !this.app.seagal,
      won = catalog.isWinner(f),
      stock = dressed ? ticketStock(f, won, c) : { paper: c.paper, band: won ? c.brass : c.blue },
      marks = dressed ? engraving(f.id) : null,
      lights = dressed && poster ? lightOf(poster) : null;
    this.backdrop(ctx, W, H, c);
    if (lights) this.roomLight(ctx, W, H, lights);
    const x = 90,
      y = 150,
      w = W - 180,
      h = 1020;
    // The poster's light along the ticket's upper sides.
    for (const [i, [r, g, b]] of (lights || []).entries()) {
      ctx.save();
      ctx.shadowColor = "rgba(" + r + "," + g + "," + b + "," + (i ? 0.5 : 0.58) + ")";
      ctx.shadowBlur = 110;
      ctx.shadowOffsetX = i ? 32 : -32;
      ctx.shadowOffsetY = -44;
      ctx.fillStyle = stock.paper;
      ctx.fillRect(x + 36, y + 36, w - 72, h - 72);
      ctx.restore();
    }
    // The ticket card, its paper and its bands.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = stock.paper;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, x, y, w, h, 6);
    ctx.clip();
    if (paper) {
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = "multiply";
      for (let ty = y; ty < y + h; ty += 384) for (let tx = x; tx < x + w; tx += 384) ctx.drawImage(paper, tx, ty, 384, 384);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    if (marks) {
      // The film's rosette in the paper, behind the words, running off the ticket's edge.
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = mixHex(stock.band, c.ink, 0.6);
      ctx.lineWidth = 1.1;
      strokeIn(ctx, marks.rosette, x + w - 350, y + 140, 440, 440, 200, 200);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = stock.band;
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = dressed ? stock.band : c.blue;
    ctx.fillRect(x, y + h - 8, w, 8);
    ctx.restore();
    ctx.strokeStyle = "rgba(23,38,58,.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 18, y + 30, w - 36, h - 50);
    // Header
    ctx.fillStyle = "#536076";
    ctx.font = F.f("500 24px " + F.mono);
    spaced(ctx, this.sg("KUVERT · BIOBILJETT", "SEAGAL · CASE FILE"), x + 56, y + 96, 4);
    spaced(ctx, catalog.ticketNumber(f) + " / " + catalog.films.length, x + w - 56, y + 96, 2, "right");
    if (marks) {
      // Its band of woven lines under the head.
      ctx.strokeStyle = mixHex(stock.band, c.ink, 0.72);
      ctx.lineWidth = 1.4;
      strokeIn(ctx, marks.band, x + 56, y + 115, w - 112, 22, 600, 12);
    } else {
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "#8C785F";
      ctx.beginPath();
      ctx.moveTo(x + 56, y + 126);
      ctx.lineTo(x + w - 56, y + 126);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Poster, or the horse where it's missing.
    const px = x + 56,
      py = y + 170,
      pw = 300,
      ph = 450;
    ctx.fillStyle = "#E3D6BB";
    ctx.fillRect(px, py, pw, ph);
    if (poster) {
      const sc = Math.max(pw / poster.width, ph / poster.height),
        dw = poster.width * sc,
        dh = poster.height * sc;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
      ctx.drawImage(poster, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
      ctx.restore();
    } else {
      const size = pw * 0.56,
        scale = size / 100;
      ctx.save();
      ctx.translate(px + (pw - size) / 2, py + (ph - 90 * scale) / 2);
      ctx.scale(scale, scale);
      ctx.fillStyle = "rgba(23,38,58,.16)";
      ctx.fill(new Path2D(this.app.seagal ? RETICLE : HORSE_BODY));
      ctx.restore();
    }
    ctx.strokeStyle = "#BBA789";
    ctx.strokeRect(px, py, pw, ph);
    // Title block
    const tx = px + pw + 44,
      tw = x + w - 56 - tx;
    const watched = p.seen.has(f.id),
      winner = won;
    ctx.fillStyle = winner ? "#74551F" : "#7a3530";
    ctx.font = F.f("600 24px " + F.body);
    spaced(
      ctx,
      watched ? this.sg("SEDD", "NEUTRALIZED") : f.tri && f.ord > 1 ? this.sg("NÄSTA DEL", "NEXT OPERATION") : winner ? this.sg("KVÄLLENS VINNARE", "HIGH-VALUE TARGET") : this.sg("KVÄLLENS FILM", "TONIGHT'S TARGET"),
      tx,
      py + 30,
      5,
    );
    ctx.fillStyle = c.ink;
    ctx.font = this.sg("600 86px ", "400 44px ") + F.display;
    const lines = wrapLines(ctx, this.sg(f.t, f.t.toUpperCase()), tw, 4);
    lines.forEach((l, i) => {
      ctx.textAlign = "left";
      ctx.fillText(l, tx, py + 112 + i * 80);
    });
    const cy = py + 112 + (lines.length - 1) * 80 + 58;
    ctx.fillStyle = "#6B6153";
    ctx.font = F.f("500 24px " + F.mono);
    spaced(ctx, (f.y + (catalog.shelfOf(f) ? " · " + t(catalog.shelfOf(f).label) : "")).toUpperCase(), tx, cy, 3);
    const line = catalog.oscarLine(f);
    // Where the words beside the poster end: a long title with a long award line runs past the poster's foot.
    let wordsEnd = cy;
    if (line) {
      ctx.fillStyle = "#4A3B33";
      ctx.font = F.f("italic 500 32px " + F.display);
      const said = wrapLines(ctx, this.sg(line, line.replace(/^Lost to /, "Outgunned by ").replace(/^Beat /, "Took out ")), tw, 3);
      said.forEach((l, i) => {
        ctx.textAlign = "left";
        ctx.fillText(l, tx, cy + 54 + i * 40);
      });
      wordsEnd = cy + 54 + (said.length - 1) * 40;
    }
    // Watched: stars, date, rank and the stamp. Otherwise, tonight's line. Below the poster and the words, whichever ends lower.
    const by = Math.max(py + ph, wordsEnd + 14) + 90;
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "#9B8869";
    ctx.beginPath();
    ctx.moveTo(x + 56, by - 40);
    ctx.lineTo(x + w - 56, by - 40);
    ctx.stroke();
    ctx.setLineDash([]);
    const r = ratingOf(p, f.id);
    if (watched) {
      if (r) drawStars(ctx, x + 56, by, 56, r, c.velvet, "rgba(23,38,58,.14)");
      ctx.fillStyle = "#536076";
      ctx.font = F.f("500 26px " + F.mono);
      ctx.textAlign = "left";
      ctx.fillText(p.dates[f.id] ? t("Watched {day}", { day: dayLong(p.dates[f.id]) }) : t("Watched"), x + 56, by + (r ? 110 : 30));
      const rk = p.rankings.filter((id) => p.seen.has(id)).indexOf(f.id);
      if (rk >= 0) ctx.fillText(t("#{n} in my ranking", { n: rk + 1 }), x + 56, by + (r ? 150 : 70));
      ctx.save();
      ctx.translate(x + w - 250, by + 50);
      ctx.rotate((-12 * Math.PI) / 180);
      ctx.strokeStyle = c.velvet;
      ctx.lineWidth = 6;
      ctx.strokeRect(-150, -62, 300, 124);
      ctx.lineWidth = 2;
      ctx.strokeRect(-140, -52, 280, 104);
      ctx.fillStyle = c.velvet;
      ctx.font = this.sg("700 92px ", "400 26px ") + F.display;
      spaced(ctx, this.sg("SEDD", "COMPLETE"), 4, this.sg(30, 10), this.sg(8, 2), "center");
      ctx.restore();
    } else {
      ctx.fillStyle = "#4A3B33";
      ctx.font = F.f("400 30px " + F.body);
      ctx.textAlign = "left";
      ctx.fillText(this.sg("Tonight's film, drawn at random.", "Tonight's target. Deployed at random."), x + 56, by + 20);
      const run = p.runtimes[f.id];
      if (run) {
        ctx.fillStyle = "#6B6153";
        ctx.font = F.f("500 24px " + F.mono);
        ctx.fillText(run + " min" + (run >= 160 ? this.sg(" · planera en fika", " · bring a sandwich") : ""), x + 56, by + 66);
      }
    }
    this.brand(ctx, W, H - 72, horse, c, F);
    return canvas;
  }

  async rankingCanvas() {
    await this.ensureFonts();
    const { store, catalog, list } = this.app,
      p = store.p,
      c = this.colors(),
      F = this.fonts();
    const all = rankedFilms(p, catalog),
      films = all.slice(0, 100),
      total = all.length;
    // The first three are stamps from the album, where their posters can be had; the rest are the list.
    const podium = await this.stamps(films.slice(0, 3), 280, (f, i) => ({ value: stampValue(ratingOf(p, f.id) || 0), rank: i + 1, date: p.dates[f.id] })),
      rows = films.slice(podium ? podium.length : 0),
      first = films.length - rows.length;
    const cols = rows.length > 36 ? 2 : 1,
      perCol = Math.ceil(rows.length / cols),
      rowH = cols === 2 ? 50 : 64;
    const W = 1080,
      stampsTop = 374,
      top = podium ? stampsTop + podium[0].stamp.height + 128 : 356,
      H = Math.max(900, top + perCol * rowH + 170 + (total > films.length ? 50 : 0));
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (this.app.seagal && "fontVariantCaps" in ctx) ctx.fontVariantCaps = "small-caps";
    this.backdrop(ctx, W, H, c);
    const horse = await this.horse(c);
    ctx.fillStyle = c.brass;
    ctx.font = F.f("500 24px " + F.mono);
    spaced(ctx, this.sg("MIN TOPPLISTA", "EYES ONLY"), 80, 150, 6);
    ctx.fillStyle = c.paper;
    ctx.font = this.sg("600 104px ", "400 56px ") + F.display;
    spaced(ctx, this.sg("My ranking", "TARGET LIST"), 76, 236, 0);
    ctx.fillStyle = "#B9C5D2";
    ctx.font = F.f("400 28px " + F.body);
    spaced(ctx, this.sg(list.name, "SEAGAL") + " · " + plural(total, "film"), 80, 302, 0);
    ctx.strokeStyle = "rgba(227,195,110,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 330);
    ctx.lineTo(W - 80, 330);
    ctx.stroke();
    if (podium) {
      const gap = 40,
        x0 = (W - podium.length * 280 - (podium.length - 1) * gap) / 2;
      podium.forEach((one, i) => {
        const x = x0 + i * (280 + gap);
        this.layStamp(ctx, one, x, stampsTop, c, F);
        this.caption(ctx, one.f.t, x + 140, stampsTop + one.stamp.height + 46, 300, 27, F);
      });
    }
    const colW = (W - 160 - (cols - 1) * 40) / cols;
    rows.forEach((f, at) => {
      const i = at + first,
        col = Math.floor(at / perCol),
        row = at % perCol,
        x = 80 + col * (colW + 40),
        y = top + row * rowH;
      ctx.strokeStyle = "rgba(83,103,126,.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + rowH - 6);
      ctx.lineTo(x + colW, y + rowH - 6);
      ctx.stroke();
      ctx.fillStyle = c.brass;
      ctx.font = F.f((cols === 2 ? "700 30px " : "700 36px ") + F.display);
      ctx.textAlign = "left";
      ctx.fillText(String(i + 1), x, y + rowH - 20);
      const r = ratingOf(p, f.id),
        starSize = cols === 2 ? 18 : 22,
        starsW = r ? starSize * 1.12 * 5 : 0;
      ctx.fillStyle = "#E1E6EB";
      ctx.font = F.f((cols === 2 ? "400 24px " : "400 29px ") + F.body);
      const tx = x + (cols === 2 ? 50 : 64),
        maxW = colW - (tx - x) - starsW - 16;
      let title = f.t;
      while (ctx.measureText(title).width > maxW && title.length > 4) title = title.slice(0, -2);
      if (title !== f.t) title = title.trimEnd() + "…";
      ctx.fillText(title, tx, y + rowH - 22);
      if (r) drawStars(ctx, x + colW - starsW, y + rowH - 22 - starSize + 3, starSize, r, c.brass, "rgba(255,255,255,.14)");
    });
    if (total > films.length) {
      ctx.fillStyle = "#B9C5D2";
      ctx.font = F.f("400 26px " + F.body);
      ctx.textAlign = "left";
      ctx.fillText(t("…and {n} more", { n: total - films.length }), 80, top + perCol * rowH + 30);
    }
    this.brand(ctx, W, H - 64, horse, c, F);
    return canvas;
  }

  /** Every dated watch in every list, one record per film (the cinema passport's records). */
  watched() {
    return passportRecords(exportLibrary(this.app.storage, { store: this.app.store }));
  }
  /** The year the picture would show, or null when nothing is dated. Cheap: the open list's own dates. */
  yearOnOffer(now = new Date()) {
    const { p } = this.app.store;
    return pickYear(reviewYears([...p.seen].map((id) => ({ date: p.dates[id] || "" }))), now);
  }
  /** The film year as a picture: how much was watched, the best five, and a few facts. */
  async yearCanvas(r) {
    await this.ensureFonts();
    const c = this.colors(),
      F = this.fonts(),
      W = 1080,
      H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    this.backdrop(ctx, W, H, c);
    const horse = await this.horse(c);
    const rule = (y) => {
      ctx.strokeStyle = "rgba(227,195,110,.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(W - 80, y);
      ctx.stroke();
    };
    ctx.fillStyle = c.brass;
    ctx.font = "500 24px " + F.mono;
    spaced(ctx, "FILMÅRET", 80, 140, 6);
    ctx.fillStyle = c.paper;
    ctx.font = "600 190px " + F.display;
    spaced(ctx, String(r.year), 70, 318, 0);
    ctx.fillStyle = "#B9C5D2";
    ctx.font = "400 30px " + F.body;
    spaced(ctx, t("My film year"), 80, 378, 0);
    rule(418);
    // Three figures: films, hours, evenings.
    const hours = Math.round(r.minutes / 60);
    const figures = [plural(r.films, "film"), ...(hours ? [plural(hours, "hour")] : []), plural(r.evenings, "evening")].map((x) => x.split(" "));
    const colW = (W - 160) / figures.length;
    figures.forEach(([n, ...word], i) => {
      const x = 80 + i * colW;
      ctx.fillStyle = c.brass;
      ctx.font = "700 96px " + F.display;
      spaced(ctx, n, x, 536, 0);
      ctx.fillStyle = "#B9C5D2";
      ctx.font = "400 24px " + F.mono;
      spaced(ctx, word.join(" ").toUpperCase(), x + 4, 580, 4);
    });
    rule(626);
    ctx.fillStyle = c.brass;
    ctx.font = "500 24px " + F.mono;
    spaced(ctx, t(r.rated ? "The year's best" : "Latest films").toUpperCase(), 80, 690, 5);
    const rowH = 72;
    // The best five are stamps from the album, where their posters can be had; a list where they can't.
    const best = await this.stamps(r.top, 168, (f) => ({ value: Number.isFinite(f.rating) ? stampValue(f.rating) : "", date: f.date }));
    (best || []).forEach((one, i) => {
      const x = 80 + i * 188;
      this.layStamp(ctx, one, x, 730, c, F);
      this.caption(ctx, one.f.t, x + 84, 730 + one.stamp.height + 40, 182, 23, F);
    });
    (best ? [] : r.top).forEach((f, i) => {
      const y = 716 + i * rowH;
      ctx.fillStyle = c.brass;
      ctx.font = "700 40px " + F.display;
      ctx.textAlign = "left";
      ctx.fillText(String(i + 1), 80, y + rowH - 22);
      const starSize = 24,
        starsW = Number.isFinite(f.rating) ? starSize * 1.12 * 5 : 0;
      ctx.fillStyle = "#E1E6EB";
      ctx.font = "400 32px " + F.body;
      const maxW = W - 160 - 70 - starsW - 20;
      let title = f.t + " (" + f.y + ")";
      if (ctx.measureText(title).width > maxW) {
        title = f.t;
        while (ctx.measureText(title + "…").width > maxW && title.length > 4) title = title.slice(0, -1);
        if (title !== f.t) title = title.trimEnd() + "…";
      }
      ctx.fillText(title, 150, y + rowH - 24);
      if (starsW) drawStars(ctx, W - 80 - starsW, y + rowH - 24 - starSize + 3, starSize, f.rating, c.brass, "rgba(255,255,255,.14)");
      ctx.strokeStyle = "rgba(83,103,126,.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, y + rowH - 4);
      ctx.lineTo(W - 80, y + rowH - 4);
      ctx.stroke();
    });
    // A few facts under the list, as many as the year has.
    const month = r.busiest ? new Date(2000, r.busiest.month, 1).toLocaleDateString(LOCALE, { month: "long" }) : "";
    const facts = [
      r.busiest && r.films > 2 ? t("Busiest month: {month}, {films}", { month, films: plural(r.busiest.films, "film") }) : null,
      r.run > 1 ? t("Longest run: {n} evenings in a row", { n: r.run }) : null,
      r.oldest ? t("Oldest film: {title} ({year})", { title: r.oldest.t, year: r.oldest.y }) : null,
    ].filter(Boolean);
    ctx.fillStyle = "#B9C5D2";
    ctx.font = "400 28px " + F.body;
    ctx.textAlign = "left";
    facts.forEach((line, i) => {
      let text = line;
      while (ctx.measureText(text).width > W - 160 && text.length > 8) text = text.slice(0, -2);
      ctx.fillText(text === line ? line : text.trimEnd() + "…", 80, 716 + 5 * rowH + 52 + i * 42);
    });
    this.brand(ctx, W, H - 46, horse, c, F);
    return canvas;
  }
  /** Shares (or saves) the picture of the film year: this year, or in January the one just ended. */
  async year(now = new Date()) {
    if (this.sharing) return;
    this.sharing = true;
    try {
      const records = this.watched(),
        year = pickYear(reviewYears(records), now);
      if (!year) return;
      const name = "kuvert-" + year + ".png";
      const out = await this.deliver(await this.yearCanvas(yearReview(records, year)), name, t("My film year") + " · " + year);
      if (out === "saved") this.app.toast.show(t("Film year image saved as {file}.", { file: name }));
    } catch (e) {
      this.app.toast.show(t(e.message || "The film year image couldn't be made."));
    } finally {
      this.sharing = false;
    }
  }

  async deliver(canvas, fileName, title) {
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw Error(t("The image couldn't be made."));
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return "shared";
      } catch (e) {
        if (e.name === "AbortError") return "cancelled";
      }
    }
    download(blob, fileName, "image/png");
    return "saved";
  }
  async ticket(f) {
    if (this.sharing || !f) return;
    this.sharing = true;
    try {
      const name = "kuvert-" + slugify(f.t) + ".png";
      const out = await this.deliver(await this.ticketCanvas(f), name, f.t + " · " + this.app.list.name);
      if (out === "saved") this.app.toast.show(t("Ticket image saved as {file}.", { file: name }));
    } catch (e) {
      this.app.toast.show(t(e.message || "The ticket image couldn't be made."));
    } finally {
      this.sharing = false;
    }
  }
  async ranking() {
    if (this.sharing || !rankedFilms(this.app.store.p, this.app.catalog).length) return;
    this.sharing = true;
    try {
      const out = await this.deliver(await this.rankingCanvas(), "kuvert-ranking.png", t("My ranking") + " · " + this.app.list.name);
      if (out === "saved") this.app.toast.show(t("Ranking image saved as {file}.", { file: "kuvert-ranking.png" }));
    } catch (e) {
      this.app.toast.show(t(e.message || "The ranking image couldn't be made."));
    } finally {
      this.sharing = false;
    }
  }
}
