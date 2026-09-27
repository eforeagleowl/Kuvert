// The year dial: four Nixie tubes over the envelope. At every draw they roll through the years and settle,
// left to right, on the film's year before the envelope opens. Each tube holds all ten digits stacked
// behind a mesh, the way the real ones do; only the lit one glows.
import { h, reduceMotion } from "../ui/dom.js";

export class Nixie {
  constructor(root, container, { onTick } = {}) {
    this.root = root;
    this.container = container;
    this.onTick = onTick || (() => {});
    this.tubes = Array.from({ length: 4 }, () => {
      const digits = Array.from({ length: 10 }, (_, d) => h("span", { class: "digit", text: String(d), style: { scale: String(1 - d * 0.012) } }));
      const tube = h("span", { class: "tube" }, digits);
      return { tube, digits, lit: null };
    });
    container.replaceChildren(...this.tubes.map((t) => t.tube));
    this.value = null;
    this.rolling = null;
    // Tapping the dial runs the tubes through every digit, as real Nixie clocks do to keep healthy.
    root.addEventListener("click", () => this.exercise());
  }
  set(t, digit) {
    if (t.lit === digit) return;
    if (t.lit !== null) t.digits[t.lit].classList.remove("on");
    t.lit = digit;
    if (digit !== null) t.digits[digit].classList.add("on");
    t.tube.classList.toggle("on", digit !== null);
  }
  /** Shows a year straight away (or nothing). */
  show(year) {
    this.stop();
    this.value = year ?? null;
    const digits = year == null ? [null, null, null, null] : String(year).padStart(4, "0").slice(-4).split("").map(Number);
    this.tubes.forEach((t, i) => this.set(t, digits[i]));
    this.root.classList.toggle("lit", year != null);
    this.container.setAttribute("aria-label", year == null ? "No year yet" : "Year " + year);
  }
  stop() {
    if (this.rolling) {
      cancelAnimationFrame(this.rolling.raf);
      this.rolling.resolve();
      this.rolling = null;
    }
  }
  /**
   * Rolls to a year: every tube flickers through digits, slowing down, and they settle left to right.
   * Resolves when the last tube lands. Tapping skip() lands them at once.
   */
  roll(year, { duration = 1250 } = {}) {
    this.stop();
    if (reduceMotion()) {
      this.show(year);
      return Promise.resolve();
    }
    const target = String(year).padStart(4, "0").slice(-4).split("").map(Number);
    const n = this.tubes.length,
      landAt = this.tubes.map((_, i) => duration * (0.42 + (0.58 * i) / (n - 1)));
    this.root.classList.add("lit");
    return new Promise((resolve) => {
      const start = performance.now(),
        next = this.tubes.map(() => 0),
        done = this.tubes.map(() => false);
      const frame = (now) => {
        const t = now - start;
        let ticked = false;
        this.tubes.forEach((tube, i) => {
          if (done[i]) return;
          if (t >= landAt[i]) {
            done[i] = true;
            this.set(tube, target[i]);
            tube.tube.classList.remove("settle");
            void tube.tube.offsetWidth;
            tube.tube.classList.add("settle");
            ticked = true;
            return;
          }
          if (t >= next[i]) {
            // Faster at first, slowing as it nears its landing time.
            const left = (landAt[i] - t) / landAt[i];
            next[i] = t + 34 + (1 - left) * 110;
            let d;
            do d = Math.floor(Math.random() * 10);
            while (d === tube.lit);
            this.set(tube, d);
            ticked = true;
          }
        });
        if (ticked) this.onTick(done.every(Boolean));
        if (done.every(Boolean)) {
          this.rolling = null;
          this.value = year;
          this.container.setAttribute("aria-label", "Year " + year);
          resolve();
        } else this.rolling.raf = requestAnimationFrame(frame);
      };
      this.rolling = { raf: requestAnimationFrame(frame), resolve, year };
    });
  }
  skip() {
    if (!this.rolling) return;
    const year = this.rolling.year;
    this.show(year);
  }
  exercise() {
    if (this.rolling || reduceMotion()) return;
    const keep = this.value;
    let d = 0;
    const step = () => {
      this.tubes.forEach((t) => this.set(t, d));
      this.onTick(false);
      if (++d < 10) this.exerciseTimer = setTimeout(step, 55);
      else setTimeout(() => this.show(keep), 90);
    };
    this.root.classList.add("lit");
    step();
  }
}
