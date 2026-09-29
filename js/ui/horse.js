// The dala horse. Carved in bare wood at the start and painted as you go: the red coat with the first
// film, the harness at a quarter, the saddle at half, its flowers at three quarters, gold details at the end.
// It nods at every draw, hops and talks when tapped, runs off after five quick taps, reacts to your stars,
// gallops across the screen when a milestone lands, and gets sleepy after midnight.
import { $, s, reduceMotion } from "./dom.js";
import { paintStage, nextPaint, PAINT_NAMES, plural } from "../state/stats.js";
import { isLateNight } from "../state/dates.js";
import { t } from "../i18n/index.js";

export const HORSE_BODY =
  "M8 30 L12 20 L20 10 L24 4 L28 9 C40 10 50 18 54 30 L68 27 C78 28 83 32 84 36 L92 42 L87 54 L79 50 L84 84 L73 84 L71 53 L46 54 L49 84 L38 84 L38 50 L33 45 C28 40 26 34 24 30 L14 34 Z";

function flower(x, y, r) {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const a = ((i * 72 - 90) * Math.PI) / 180;
    parts.push(s("circle", { class: "petal", cx: (x + Math.cos(a) * r).toFixed(2), cy: (y + Math.sin(a) * r).toFixed(2), r: (r * 0.62).toFixed(2) }));
  }
  parts.push(s("circle", { class: "heart", cx: x, cy: y, r: (r * 0.55).toFixed(2) }));
  return parts;
}
// Layers, bottom to top; CSS (.dala.p1 … .p5) shows each once it's earned.
export function paintedHorse() {
  return s(
    "svg",
    { class: "dala", viewBox: "0 0 100 90", "aria-hidden": "true" },
    s("path", { class: "h-wood", d: HORSE_BODY }),
    s("path", { class: "h-grain", d: "M40 38 C50 36 60 37 76 38 M41 44 C52 42 62 44 75 44 M44 50 C52 49 60 50 70 50 M42.5 58 L43.5 82 M76 56 L78 82 M13 27 C16 22 19 18 22 13 M31 20 C35 26 36 34 35 42" }),
    s("path", { class: "h-coat", d: HORSE_BODY }),
    s("g", { class: "h-eye" }, s("ellipse", { cx: 18.6, cy: 17.5, rx: 2.1, ry: 1.6 }), s("circle", { cx: 18.9, cy: 17.6, r: 0.9 })),
    s(
      "g",
      { class: "h-harness" },
      s("path", { d: "M11.6 21.5 L14.2 33.6 M13 27.5 L26 13 M37 12.5 C35 22 31.5 30 28.8 38.8" }),
      s("g", { class: "h-studs" }, s("circle", { cx: 35.2, cy: 19.4, r: 0.9 }), s("circle", { cx: 33.1, cy: 25.9, r: 0.9 }), s("circle", { cx: 30.9, cy: 32.4, r: 0.9 })),
    ),
    s("path", { class: "h-saddle", d: "M53 31 L67 28 C68.5 36 68.5 42 67 48 C61 50 56 50 51 48.5 C50 42 51 36 53 31 Z" }),
    s("g", { class: "h-flowers" }, flower(60, 38, 2.4), flower(55.2, 44.6, 1.5), flower(64.6, 44.2, 1.5)),
    s(
      "g",
      { class: "h-gold" },
      s("path", { class: "h-mane", d: "M29 11.6 C40 12.6 48.4 19.6 52 29" }),
      s("path", { d: "M38 80.5 H48.6 L49 84 H38 Z M72.8 80.5 H83.5 L84 84 H73 Z" }),
      s("path", { fill: "none", d: "M84.8 39 L89.2 44 L86.4 50.5" }),
    ),
  );
}
export const reticle = () => s("svg", { viewBox: "0 0 100 90", "aria-hidden": "true" }, s("use", { href: "#reticle" }));

const WORDS = ["Hej!", "Fika?", "En film till?", "Gnägg!", "Popcorn?", "Tjena!"];

export class Horse {
  constructor({ store, play, announce, seagal }) {
    this.store = store;
    this.play = play;
    this.announce = announce;
    this.seagal = seagal;
    this.el = $("hast");
    this.say = $("horseSay");
    this.stage = null;
    this.taps = [];
    for (const slot of document.querySelectorAll("[data-horse]")) slot.replaceChildren(seagal ? reticle() : paintedHorse());
    if (seagal) {
      this.el.title = "Target acquired";
      return;
    }
    const classFor = { "horse-nod": "nod", "horse-rock": "rock", "horse-droop": "droop", "horse-trot-in": "back", "horse-fresh-paint": "painted", "horse-hop": "hop" };
    for (const t of ["animationend", "animationcancel"])
      this.el.addEventListener(t, (e) => classFor[e.animationName] && this.el.classList.remove(classFor[e.animationName]));
    this.el.addEventListener("pointerenter", () => !reduceMotion() && !this.el.classList.contains("nod") && this.el.classList.add("rock"));
    this.el.addEventListener("click", () => this.tap());
    this.say.addEventListener("animationend", () => this.say.classList.remove("say"));
    setInterval(() => this.sleepy(), 60000);
  }
  // Called on every render: paint the horse to match progress.
  render() {
    if (this.seagal) return;
    const n = this.store.p.seen.size,
      total = this.store.catalog.films.length,
      stage = paintStage(n, total),
      next = nextPaint(n, total);
    for (const svg of document.querySelectorAll("svg.dala")) for (let k = 1; k <= 5; k++) svg.classList.toggle("p" + k, stage >= k);
    this.el.title = "Dalahäst · " + t(PAINT_NAMES[stage]) + (next ? t(". Next: the {paint} at {films}.", { paint: t(next.name), films: plural(next.need, "film") }) : t(". Fully painted."));
    if (this.stage !== null && stage > this.stage) {
      // A new coat of paint, earned just now.
      if (!reduceMotion()) this.el.classList.add("painted");
      this.speak("Nymålad!");
      this.announce(t("The dala horse got its {paint}.", { paint: t(PAINT_NAMES[stage]) }));
    }
    this.stage = stage;
    this.sleepy();
  }
  sleepy() {
    this.el.classList.toggle("sleepy", !this.seagal && isLateNight());
  }
  speak(text) {
    if (this.seagal) return;
    clearTimeout(this.sayTimer);
    this.say.textContent = text;
    this.say.hidden = false;
    this.say.classList.remove("bye", "say");
    void this.say.offsetWidth;
    this.say.classList.add("say");
    this.sayTimer = setTimeout(() => {
      this.say.classList.add("bye");
      this.sayTimer = setTimeout(() => (this.say.hidden = true), 260);
    }, 1700);
  }
  nod() {
    if (this.seagal || reduceMotion() || this.el.classList.contains("nod")) return;
    this.el.classList.remove("rock");
    this.el.classList.add("nod");
  }
  hop() {
    if (reduceMotion() || this.el.classList.contains("hop")) return;
    this.el.classList.add("hop");
  }
  tap() {
    if (this.seagal || this.el.classList.contains("away")) return;
    this.play("knock");
    const now = Date.now();
    this.taps = this.taps.filter((t) => now - t < 2000).concat(now);
    if (this.taps.length >= 5 && !reduceMotion() && !document.querySelector(".gallop")) {
      this.taps = [];
      return this.runAway();
    }
    this.hop();
    this.speak(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  // Five quick taps: it gallops off the right edge and trots back in.
  runAway() {
    const r = this.el.querySelector("svg").getBoundingClientRect();
    const g = document.createElement("div");
    g.className = "gallop";
    g.setAttribute("aria-hidden", "true");
    Object.assign(g.style, { left: r.left + "px", top: r.top + "px", bottom: "auto", width: r.width + "px", height: r.height + "px", animation: "none" });
    g.append(paintedHorse());
    document.body.append(g);
    for (let k = 1; k <= 5; k++) g.firstChild.classList.toggle("p" + k, (this.stage ?? 0) >= k);
    this.el.classList.add("away");
    const run = g.animate([{ transform: "none" }, { transform: "translateX(" + Math.ceil(innerWidth - r.left + 40) + "px)" }], { duration: 1100, easing: "ease-in" });
    const home = () => {
      g.remove();
      setTimeout(() => {
        this.el.classList.remove("away");
        this.el.classList.add("back");
        this.speak("Tillbaka!");
      }, 700);
    };
    run.onfinish = home;
    run.oncancel = home;
  }
  // Stars: a happy hop for 4 and up, a droop for 1 or less.
  react(rating) {
    if (this.seagal || !rating) return;
    if (rating >= 4) {
      this.hop();
      this.speak(rating === 5 ? "Bravo!" : "Ja!");
    } else if (rating <= 1) {
      if (!reduceMotion()) this.el.classList.add("droop");
      this.speak("Usch…");
    }
  }
  // …and gallops across the screen when a milestone lands.
  gallop() {
    if (this.seagal || reduceMotion() || document.querySelector(".gallop")) return;
    const g = document.createElement("div");
    g.className = "gallop";
    g.setAttribute("aria-hidden", "true");
    const svg = paintedHorse();
    for (let k = 1; k <= 5; k++) svg.classList.toggle("p" + k, (this.stage ?? 0) >= k);
    g.append(svg);
    g.addEventListener("animationend", (e) => e.target === g && g.remove());
    document.body.append(g);
  }
}
