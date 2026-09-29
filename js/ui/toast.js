// One line at the bottom: what just happened, with Undo within reach. It goes after a few seconds,
// or sooner with a swipe; hovering or focusing it keeps it.
import { $, reduceMotion } from "./dom.js";

export class Toast {
  constructor({ onUndo }) {
    this.el = $("toast");
    this.onUndo = onUndo;
    this.undoState = null;
    this.action = null;
    this.timer = null;
    const t = this.el;
    t.addEventListener("mouseenter", () => clearTimeout(this.timer));
    t.addEventListener("mouseleave", () => !t.hidden && this.arm(3000));
    t.addEventListener("focusin", () => clearTimeout(this.timer));
    t.addEventListener("focusout", (e) => !t.contains(e.relatedTarget) && !t.hidden && this.arm(3000));
    $("dismissToast").addEventListener("click", () => this.hide());
    $("undoBtn").addEventListener("click", () => {
      const s = this.undoState;
      this.hide();
      if (s) this.onUndo(s);
    });
    $("toastAction").addEventListener("click", () => {
      const a = this.action;
      this.hide();
      a?.run();
    });
    // Swipe it away sideways or down.
    let start = null;
    t.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      clearTimeout(this.timer);
    });
    t.addEventListener("pointermove", (e) => {
      if (!start || e.pointerId !== start.id) return;
      t.style.translate = e.clientX - start.x + "px " + Math.max(0, e.clientY - start.y) + "px";
    });
    const end = (e) => {
      if (!start) return;
      const dx = e.clientX - start.x,
        dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 60 || dy > 36) this.hide();
      else {
        t.style.translate = "";
        this.arm(3000);
      }
    };
    t.addEventListener("pointerup", end);
    t.addEventListener("pointercancel", end);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !t.hidden && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        this.hide();
      }
    });
  }
  show(message, undo = null, { action = null, duration = null } = {}) {
    this.undoState = undo;
    this.action = action;
    $("toastText").textContent = message;
    $("undoBtn").hidden = !undo;
    $("toastAction").hidden = !action;
    if (action) $("toastAction").textContent = action.label;
    const t = this.el;
    t.classList.remove("leaving");
    t.style.translate = "";
    t.hidden = false;
    this.arm(duration ?? (undo || action ? 7000 : 4500));
  }
  arm(ms) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), ms);
  }
  hide() {
    clearTimeout(this.timer);
    const t = this.el;
    if (t.hidden) return;
    const hadFocus = t.contains(document.activeElement);
    this.undoState = null;
    this.action = null;
    t.classList.add("leaving");
    setTimeout(
      () => {
        t.hidden = true;
        t.classList.remove("leaving");
        t.style.translate = "";
      },
      reduceMotion() ? 0 : 200,
    );
    if (hadFocus) $("drawBtn").focus({ preventScroll: true });
  }
  // The toast sits over the bottom of the screen: scroll `el` up so it stays in reach.
  keepClear(el) {
    if (this.el.hidden) return;
    const overlap = el.getBoundingClientRect().bottom - (this.el.getBoundingClientRect().top - 24);
    if (overlap > 0) window.scrollBy({ top: overlap, behavior: reduceMotion() ? "auto" : "smooth" });
  }
}

export function announce(message) {
  $("announcement").textContent = message;
}
