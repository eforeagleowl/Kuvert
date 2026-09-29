// A split-flap display on a canvas: every character is painted once onto a strip (the atlas), and each
// flap turns through the characters in order until it reaches its own, top half falling over the bottom.
// Colours and fonts come from CSS custom properties on the station page (--flap-*, --st-*), so a list's
// palette repaints the board too.
import { CHARS, CHAR_INDEX } from "./timetable.js";

const COUNT = CHARS.length;
// The lamp's glow fades out from its own colour. The board's colours are plain hex (see css/station.css).
const withAlpha = (color, a) => {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return a > 0.2 ? color : "rgba(0,0,0,0)";
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

export class Flaps {
  /** @param {HTMLCanvasElement} canvas  @param {{ header?: boolean, lamp?: boolean, labels?: Record<string, [string, string]>, theme: Element }} opts */
  constructor(canvas, opts) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.opts = opts;
    this.cells = [];
    this.rows = [];
    this.lamps = [];
    this.busy = false;
    this.waiters = [];
    this.blinkUntil = 0;
    this.full = true;
    this.lampDirty = true;
    this.atlas = document.createElement("canvas");
    this.g = null;
  }
  css(name) {
    return getComputedStyle(this.opts.theme).getPropertyValue(name).trim();
  }
  configure({ groups, nRows, cw }) {
    const { header, lamp } = this.opts;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const gapX = Math.max(1.5, cw * 0.09);
    const ch = Math.round(cw * 1.46);
    const rowGap = nRows > 1 ? Math.round(ch * 0.26) : 0;
    const headH = header ? Math.round(ch * 1.15) : 0;
    const lampW = lamp ? cw * 1.2 : 0;
    const groupGap = cw * 0.8;
    let x = lampW;
    const gx = [];
    groups.forEach(([, n], i) => {
      gx.push(x);
      x += n * cw + (i < groups.length - 1 ? groupGap : 0);
    });
    const cssW = Math.ceil(x - gapX),
      cssH = headH + nRows * ch + (nRows - 1) * rowGap;
    this.cv.style.setProperty("width", cssW + "px");
    this.cv.style.setProperty("height", cssH + "px");
    this.cv.width = Math.round(cssW * dpr);
    this.cv.height = Math.round(cssH * dpr);
    this.g = { dpr, cw, ch, gapX, rowGap, headH, lampW, groups, gx, nRows, fw: Math.round((cw - gapX) * dpr), fh: Math.round((ch * dpr) / 2) * 2 };
    this.cells = [];
    this.rows = [];
    for (let r = 0; r < nRows; r++) {
      const y = Math.round((headH + r * (ch + rowGap)) * dpr);
      this.rows.push(
        groups.map(([, n], gi) =>
          Array.from({ length: n }, (_, j) => {
            const c = { x: Math.round((gx[gi] + j * cw) * dpr), y, cur: 0, sty: 0, tgt: 0, tsty: 0, p: 0, wait: 0, dur: 40, anim: false, dirty: true };
            this.cells.push(c);
            return c;
          }),
        ),
      );
    }
    this.lamps = Array(nRows).fill(0);
    this.busy = false;
    this.full = true;
    this.buildAtlas();
    this.release();
  }
  // Every character, painted once onto a strip of flap faces: plain (cream) and highlighted (brass).
  buildAtlas() {
    if (!this.g) return;
    const { fw, fh } = this.g,
      a = this.atlas,
      x = a.getContext("2d");
    const face = this.css("--flap-face"),
      inks = [this.css("--flap-ink"), this.css("--flap-hl")];
    const font = this.css("--flap-font"),
      weight = this.css("--flap-weight") || "600",
      scale = parseFloat(this.css("--flap-scale")) || 0.62;
    a.width = fw * COUNT;
    a.height = fh * inks.length;
    x.clearRect(0, 0, a.width, a.height);
    const size = Math.round(fh * scale);
    x.font = `${weight} ${size}px ${font}`;
    x.textAlign = "center";
    x.textBaseline = "alphabetic";
    const capH = x.measureText("H").actualBoundingBoxAscent || size * 0.7;
    const rad = Math.max(1, Math.round(fw * 0.09)),
      hh = fh / 2,
      px = Math.max(1, Math.round(this.g.dpr));
    for (let s = 0; s < inks.length; s++)
      for (let i = 0; i < COUNT; i++) {
        const ox = i * fw,
          oy = s * fh;
        x.save();
        x.beginPath();
        if (x.roundRect) x.roundRect(ox, oy, fw, fh, rad);
        else x.rect(ox, oy, fw, fh);
        x.fillStyle = face;
        x.fill();
        x.clip();
        // Light from above: the top flap catches it, the bottom one sits in its shadow.
        let gr = x.createLinearGradient(0, oy, 0, oy + hh);
        gr.addColorStop(0, "rgba(255,255,255,.09)");
        gr.addColorStop(1, "rgba(255,255,255,.02)");
        x.fillStyle = gr;
        x.fillRect(ox, oy, fw, hh);
        gr = x.createLinearGradient(0, oy + hh, 0, oy + fh);
        gr.addColorStop(0, "rgba(0,0,0,.18)");
        gr.addColorStop(1, "rgba(0,0,0,.34)");
        x.fillStyle = gr;
        x.fillRect(ox, oy + hh, fw, hh);
        const ch = CHARS[i];
        if (ch !== " ") {
          x.fillStyle = inks[s];
          const w = x.measureText(ch).width,
            maxW = fw * 0.86,
            base = oy + hh + capH / 2;
          if (w > maxW) {
            x.save();
            x.translate(ox + fw / 2, 0);
            x.scale(maxW / w, 1);
            x.fillText(ch, 0, base);
            x.restore();
          } else x.fillText(ch, ox + fw / 2, base);
        }
        // The split, and the two little hinge pins either side of it.
        x.fillStyle = "rgba(0,0,0,.8)";
        x.fillRect(ox, oy + hh - px / 2, fw, px);
        x.fillStyle = "rgba(255,255,255,.05)";
        x.fillRect(ox, oy + hh + px / 2, fw, px);
        x.fillStyle = "rgba(0,0,0,.55)";
        x.fillRect(ox, oy + hh - 2 * px, Math.max(1, px * 1.5), 4 * px);
        x.fillRect(ox + fw - Math.max(1, px * 1.5), oy + hh - 2 * px, Math.max(1, px * 1.5), 4 * px);
        x.restore();
      }
    this.full = true;
  }
  /** Sets row r to one string per column group. style 1 is the brass highlight. */
  setRow(r, strs, style, { delay = 0, instant = false } = {}) {
    const row = this.rows[r];
    if (!row) return;
    let col = 0;
    row.forEach((cells, gi) => {
      const s = strs[gi] || "";
      cells.forEach((c, j) => {
        const t = CHAR_INDEX.get(s[j]) ?? 0;
        c.tgt = t;
        c.tsty = style;
        if (instant) {
          c.cur = t;
          c.sty = style;
          c.p = 0;
          c.wait = 0;
          c.anim = false;
          c.dirty = true;
        } else if (c.cur !== t || c.sty !== style) {
          // A ripple from left to right, each flap a little out of step with its neighbours.
          c.wait = delay + col * 11 + Math.random() * 70;
          c.dur = 30 + Math.random() * 24;
          this.busy = true;
        }
        col++;
      });
    });
  }
  /** Resolves once every flap has come to rest. */
  whenIdle() {
    return this.busy ? new Promise((r) => this.waiters.push(r)) : Promise.resolve();
  }
  release() {
    if (this.busy || !this.waiters.length) return;
    const w = this.waiters;
    this.waiters = [];
    w.forEach((f) => f());
  }
  /** Moves every flap on by dt milliseconds. Returns how many flaps fell (for the clatter). */
  update(dt) {
    let flips = 0,
      busy = false;
    for (const c of this.cells) {
      if (c.cur === c.tgt && c.sty === c.tsty) continue;
      if (c.wait > 0) {
        c.wait -= dt;
        busy = true;
        continue;
      }
      c.anim = true;
      c.dirty = true;
      c.p += dt / c.dur;
      while (c.p >= 1) {
        flips++;
        c.cur = c.cur === c.tgt ? c.cur : (c.cur + 1) % COUNT;
        c.sty = c.tsty;
        if (c.cur === c.tgt) {
          c.p = 0;
          c.anim = false;
          break;
        }
        c.p -= 1;
      }
      if (c.cur !== c.tgt || c.sty !== c.tsty) busy = true;
    }
    this.busy = busy;
    this.release();
    return flips;
  }
  /** Everything to its place at once (the page was left mid-flip, or motion is reduced). */
  settle() {
    for (const c of this.cells) {
      c.cur = c.tgt;
      c.sty = c.tsty;
      c.p = 0;
      c.anim = false;
      c.wait = 0;
      c.dirty = true;
    }
    this.update(0);
  }
  drawCell(c) {
    const { fw, fh } = this.g,
      ctx = this.ctx,
      A = this.atlas,
      hh = fh / 2;
    ctx.clearRect(c.x, c.y, fw, fh);
    if (!c.anim) {
      ctx.drawImage(A, c.cur * fw, c.sty * fh, fw, fh, c.x, c.y, fw, fh);
      return;
    }
    const nxt = c.cur === c.tgt ? c.cur : (c.cur + 1) % COUNT,
      p = c.p;
    // Behind the moving flap: the next character's top, the current one's bottom.
    ctx.drawImage(A, nxt * fw, c.tsty * fh, fw, hh, c.x, c.y, fw, hh);
    ctx.drawImage(A, c.cur * fw, c.sty * fh + hh, fw, hh, c.x, c.y + hh, fw, hh);
    if (p < 0.5) {
      // The top flap falls towards you, foreshortening and darkening.
      const k = Math.cos(p * Math.PI),
        h = Math.max(1, hh * k);
      ctx.fillStyle = `rgba(0,0,0,${k * 0.4})`;
      ctx.fillRect(c.x, c.y, fw, hh - h);
      ctx.drawImage(A, c.cur * fw, c.sty * fh, fw, hh, c.x, c.y + hh - h, fw, h);
      ctx.fillStyle = `rgba(0,0,0,${(1 - k) * 0.5})`;
      ctx.fillRect(c.x, c.y + hh - h, fw, h);
    } else {
      // …and lands as the next character's bottom half.
      const k = -Math.cos(p * Math.PI),
        h = Math.max(1, hh * k);
      ctx.drawImage(A, nxt * fw, c.tsty * fh + hh, fw, hh, c.x, c.y + hh, fw, h);
      ctx.fillStyle = `rgba(0,0,0,${(1 - k) * 0.45})`;
      ctx.fillRect(c.x, c.y + hh, fw, h);
      ctx.fillStyle = `rgba(0,0,0,${(1 - k) * 0.25})`;
      ctx.fillRect(c.x, c.y + hh + h, fw, hh - h);
    }
  }
  drawHeader() {
    if (!this.opts.header) return;
    const { dpr, gx, groups, ch } = this.g,
      ctx = this.ctx,
      labels = this.opts.labels || {};
    const font = this.css("--flap-font"),
      brass = this.css("--st-brass"),
      muted = this.css("--st-muted");
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    groups.forEach(([k], i) => {
      const [a, b] = labels[k] || ["", ""],
        x = gx[i] * dpr;
      ctx.font = `600 ${Math.round(ch * 0.34 * dpr)}px ${font}`;
      ctx.fillStyle = brass;
      ctx.fillText(a, x, (b ? ch * 0.36 : ch * 0.62) * dpr);
      if (b) {
        ctx.font = `400 ${Math.round(ch * 0.3 * dpr)}px ${font}`;
        ctx.fillStyle = muted;
        ctx.fillText(b, x, ch * 0.76 * dpr);
      }
    });
  }
  // A lamp beside each row: dark glass, or lit brass for the drawn film (blinking as it arrives).
  drawLamps(now) {
    if (!this.opts.lamp) return;
    const { dpr, lampW, ch, rowGap, headH, cw } = this.g,
      ctx = this.ctx,
      brass = this.css("--flap-hl"),
      glass = this.css("--st-lamp") || "#1a2636";
    for (let r = 0; r < this.lamps.length; r++) {
      const top = (headH + r * (ch + rowGap)) * dpr,
        cx = lampW * 0.45 * dpr,
        cy = top + (ch / 2) * dpr,
        rad = cw * 0.2 * dpr;
      ctx.clearRect(0, top, Math.floor((lampW - 2) * dpr), ch * dpr);
      let on = this.lamps[r] > 0;
      if (on && now < this.blinkUntil) on = Math.floor(now / 240) % 2 === 0;
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 1.45, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,.7)";
      ctx.fill();
      if (on) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw * 0.5 * dpr);
        g.addColorStop(0, brass);
        g.addColorStop(0.35, brass);
        g.addColorStop(0.36, withAlpha(brass, 0.35));
        g.addColorStop(1, withAlpha(brass, 0));
        ctx.beginPath();
        ctx.arc(cx, cy, cw * 0.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - rad * 0.3, cy - rad * 0.3, rad * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,.7)";
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fillStyle = glass;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - rad * 0.3, cy - rad * 0.3, rad * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,.08)";
        ctx.fill();
      }
    }
    this.lampDirty = false;
  }
  render(now) {
    if (!this.g) return;
    if (this.full) {
      this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      this.drawHeader();
      for (const c of this.cells) c.dirty = true;
      this.lampDirty = true;
      this.full = false;
    }
    for (const c of this.cells)
      if (c.dirty) {
        this.drawCell(c);
        if (!c.anim) c.dirty = false;
      }
    if (this.lampDirty || now < this.blinkUntil + 300) this.drawLamps(now);
  }
  /** What the flaps show right now, one string per row (for tests and the curious). */
  text() {
    return this.rows.map((row) => row.map((cells) => cells.map((c) => CHARS[c.cur]).join("")).join("|"));
  }
}
