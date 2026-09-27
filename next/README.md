# Kuvert, rebuilt

The same app as the classic Kuvert one folder up, rebuilt from the ground up: every feature
(listed in [FEATURES.md](FEATURES.md)), the same saves, codes and backup files, and a new interface.
It lives at `/next/` on the same site, so both apps share one browser's progress and you can move
between them freely. When it has earned it, it can replace the classic page.

## What's new on the surface

- **Tonight.** A wax-sealed envelope and a four-tube Nixie year dial. Opening it cracks the seal,
  rolls the tubes to the film's year, folds back the flap and lifts the ticket out. Tap to skip ahead.
  *Draw again* dips the ticket back into the pocket and re-rolls the dial.
- **The dala horse** gets painted as the watchthrough goes on, from bare wood through a red coat,
  harness, saddle and saddle flowers to gold details. It still sleeps after midnight, nods, hops and
  runs off.
- **Stats** opens with an LED board: one bulb per film, oldest first. It sweeps on entry and spells
  your count in a 5×7 font when tapped.
- **Kurbits** flowers (Dalarna folk painting) along the margins of wide screens, painted in from
  the bottom as films get watched, beside rails with your latest stubs and each decade's progress.
- **SEAGAL** mode is still behind "for the brave." in About, with its terminal skin, case files,
  clearance screen and the two tries it takes to stand down.

## How it's built

No build step and no dependencies at runtime: plain ES modules and CSS served as they are.

```
index.html        the page: every screen's markup, the icon sprite and a strict CSP
css/              tokens → base → components → tonight → pages → seagal, as @layer
js/compat/        the save formats, frozen: shared with the classic app, byte for byte
js/data/          the catalogue (generated from the classic page) and lists
js/state/         one Store (an EventTarget) and pure rules: draw, stats, dates, merge
js/storage/       backup files (File System Access or download) and GitHub Gist sync
js/tmdb/          posters, runtimes and streaming from TMDB (optional)
js/views/         Tonight (stage, nixie, evening), Library, Stats, Settings, rails
js/ui/            DOM helpers, toast, dialogs, stars, sounds, the horse
js/share/         ticket and ranking images, drawn on a canvas
js/fun/           SEAGAL
sw.js             offline: precaches every file under a version stamped from their contents
```

- **One state object.** Every change goes through `Store`, which saves, emits `change`, and hands
  back an undo snapshot. Views re-render from it on the next frame.
- **Security.** The CSP allows only this site's own scripts, styles and fonts, and enforces Trusted
  Types: nothing in the app assigns HTML strings (the DOM is built with `h()` and `s()`), and the one
  policy the CSP names only lets `sw.js` through, for the service worker.
- **Modern CSS**, used where it earns its place: cascade layers, `@property` for animatable custom
  properties, `color-mix()` palettes, container queries on the ticket, `:has()`, `@starting-style`
  for dialogs and toasts, `interpolate-size` for disclosures, scroll-driven animation on the app bar,
  view transitions between pages, and `linear()` springs.
- **Fonts** are self-hosted (Cormorant Garamond, Geist, Geist Mono and Michroma, all under the OFL),
  so the page makes no requests to other sites unless you connect TMDB or sync.

## The compatibility contract

The classic app's formats are the contract, and `js/compat/` is the only code that touches them:

- Browser saves under the same keys (`kuvert:v4`, `kuvert:list:<id>`, older `envelope:v1` migrated).
- Codes: `KU7.` + base64url JSON + FNV-1a checksum; KU4–KU7 and the original base-36 codes still read.
- Backup files `kuvert-progress.json`, versions 1–7, and the Gist sync file.

The rebuild still writes version 7. Its one addition is an optional `stamps` field (when each film
last changed), which lets sync merge film by film, so un-marking a film on one device sticks. The
classic app ignores the field; when it saves, sync falls back to the classic merge.

## Checks

```
npm ci
npm test            # unit: formats against fixtures recorded from the classic app, state, sync
npm run test:e2e    # browser: the evening end to end, both apps reading each other, offline
npm run check       # all of the above, plus the service worker stamp
npm run serve       # http://127.0.0.1:8123/ (classic) and /next/ (this)
```

`tests/fixtures/golden.json` is recorded by driving the classic app in a browser
(`npm run golden`). The unit tests hold the rebuild to it byte for byte. If the classic page changes
its films, run `npm run extract` (the drift test says so), then `npm run golden`.

After changing any file here, run `npm run stamp` so browsers pick up the new version. CI fails
when the stamp is stale.
