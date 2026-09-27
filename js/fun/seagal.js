// SEAGAL mode: a hidden skin over the same app, switched on from the small "for the brave." link in About.
// Same progress, same functions, different words. It installs Steven Seagal's filmography as a list and
// switches to it. Standing down takes two tries.
import { $, h, s } from "../ui/dom.js";
import { KEYS } from "../compat/keys.js";
import { installSeagalList, SEAGAL_LIST_ID } from "../data/lists.js";
import { plural } from "../state/stats.js";

export function enterSeagal(storage) {
  try {
    storage.setItem(KEYS.mode, "seagal");
    sessionStorage.setItem(KEYS.clearance, "1");
    installSeagalList(storage);
    storage.setItem(KEYS.activeList, SEAGAL_LIST_ID); // straight to the filmography
  } catch {}
  location.reload();
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const digits = (n) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, "0");
const hash = (id) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// Toasts and lines the app writes as it goes, in SEAGAL's words.
const REWRITES = [
  [/ marked watched\./, " neutralized."],
  [/ moved to Skipped\./, " abandoned. Cowardice logged in your permanent record. Your ponytail is disappointed in you."],
  [/^Sedd! /, ""],
];

export function installSeagal(app) {
  const { storage, store, stage } = app;
  const rec = {
    get: (k, d) => {
      try {
        return JSON.parse(storage.getItem(KEYS.seagal(k))) ?? d;
      } catch {
        return d;
      }
    },
    set: (k, v) => {
      try {
        storage.setItem(KEYS.seagal(k), JSON.stringify(v));
      } catch {}
    },
  };
  try {
    installSeagalList(storage); // brings older installs up to date (the album)
  } catch {}

  // Words that never change: the frame of the app.
  for (const el of document.querySelectorAll("[data-sg]")) el.textContent = el.dataset.sg;
  for (const el of document.querySelectorAll("[data-name]")) el.textContent = "SEAGAL";
  for (const el of document.querySelectorAll("[data-subtitle]")) el.textContent = "Classified films. Deployed at random. No questions.";
  document.title = "SEAGAL — Classified";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#141b1d");
  $("seal").title = "Top secret";
  $("braveLink").hidden = true;
  $("standDown").hidden = false;
  document.querySelector(".stamp-sedd").textContent = "Mission complete";

  // The folder carries a case number, or one visit in three a working title.
  const caseNo =
    pick("ABCDEFGHJKLMNPQRSTUVWXZ") + pick("ABCDEFGHJKLMNPQRSTUVWXZ") + "-" + digits(4) + "/" +
    pick(["WALRUS", "CUMMERBUND", "OKRA", "PONYTAIL", "GRAVY", "HAMMOCK", "TANGERINE", "LAPTOP", "BISCUIT", "TURTLENECK", "SPATULA", "KARATE"]) + "-" + digits(2) + pick(["Ω", "Δ", "Z", "X", "9"]);
  const working = pick(["Hard to", "Marked for", "Out for", "Above", "Under", "Driven to", "Born to", "Exit", "Fire Down", "Half Past"]) + " " + pick(["Justice", "Death", "Kill", "the Law", "Siege", "Vengeance", "Fury", "Execution", "Conviction", "Honor"]);
  $("caseNo").textContent = Math.random() < 1 / 3 ? "Working title: " + working.toUpperCase() : "Case no. " + caseNo;
  document.querySelector(".edition").replaceChildren(h("strong", {}, h("span", { class: "redacted", text: "[REDACTED]" }), " Seagal"), "Top secret // eyes only");
  // A Russian flag sticker on the case file.
  document.querySelector(".env-front").append(h("span", { class: "case-flag", title: "Russian flag" }, h("i"), h("i"), h("i")));

  // Toasts in SEAGAL's words.
  const show = app.toast.show.bind(app.toast);
  app.toast.show = (msg, ...rest) => show(REWRITES.reduce((m, [re, to]) => m.replace(re, to), msg), ...rest);

  // Cowardice takes three tries. The first two refuse.
  let tries = 0,
    triedOn = null;
  app.seagalSkip = () => {
    if (triedOn !== store.p.current) {
      triedOn = store.p.current;
      tries = 0;
    }
    tries++;
    if (tries === 1) app.toast.show("You cannot go back now.");
    else if (tries === 2) app.toast.show("We have been over this.");
    else {
      tries = 0;
      rec.set("cowardice", rec.get("cowardice", 0) + 1);
      stage.skip();
    }
    return true;
  };
  // Redeploying three times in a row calls in the body double.
  let redeploys = 0;
  $("againBtn").addEventListener("click", () => {
    if (++redeploys >= 3) {
      redeploys = 0;
      app.toast.show("Target keeps escaping. Deploying body double.");
    }
  });
  // Marking watched: note the time (for Half Past Dead) and whether it had been set aside (Hard to Kill).
  $("markBtn").addEventListener(
    "click",
    () => {
      redeploys = 0;
      rec.set("marks", [...rec.get("marks", []), Date.now()].slice(-500));
      if (store.p.current && store.p.skipped.has(store.p.current)) rec.set("hardToKill", true);
    },
    true,
  );
  // Every deployment lands with a jolt.
  app.seagalDeploy = () => {
    const el = $("stage");
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  };
  // ↑↑↓↓←→←→BA
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let konami = 0;
  document.addEventListener("keydown", (e) => {
    konami = e.key === KONAMI[konami] ? konami + 1 : e.key === KONAMI[0] ? 1 : 0;
    if (konami < KONAMI.length) return;
    konami = 0;
    const flash = h("div", { class: "aikido" }, h("b", { text: "Aikido engaged" }));
    document.body.append(flash);
    document.body.classList.remove("shake");
    void document.body.offsetWidth;
    document.body.classList.add("shake");
    setTimeout(() => flash.remove(), 1600);
  });

  // The ticket: case stamps, the title coming out from under the black bars.
  let lastTitle = "";
  app.seagalTicket = (f) => {
    const film = f && f.kind !== "album";
    const want = [film && app.list.id === SEAGAL_LIST_ID && f.y >= 2003 ? "Direct to video // Priority low" : "", film && hash(f.id) % 6 === 0 ? "Seated combat certified" : ""].filter(Boolean);
    $("caseStamps").replaceChildren(...want.map((t, i) => h("span", { class: "case-stamp s" + i, text: t })));
    $("ticket").classList.toggle("special", f?.kind === "album");
    if (f.t !== lastTitle) {
      lastTitle = f.t;
      const title = $("pickTitle");
      title.classList.remove("unredact");
      void title.offsetWidth;
      title.classList.add("unredact");
    }
  };
  // Special assignment: a tape deck instead of film details.
  let cassette = null,
    tapeTimer = null;
  app.seagalCassette = (f) => {
    if (f?.kind === "album" && !cassette) {
      let n = 0;
      const counter = h("span", { class: "counter", text: "000" });
      const show = () => (counter.textContent = String(n % 1000).padStart(3, "0"));
      const btn = (c, label) => h("button", { type: "button", dataset: { c }, text: label });
      cassette = h(
        "div",
        { class: "cassette" },
        h("div", { class: "tape" }, h("i", { class: "reel" }), h("span", { text: "Songs from the Crystal Cave · Side A" }), h("i", { class: "reel" })),
        h(
          "div",
          {
            class: "deck",
            on: {
              click: (e) => {
                const c = e.target.closest("button")?.dataset.c;
                if (!c) return;
                if (c === "play" && !tapeTimer) {
                  cassette.classList.add("playing");
                  tapeTimer = setInterval(() => (n++, show()), 400);
                }
                if (c === "stop" || c === "rew") {
                  cassette.classList.remove("playing");
                  clearInterval(tapeTimer);
                  tapeTimer = null;
                }
                if (c === "rew") n = 0;
                if (c === "ff") n += 100;
                show();
              },
            },
          },
          btn("rew", "◄◄"),
          btn("play", "▶ Play"),
          btn("stop", "■ Stop"),
          btn("ff", "►►"),
          counter,
        ),
      );
      $("caseStamps").after(cassette);
    } else if (f?.kind !== "album" && cassette) {
      clearInterval(tapeTimer);
      tapeTimer = null;
      cassette.remove();
      cassette = null;
    }
  };
  // The permanent record and commendations of dubious honor, in Debrief.
  const ponytail = () =>
    s("svg", { class: "ponytail", viewBox: "0 0 24 24", "aria-hidden": "true" }, s("circle", { cx: 10, cy: 9, r: 6 }), s("path", { d: "M15 7c4 0 6 3 5 8s-3 7-2 9c-3-1-4-4-3-7s1-5-1-7z" }));
  app.seagalStats = () => {
    const p = store.p;
    const minutes = app.catalog.films.filter((x) => p.seen.has(x.id)).reduce((a, x) => a + (p.runtimes[x.id] || 0), 0),
      acts = rec.get("cowardice", 0);
    $("sgRecord").hidden = false;
    $("sgRecord").replaceChildren(ponytail(), "Ponytail-hours logged: " + Math.round(minutes / 60) + "h · Permanent record: " + (acts ? plural(acts, "act") + " of cowardice" : "clean"));
    const marks = rec.get("marks", []),
      perDay = {};
    for (const d of Object.values(p.dates)) perDay[d] = (perDay[d] || 0) + 1;
    const cards = [
      ["12AM", "Half Past Dead", "Mark a film watched on a weeknight, past midnight.", marks.some((t) => { const d = new Date(t); return d.getHours() < 4 && d.getDay() >= 2 && d.getDay() <= 5; })],
      ["2×", "Driven to Kill", "Two films in one day.", Object.values(perDay).some((n) => n >= 2)],
      ["1★", "Out for Justice", "Give a film one star or less.", Object.values(p.reviews).some((r) => r?.rating != null && r.rating <= 1)],
      ["Back", "Hard to Kill", "Watch a film you once set aside.", rec.get("hardToKill", false)],
    ];
    $("milestoneGrid").append(
      ...cards.map(([markText, title, desc, earned]) =>
        h(
          "article",
          { class: "milestone sg-card" + (earned ? " earned" : "") },
          h("span", { class: "milestone-stamp", attrs: { "aria-hidden": "true" } }, h("b", { class: "word", text: markText })),
          h("h4", { text: title }),
          h("p", { text: desc }),
          h("p", { class: "milestone-count", text: earned ? "Earned" : "Not yet" }),
        ),
      ),
    );
  };

  // Straight after "for the brave.": the clearance screen.
  try {
    if (sessionStorage.getItem(KEYS.clearance)) {
      sessionStorage.removeItem(KEYS.clearance);
      const lines = ["SEAGAL-OS 1.0  (C) 1988", "MEMORY TEST ........ 640K OK", "LOADING CASE FILES .. " + app.catalog.films.length + " FOUND", "PONYTAIL ............ SECURED", "AIKIDO MODULE ....... ONLINE"];
      const screen = h(
        "div",
        { class: "clearance", attrs: { role: "status" } },
        h("pre", { class: "boot" }, lines.map((l, i) => h("span", { text: l, style: { "animation-delay": (i * 0.22).toFixed(2) + "s" } }))),
        h("b", { text: "Clearance granted" }),
        h("span", { text: "Welcome back, operative." }),
      );
      document.body.append(screen);
      setTimeout(() => screen.remove(), 4200);
    }
  } catch {}
}

// Standing down is denied the first time.
export function makeStandDown(app) {
  let asked = false;
  return () => {
    if (!asked) {
      asked = true;
      app.toast.show("Request denied. Try again.");
      return;
    }
    try {
      app.storage.removeItem(KEYS.mode);
      if (app.list.id === SEAGAL_LIST_ID) app.storage.setItem(KEYS.activeList, "builtin");
    } catch {}
    location.reload();
  };
}
