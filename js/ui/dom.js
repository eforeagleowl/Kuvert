// Building the page. The page runs under Trusted Types, so nothing here parses HTML: every element is
// made with createElement and every piece of text goes in as text.

export const $ = (id) => document.getElementById(id);
export const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * h("button", { class: "btn", text: "Go", on: { click } , attrs: { "aria-label": "…" }, style: { "--p": "40%" } }, ...children)
 * Children can be strings (text), nodes, arrays, or null/false (skipped).
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  apply(el, props);
  append(el, children);
  return el;
}
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  append(el, children);
  return el;
}
function apply(el, props) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "on") for (const [type, fn] of Object.entries(v)) el.addEventListener(type, fn);
    else if (k === "attrs") for (const [a, av] of Object.entries(v)) av != null && av !== false && el.setAttribute(a, av === true ? "" : av);
    else if (k === "style") for (const [p, pv] of Object.entries(v)) el.style.setProperty(p, pv);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el[k] = v;
  }
}
function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// An icon from the sprite at the top of the page (Lucide, ISC license).
export function icon(name, cls = "icon") {
  return s("svg", { class: cls, "aria-hidden": "true" }, s("use", { href: "#i-" + name }));
}
export function mark(id, cls, viewBox = "0 0 100 90") {
  return s("svg", { class: cls, viewBox, "aria-hidden": "true" }, s("use", { href: "#" + id }));
}
export const check = () => s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: "M20 6 9 17l-5-5" }));

export function setText(id, text) {
  const el = typeof id === "string" ? $(id) : id;
  el.textContent = text || "";
  el.hidden = !text;
}

// Lists with nothing in them say what's missing and offer the next step.
export function emptyState(title, text = "", action = null, { horse = true } = {}) {
  return h(
    "li",
    { class: "empty" },
    horse && document.documentElement.dataset.mode !== "seagal" ? mark("dala-mark", "empty-horse") : null,
    h("strong", { text: title }),
    text ? h("span", { text }) : null,
    action ? h("button", { class: "btn", type: "button", text: action.label, on: { click: action.run } }) : null,
  );
}

// Keeps keyboard focus on "the same" control across a re-render (matched by data-key).
export function keepFocus(render) {
  const active = document.activeElement,
    key = active?.dataset?.key;
  render();
  if (key && document.activeElement !== active) {
    const same = document.querySelector('[data-key="' + CSS.escape(key) + '"]');
    same?.focus({ preventScroll: true });
  }
}

export async function copyText(text, fallback) {
  try {
    if (!navigator.clipboard?.writeText) throw Error();
    await navigator.clipboard.writeText(text);
    if (fallback) fallback.hidden = true;
    return true;
  } catch {
    if (fallback) {
      fallback.hidden = false;
      fallback.value = text;
      fallback.focus();
      fallback.select();
    }
    return false;
  }
}

// Runs a DOM change inside a View Transition where the browser has them.
export function transition(update, types = []) {
  if (!document.startViewTransition || reduceMotion()) {
    update();
    return Promise.resolve();
  }
  try {
    return document.startViewTransition({ update, types }).finished.catch(() => {});
  } catch {
    // Browsers with View Transitions but without types take the plain form.
    return document.startViewTransition(update).finished.catch(() => {});
  }
}

export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
