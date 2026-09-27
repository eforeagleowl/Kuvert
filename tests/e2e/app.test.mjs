// The rebuild in a real browser: it starts clean on every page, and the evening works end to end.
import { test } from "node:test";
import assert from "node:assert/strict";
import { env, newContext, openPage, go, problems, nextProgress } from "./helpers.mjs";

test("every page starts without errors or policy violations", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  for (const name of ["library", "stats", "settings", "tonight"]) {
    await page.click(`a[data-route="${name}"]:visible`);
    await page.waitForFunction((n) => document.documentElement.dataset.page === n && !document.getElementById("page-" + n).hidden, name);
  }
  assert.equal(await page.evaluate(() => location.hash), "#tonight");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the draw: seal, dial and ticket, with the full animation", async () => {
  const context = await env.browser.newContext({ serviceWorkers: "block", reducedMotion: "no-preference" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript(() => localStorage.setItem("kuvert:welcomed", "1"));
  const page = await openPage(context, "/");
  // Every frame while the halves of the seal fly: is the whole seal still showing underneath?
  await page.evaluate(() => {
    window.__sealFrames = [];
    const tick = () => {
      if (document.querySelector(".seal-half")) window.__sealFrames.push(getComputedStyle(document.getElementById("seal")).visibility);
      if (window.__sealFrames.length < 40) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.click("#drawBtn");
  await page.waitForFunction(() => window.__sealFrames.length >= 5);
  const sealFrames = await page.evaluate(() => window.__sealFrames);
  assert.ok(sealFrames.every((v) => v === "hidden"), "the seal breaks: no whole seal under the flying halves");
  // Mid-draw the dial rolls; afterwards it shows the film's year.
  await page.waitForSelector("#ticket:not([hidden])", { timeout: 6000 });
  await page.waitForFunction(() => !window.kuvert.app.stage.busy, null, { timeout: 6000 });
  const { title, year, current } = await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    return { title: document.getElementById("pickTitle").textContent, year: window.kuvert.app.stage.nixie.value, current: catalog.byId.get(store.p.current) };
  });
  assert.equal(title, current.t);
  assert.equal(year, current.y);
  assert.equal(await page.getAttribute("#stage", "data-state"), "open");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("an evening: draw, mark watched, rate, undo", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.click("#drawBtn");
  await page.waitForSelector("#ticket:not([hidden])");
  const id = await page.evaluate(() => window.kuvert.app.store.p.current);
  assert.ok(id);

  await page.click("#markBtn");
  await page.waitForFunction((id) => window.kuvert.app.store.p.seen.has(id), id);
  assert.match(await page.textContent("#tally"), /^1 of \d+ watched/);
  assert.ok(await page.isVisible(".stamp-sedd"));

  // Keys 1–5 rate the stub that's showing.
  await page.locator("body").press("4");
  await page.waitForFunction((id) => window.kuvert.app.store.p.reviews[id]?.rating === 4, id);

  // Saved for the classic app to read, in the shared format.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kuvert:v4")));
  assert.ok(saved.seen.includes(id));
  assert.equal(saved.v, 7);

  // Undo goes back to before the mark, stars and all.
  await page.click("#undoBtn");
  await page.waitForFunction((id) => !window.kuvert.app.store.p.seen.has(id), id);
  assert.equal((await nextProgress(page)).reviews[id], undefined);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("a saved ticket stays sealed: nothing names it or its year until the envelope opens on it", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  // Tonight's film, drawn earlier and put back in the envelope unwatched.
  const film = await page.evaluate(() => {
    const { store, catalog, stage } = window.kuvert.app;
    const f = catalog.films.find((x) => x.t.length > 14 && !x.tri);
    store.pick(f.id);
    stage.syncPick();
    return { id: f.id, t: f.t, y: f.y };
  });
  const sealed = async (when) => {
    await page.waitForSelector("#resumePick:not([hidden])");
    const seen = await page.evaluate(() => ({ text: document.getElementById("page-tonight").innerText, year: window.kuvert.app.stage.nixie.value }));
    assert.ok(!seen.text.includes(film.t), when + ": the title shows before the envelope opens");
    assert.ok(!seen.text.includes(String(film.y)), when + ": the year shows before the envelope opens");
    assert.equal(seen.year, null, when + ": the dial shows the year before the envelope opens");
  };
  await sealed("saved");
  await page.reload();
  await page.waitForFunction(() => window.kuvert?.app);
  await sealed("after a reload");
  // Opening the envelope reveals that film, not a new one.
  await page.click("#drawBtn");
  await page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);
  assert.equal(await page.evaluate(() => window.kuvert.app.store.p.current), film.id);
  assert.equal(await page.textContent("#pickTitle"), film.t);
  assert.equal(await page.evaluate(() => window.kuvert.app.stage.nixie.value), film.y);
  // Closed again, it's sealed again.
  await page.click("#ticketClose");
  await page.waitForFunction(() => !window.kuvert.app.stage.busy && !window.kuvert.app.stage.open);
  await sealed("closed again");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("draw again never repeats the film on the ticket", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.click("#drawBtn");
  await page.waitForSelector("#ticket:not([hidden])");
  let last = await page.evaluate(() => window.kuvert.app.store.p.current);
  for (let i = 0; i < 6; i++) {
    await page.click("#againBtn");
    await page.waitForFunction((last) => window.kuvert.app.store.p.current !== last && !window.kuvert.app.stage.busy, last);
    last = await page.evaluate(() => window.kuvert.app.store.p.current);
  }
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("SEAGAL: in through the brave link, out on the second request", async () => {
  const context = await newContext();
  const page = await openPage(context, "/#settings");
  await page.click("#braveLink");
  await page.waitForFunction(() => document.documentElement.dataset.mode === "seagal" && window.kuvert?.app);
  assert.equal(await page.evaluate(() => window.kuvert.app.list.id), "seagal");
  assert.equal(await page.title(), "SEAGAL — Classified");

  await page.click("#standDownFooter");
  assert.match(await page.textContent("#toastText"), /Request denied/);
  await Promise.all([page.waitForEvent("load"), page.click("#standDownFooter")]);
  await page.waitForFunction(() => window.kuvert?.app);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.mode ?? null), null);
  assert.equal(await page.evaluate(() => window.kuvert.app.list.id), "builtin");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("a backup file made by the rebuild loads back in", async () => {
  const context = await newContext();
  // Headless Chromium has no file pickers to click through: use the download and <input type=file> path.
  await context.addInitScript(() => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
  });
  const page = await openPage(context, "/");
  await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    for (const f of catalog.films.slice(3, 9)) store.markSeen(f.id, true);
    store.rate(catalog.films[3].id, 3.5);
  });
  const before = await nextProgress(page);
  await page.click('a[data-route="settings"]:visible');
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#saveFile")]);
  assert.equal(download.suggestedFilename(), "kuvert-progress.json");
  const file = await download.path();

  await page.evaluate(() => window.kuvert.app.store.reset());
  await go(page, "/#settings");
  assert.equal((await nextProgress(page)).seen.length, 0);
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("#openFile")]);
  await chooser.setFiles(file);
  await page.waitForSelector("#restoreDialog[open]");
  await page.click("#replaceProgress");
  await page.waitForFunction((n) => window.kuvert.app.store.p.seen.size === n, before.seen.length);
  const after = await nextProgress(page);
  assert.deepEqual(after.seen, before.seen);
  assert.deepEqual(after.reviews, before.reviews);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("an unreadable save is never written over until you choose to start fresh", async () => {
  const context = await newContext();
  const page = await context.newPage();
  page.problems = [];
  await page.goto(env.url + "/tools/blank.html");
  const broken = '{"app":"kuvert","v":7,"seen":["1927-wings","1942-casab';
  await page.evaluate((b) => localStorage.setItem("kuvert:v4", b), broken);
  await go(page, "/");
  assert.ok(await page.isVisible("#unreadable"), "the notice explains what happened");
  await page.click("#drawBtn");
  await page.waitForSelector("#ticket:not([hidden])");
  await page.click("#markBtn");
  assert.equal(await page.evaluate(() => localStorage.getItem("kuvert:v4")), broken);
  assert.equal(await page.evaluate(() => localStorage.getItem("kuvert:unreadable:kuvert:v4")), broken);
  // Start fresh, after confirming: saving resumes; the spare copy stays.
  await page.click("#ticketClose").catch(() => {});
  await page.click("#unreadableFresh");
  await page.click("#confirmYes");
  await page.waitForFunction(() => localStorage.getItem("kuvert:v4")?.startsWith("{"));
  assert.notEqual(await page.evaluate(() => localStorage.getItem("kuvert:v4")), broken);
  assert.equal(await page.evaluate(() => localStorage.getItem("kuvert:unreadable:kuvert:v4")), broken);
  await page.waitForSelector("#unreadable", { state: "hidden" });
  await context.close();
});

test("Tonight reminds you to keep a copy, and one tap makes it", async () => {
  const context = await newContext();
  await context.addInitScript(() => {
    delete window.showSaveFilePicker; // headless has no file picker to click through
  });
  const page = await openPage(context, "/");
  assert.equal(await page.isVisible("#keepCopy"), false);
  await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    for (const f of catalog.films.slice(0, 3)) store.markSeen(f.id, true);
  });
  await page.waitForSelector("#keepCopy:not([hidden])");
  assert.match(await page.textContent("#keepCopyText"), /3 watched films live only in this browser/);
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#keepCopySave")]);
  assert.equal(download.suggestedFilename(), "kuvert-progress.json");
  await page.waitForSelector("#keepCopy", { state: "hidden" });
  // The copy is a real backup, recorded the way the classic app records a download.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kuvert:v4")).lastBackup);
  assert.equal(saved.kind, "download");
  // Settings says how safe this browser's copy is.
  await page.click('a[data-route="settings"]:visible');
  assert.match(await page.textContent("#storageStatus"), /This browser/);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("group night: add a friend's code, and the draw only picks films neither of you has seen", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  // Anna's code, made the way her Kuvert makes it: the first 120 films watched.
  const { code, annaSeen, before } = await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    const before = store.units().length;
    const saved = store.p;
    const ids = catalog.films.slice(0, 120).map((f) => f.id);
    store.p = { ...saved, seen: new Set(ids) };
    const code = store.code();
    store.p = saved;
    return { code, annaSeen: ids, before };
  });
  // Tonight's ticket before group night: a film Anna has seen.
  await page.evaluate((id) => window.kuvert.app.store.pick(id), annaSeen[5]);
  await page.click("#openGroup");
  await page.fill("#groupName", "Anna");
  await page.fill("#groupCode", code);
  await page.click("#groupAdd");
  await page.waitForSelector(".group-people li:nth-child(2)");
  assert.match(await page.textContent("#groupSummary"), /films none of the 2 people has seen/);
  await page.click("#groupDone");
  assert.match(await page.textContent("#openGroup"), /Group night · 2/);
  const after = await page.evaluate(() => window.kuvert.app.store.units().length);
  assert.ok(after < before && after > 0);
  assert.match(await page.textContent("#eligibleCount"), /none of you has seen/);

  // The ticket already out says Anna has seen it; drawing again picks one she hasn't.
  await page.click("#resumeFilm");
  await page.waitForSelector("#ticket:not([hidden])");
  await page.waitForSelector("#groupLine:not([hidden])");
  assert.equal(await page.textContent("#groupLine"), "Anna has seen this one.");
  for (let i = 0; i < 5; i++) {
    await page.click("#againBtn");
    await page.waitForFunction(() => !window.kuvert.app.stage.busy);
    const id = await page.evaluate(() => window.kuvert.app.store.p.current);
    assert.ok(!annaSeen.includes(id), "drew a film Anna has seen: " + id);
  }
  await page.waitForFunction(() => document.getElementById("groupLine").textContent.startsWith("Group night: none of you"));
  // Only Anna's name and watched films were kept, and nothing went into your own save.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("kuvert:group:builtin")));
  assert.deepEqual(Object.keys(stored.people[0]).sort(), ["added", "name", "seen"]);
  assert.equal(await page.evaluate(() => localStorage.getItem("kuvert:v4").includes("Anna")), false);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("closing in the middle of a draw finishes the draw, then closes cleanly", async () => {
  const context = await env.browser.newContext({ serviceWorkers: "block", reducedMotion: "no-preference" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript(() => localStorage.setItem("kuvert:welcomed", "1"));
  const page = await openPage(context, "/");
  const closed = () =>
    page.waitForFunction(() => {
      const s = window.kuvert.app.stage;
      return !s.busy && !s.open && document.getElementById("ticket").hidden && !document.getElementById("ticket").getAnimations().length && !document.getElementById("envelope").getAnimations().length;
    }, null, { timeout: 8000 });
  // While the ticket is still coming out.
  await page.click("#drawBtn");
  await page.waitForSelector("#ticket:not([hidden])");
  await page.evaluate(() => window.kuvert.app.stage.close());
  await closed();
  // While drawing again.
  await page.click("#drawBtn");
  await page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open, null, { timeout: 8000 });
  await page.click("#againBtn");
  await page.waitForTimeout(200);
  await page.evaluate(() => window.kuvert.app.stage.close());
  await closed();
  assert.equal(await page.getAttribute("#stage", "data-state"), "closed");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the envelope moves smoothly: the ticket comes out from under it, never over it, and nothing jumps", async () => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const context = await env.browser.newContext({ serviceWorkers: "block", reducedMotion: "no-preference", viewport });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    await context.addInitScript(() => localStorage.setItem("kuvert:welcomed", "1"));
    const page = await openPage(context, "/");
    // Every frame: where the ticket, the envelope and its flap are on screen, how much of the ticket is
    // cut off at the top, the scroll position and the page height.
    await page.evaluate(() => {
      window.__frames = [];
      const tick = () => {
        const t = document.getElementById("ticket"),
          e = document.getElementById("envelope").getBoundingClientRect(),
          flap = document.querySelector(".env-flap");
        const r = t.getBoundingClientRect(),
          cs = getComputedStyle(t),
          cut = cs.clipPath.startsWith("inset(") ? parseFloat(cs.clipPath.slice(6)) : null;
        window.__frames.push({
          hidden: t.hidden,
          tTop: r.top,
          tH: r.height,
          // The first row of the ticket that shows (it's cut off above that while it moves).
          shows: cut === null ? null : r.top + cut * (r.width / t.offsetWidth || 1),
          opacity: +cs.opacity,
          eTop: e.top,
          eBottom: e.bottom,
          eLeft: e.left,
          eW: e.width,
          flapTop: flap.getBoundingClientRect().top,
          flapOpacity: +getComputedStyle(flap).opacity,
          sy: scrollY,
          docH: document.documentElement.scrollHeight,
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const take = () => page.evaluate(() => window.__frames.splice(0));
    // Done: nothing left moving on the ticket or the envelope (the dial and the horse never stop).
    const settled = (open = true) =>
      page.waitForFunction(
        (open) => !window.kuvert.app.stage.busy && document.getElementById("ticket").hidden === !open && ["ticket", "envelope"].every((id) => !document.getElementById(id).getAnimations().length),
        open,
        { timeout: 8000 },
      );
    const W = viewport.width,
      at = `(${W}px wide)`;
    const neverOver = (frames, what) => {
      const moving = frames.filter((f) => !f.hidden && f.shows !== null);
      assert.ok(moving.length > 5, what + ": the ticket's move was recorded " + at);
      for (const f of moving) assert.ok(f.shows >= f.eBottom - 1, `${what}: no part of the ticket shows above the envelope's lower edge ${at}`);
      for (const f of frames) assert.equal(f.opacity, 1, `${what}: the ticket is never dimmed ${at}`);
    };

    await take();
    await page.click("#drawBtn");
    await settled();
    const opening = await take();
    const out = opening.filter((f) => !f.hidden);
    const finalH = out.at(-1).tH;
    assert.ok(out[0].tH < finalH * 0.95, "the ticket starts small, inside the envelope " + at);
    for (let i = 1; i < out.length; i++) assert.ok(out[i].tTop >= out[i - 1].tTop - 1, "the ticket only ever comes down, out of the envelope " + at);
    for (const f of opening) assert.ok(Math.abs(f.eLeft - (W - f.eW) / 2) <= 1.5, "the envelope stays centred " + at);
    for (const f of opening) if (f.flapOpacity > 0.05) assert.ok(f.flapTop >= f.eTop - 2, "the flap never folds up over the dial " + at);
    neverOver(opening, "opening");
    // Finished: the ticket's top edge stays tucked under the envelope, which is in front of it.
    const tucked = await page.evaluate(() => {
      const e = document.getElementById("envelope").getBoundingClientRect(),
        t = document.getElementById("ticket").getBoundingClientRect();
      return { overlap: e.bottom - t.top, front: document.getElementById("envelope").contains(document.elementFromPoint(t.left + t.width / 2, e.bottom - 3)) };
    });
    assert.ok(tucked.overlap > 4 && tucked.front, "the ticket's top edge is tucked under the envelope " + at);

    // Draw again: the ticket goes back in and the next one comes out.
    await take();
    await page.click("#againBtn");
    await settled();
    neverOver(await take(), "draw again");

    // Scrolled down to the ticket's buttons, then closed (as Done does, with no scrolling first).
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(150);
    await take();
    await page.evaluate(() => window.kuvert.app.stage.close());
    await settled(false);
    const closing = await take();
    for (let i = 1; i < closing.length; i++) assert.ok(Math.abs(closing[i].sy - closing[i - 1].sy) < 60, "the view glides, it doesn't snap " + at);
    neverOver(closing, "closing");
    const growing = closing.filter((f) => f.hidden);
    assert.ok(growing.length > 5, "the envelope's return was recorded " + at);
    for (const f of growing) {
      assert.ok(Math.abs(f.eLeft - (W - f.eW) / 2) <= 1.5, "the envelope stays centred while it grows " + at);
      assert.equal(f.sy, growing.at(-1).sy, "the view holds still while the envelope grows " + at);
      assert.ok(f.sy + viewport.height <= f.docH + 1, "the page never gets too short for where you are, so the view never jumps " + at);
      if (f.flapOpacity > 0.05) assert.ok(f.flapTop >= f.eTop - 2, "the flap comes down without rising over the dial " + at);
    }
    assert.deepEqual(await problems(page), []);
    await context.close();
  }
});
