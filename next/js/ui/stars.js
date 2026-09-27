// Stars from half a star to five. Tap a star (or its left half for a half), drag across, or use the
// keyboard: arrows step by half, 1–5 jump, Home/End, Delete clears.
import { s } from "./dom.js";

const STAR_PATH = "M12 2.6l2.83 5.9 6.47.8-4.77 4.45 1.24 6.42L12 17.02l-5.77 3.15 1.24-6.42L2.7 9.3l6.47-.8z";
export { STAR_PATH };

export class StarSlider {
  constructor(el, { label, onChange, size = "lg" } = {}) {
    this.el = el;
    this.value = null;
    this.onChange = onChange || (() => {});
    el.className = "stars size-" + size;
    el.tabIndex = 0;
    el.setAttribute("role", "slider");
    el.setAttribute("aria-label", label || "Your rating");
    el.setAttribute("aria-valuemin", "0");
    el.setAttribute("aria-valuemax", "5");
    el.replaceChildren();
    this.stars = [];
    for (let i = 0; i < 5; i++) {
      const star = document.createElement("span"),
        fill = document.createElement("span");
      star.className = "star";
      fill.className = "s-fill";
      fill.append(s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: STAR_PATH })));
      star.append(s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: STAR_PATH })), fill);
      el.append(star);
      this.stars.push(star);
    }
    let dragging = false;
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      el.setPointerCapture?.(e.pointerId);
      this.paint(this.fromX(e.clientX));
    });
    el.addEventListener("pointermove", (e) => {
      if (dragging || e.pointerType === "mouse") this.paint(this.fromX(e.clientX));
    });
    el.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      this.commit(this.fromX(e.clientX));
    });
    el.addEventListener("pointercancel", () => {
      dragging = false;
      this.paint(this.value);
    });
    el.addEventListener("pointerleave", () => {
      if (!dragging) this.paint(this.value);
    });
    el.addEventListener("keydown", (e) => {
      const v = this.value || 0;
      let next;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(5, v + 0.5);
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = v <= 0.5 ? null : v - 0.5;
      else if (e.key === "Home") next = 0.5;
      else if (e.key === "End") next = 5;
      else if (e.key === "Delete" || e.key === "Backspace" || e.key === "0") next = null;
      else if (/^[1-5]$/.test(e.key)) next = Number(e.key);
      else return;
      e.preventDefault();
      e.stopPropagation();
      this.commit(next);
    });
    this.paint(null);
  }
  // Each star has two halves; the left half gives x.5.
  fromX(x) {
    for (let i = 0; i < 5; i++) {
      const r = this.stars[i].getBoundingClientRect();
      if (x < r.right || i === 4) {
        if (x < r.left) return i === 0 ? 0.5 : i;
        return x - r.left < r.width / 2 ? i + 0.5 : i + 1;
      }
    }
    return 5;
  }
  paint(v) {
    this.stars.forEach((star, i) => {
      const fill = v == null ? 0 : Math.max(0, Math.min(1, v - i));
      star.style.setProperty("--fill", fill * 100 + "%");
    });
  }
  setValue(v) {
    this.value = v ?? null;
    this.el.setAttribute("aria-valuenow", String(this.value || 0));
    this.el.setAttribute("aria-valuetext", this.value ? this.value + (this.value === 1 ? " star" : " stars") : "No rating");
    this.paint(this.value);
  }
  commit(v) {
    const was = this.value;
    this.setValue(v);
    // The star you landed on gives a little pop.
    if (v && v !== was) {
      const star = this.stars[Math.ceil(v) - 1];
      star.classList.remove("pop");
      void star.offsetWidth;
      star.classList.add("pop");
    }
    this.onChange(this.value);
  }
}
