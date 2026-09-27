// Share images for the group chat: a ticket and your ranking, drawn on a canvas in Kuvert's style and
// sent through the phone's share sheet, or saved as a PNG on desktop.
import { IMG } from "../tmdb/client.js";
import { STAR_PATH } from "../ui/stars.js";
import { HORSE_BODY } from "../ui/horse.js";
import { slugify } from "../data/lists.js";
import { dayLong } from "../state/dates.js";
import { rankedFilms, ratingOf } from "../state/stats.js";
import { download } from "../storage/files.js";

const F_SEAGAL = '"Michroma", "Arial Black", sans-serif';
const RETICLE = "M50 3a42 42 0 1 0 0.01 0zM50 10a35 35 0 1 1 -0.01 0z M47 0h6v30h-6zM47 60h6v30h-6zM4 42h30v6h-30zM66 42h30v6h-30zM50 40a5 5 0 1 0 0.01 0z";

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
async function loadPoster(path) {
  if (!path) return null;
  try {
    const r = await fetch(IMG + "w500" + path, { mode: "cors" });
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
function drawStars(ctx, x, y, size, rating, fill, empty) {
  const path = new Path2D(STAR_PATH);
  for (let i = 0; i < 5; i++) {
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
      display: seagal ? F_SEAGAL : '"Cormorant Garamond", Garamond, "Times New Roman", serif',
      body: seagal ? F_SEAGAL : '"Geist", system-ui, sans-serif',
      mono: seagal ? F_SEAGAL : '"Geist Mono", ui-monospace, Menlo, monospace',
      // SEAGAL's one face runs wide: smaller sizes.
      f: (spec) => (seagal ? spec.replace(/italic\s+/, "").replace(/(\d+)px/, (m, n) => Math.round(n * 0.74) + "px") : spec),
    };
  }
  async ensureFonts() {
    const specs = this.app.seagal
      ? ['400 40px "Michroma"']
      : ['600 80px "Cormorant Garamond"', '700 80px "Cormorant Garamond"', 'italic 500 30px "Cormorant Garamond"', '400 28px "Geist"', '600 28px "Geist"', '500 24px "Geist Mono"'];
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
  // The horse and the list name, centred as one mark.
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
    this.backdrop(ctx, W, H, c);
    const [poster, paper, horse] = await Promise.all([loadPoster(p.posterPaths[f.id]), loadImage("assets/paper.webp").catch(() => null), this.horse(c)]);
    const x = 90,
      y = 150,
      w = W - 180,
      h = 1020;
    // The ticket card, its paper and its bands.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = c.paper;
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
    ctx.fillStyle = catalog.isWinner(f) ? c.brass : c.blue;
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = c.blue;
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
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "#8C785F";
    ctx.beginPath();
    ctx.moveTo(x + 56, y + 126);
    ctx.lineTo(x + w - 56, y + 126);
    ctx.stroke();
    ctx.setLineDash([]);
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
      winner = catalog.isWinner(f);
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
    spaced(ctx, (f.y + (catalog.shelfOf(f) ? " · " + catalog.shelfOf(f).label : "")).toUpperCase(), tx, cy, 3);
    const line = catalog.oscarLine(f);
    if (line) {
      ctx.fillStyle = "#4A3B33";
      ctx.font = F.f("italic 500 32px " + F.display);
      wrapLines(ctx, this.sg(line, line.replace(/^Lost to /, "Outgunned by ").replace(/^Beat /, "Took out ")), tw, 3).forEach((l, i) => {
        ctx.textAlign = "left";
        ctx.fillText(l, tx, cy + 54 + i * 40);
      });
    }
    // Watched: stars, date, rank and the stamp. Otherwise, tonight's line.
    const by = py + ph + 90;
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
      ctx.fillText(p.dates[f.id] ? "Watched " + dayLong(p.dates[f.id]) : "Watched", x + 56, by + (r ? 110 : 30));
      const rk = p.rankings.filter((id) => p.seen.has(id)).indexOf(f.id);
      if (rk >= 0) ctx.fillText("#" + (rk + 1) + " in my ranking", x + 56, by + (r ? 150 : 70));
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
    const cols = films.length > 36 ? 2 : 1,
      perCol = Math.ceil(films.length / cols),
      rowH = cols === 2 ? 50 : 64;
    const W = 1080,
      top = 356,
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
    spaced(ctx, this.sg(list.name, "SEAGAL") + " · " + total + (total === 1 ? " film" : " films"), 80, 302, 0);
    ctx.strokeStyle = "rgba(227,195,110,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 330);
    ctx.lineTo(W - 80, 330);
    ctx.stroke();
    const colW = (W - 160 - (cols - 1) * 40) / cols;
    films.forEach((f, i) => {
      const col = Math.floor(i / perCol),
        row = i % perCol,
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
      ctx.fillText("…and " + (total - films.length) + " more", 80, top + perCol * rowH + 30);
    }
    this.brand(ctx, W, H - 64, horse, c, F);
    return canvas;
  }

  async deliver(canvas, fileName, title) {
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw Error("The image couldn't be made.");
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
      if (out === "saved") this.app.toast.show("Ticket image saved as " + name + ".");
    } catch (e) {
      this.app.toast.show(e.message || "The ticket image couldn't be made.");
    } finally {
      this.sharing = false;
    }
  }
  async ranking() {
    if (this.sharing || !rankedFilms(this.app.store.p, this.app.catalog).length) return;
    this.sharing = true;
    try {
      const out = await this.deliver(await this.rankingCanvas(), "kuvert-ranking.png", "My ranking · " + this.app.list.name);
      if (out === "saved") this.app.toast.show("Ranking image saved as kuvert-ranking.png.");
    } catch (e) {
      this.app.toast.show(e.message || "The ranking image couldn't be made.");
    } finally {
      this.sharing = false;
    }
  }
}
