# How Kuvert is built

Kuvert was rebuilt from the ground up: every feature of the original (listed in
[FEATURES.md](FEATURES.md)), the same saves, codes and backup files, and a new interface. It lives at
the site root. The original, Kuvert Classic, has retired: `/classic/` and the rebuild's first home,
`/next/`, forward to the root, and the progress Classic saved in a browser opens in Kuvert as it is.

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
- **The station**, Kuvert C, draws on a split-flap departure board and prints the ticket. Its
  *Ankomster* board lists the films watched lately, newest first, with their stars on the flaps.
- **Svenska.** Settings → Language turns the whole app Swedish: every page, dialog, message, date and
  number, the station's boards and the announcer's voice.
- **SEAGAL** mode is still behind "for the brave." in About, with its terminal skin, case files,
  clearance screen and the two tries it takes to stand down.

## How it's built

No build step and no dependencies at runtime: plain ES modules and CSS served as they are.

```
index.html        the page: every screen's markup, the icon sprite and a strict CSP
css/              tokens → base → components → tonight → pages → station → seagal, as @layer
js/compat/        the save formats, frozen: the same as Kuvert Classic's, byte for byte
js/data/          the built-in list (edit it in catalogue.js) and imported lists
js/state/         one Store (an EventTarget) and pure rules: draw, stats, dates, merge
js/storage/       backup files (File System Access or download) and GitHub Gist sync
js/tmdb/          posters, runtimes and streaming from TMDB (optional)
js/views/         Tonight (stage, nixie, evening), the station, Library, Stats, Settings, rails
js/station/       the station's timetable, split-flap board and sounds
js/i18n/          Swedish mode: t() and the Swedish dictionary (sv.js), keyed by the English text
js/ui/            DOM helpers, toast, dialogs, stars, sounds, the horse
js/share/         ticket and ranking images, drawn on a canvas
js/fun/           SEAGAL
sw.js             offline: precaches every file under a version stamped from their contents
404.html          the page for addresses that don't exist (GitHub Pages serves it at any depth)
classic/, next/   old addresses: each forwards to the root and removes its old worker
tests/classic/    Kuvert Classic itself, kept for the tests only (never published: see _config.yml)
```

- **One state object.** Every change goes through `Store`, which saves, emits `change`, and hands
  back an undo snapshot. Views re-render from it on the next frame.
- **Security.** The CSP allows only this site's own scripts, styles and fonts, and enforces Trusted
  Types: nothing in the app assigns HTML strings (the DOM is built with `h()` and `s()`), and the one
  policy the CSP names only lets `sw.js` through, for the service worker.
- **Two languages.** English is the source: code passes its words through `t()`, and
  `translatePage()` swaps the page's text and labels once at start. Switching language reloads the
  page. `tests/unit/i18n.test.mjs` fails when any string in the page or code lacks a Swedish entry
  (`node tools/i18n-keys.mjs` lists them). SEAGAL stays in English.
- **Modern CSS**, used where it earns its place: cascade layers, `@property` for animatable custom
  properties, `color-mix()` palettes, container queries on the ticket, `:has()`, `@starting-style`
  for dialogs and toasts, `interpolate-size` for disclosures, scroll-driven animation on the app bar,
  view transitions between pages, and `linear()` springs.
- **Fonts** are self-hosted (Cormorant Garamond, Geist, Geist Mono and Michroma, all under the OFL),
  so the page makes no requests to other sites unless you connect TMDB or sync.

## The compatibility contract

Kuvert Classic's formats are the contract, and `js/compat/` is the only code that touches them:

- Browser saves under the same keys (`kuvert:v4`, `kuvert:list:<id>`, older `envelope:v1` migrated).
- Codes: `KU7.` + base64url JSON + FNV-1a checksum; KU4–KU7 and the original base-36 codes still read.
- Backup files `kuvert-progress.json`, versions 1–7, and the Gist sync file.

The rebuild still writes version 7. Its one addition is an optional `stamps` field (when each film
last changed), which lets sync merge film by film, so un-marking a film on one device sticks. Kuvert
Classic ignored the field; a save without it falls back to Classic's merge.

## Keeping progress safe

Progress lives in one browser, which can lose it. So Kuvert asks the browser to keep its data,
offers a one-tap copy (the share sheet on phones, a kept-up-to-date file where the browser allows it,
a download elsewhere), and reminds you on Tonight when there's no recent copy. A save that can't be
read is kept aside under `kuvert:unreadable:<key>` and never written over: no saves, file writes or
sync until you restore something or choose to start fresh. Keys that only this app writes
(`kuvert:safekeeping`, `kuvert:unreadable:*`, `kuvert:station:*`, …) are listed in `js/compat/keys.js`;
Kuvert Classic never read them.

## Checks

```
npm ci
npm test            # unit: formats against fixtures recorded from Kuvert Classic, state, sync
npm run test:e2e    # browser: the evening end to end, Classic's saves and codes, offline, moves
npm run check       # all of the above, plus the service worker stamp
npm run serve       # http://127.0.0.1:8123/
```

`tests/fixtures/golden.json` was recorded by driving Kuvert Classic (`tests/classic/`) in a browser
(`npm run golden`). The unit tests hold Kuvert to it byte for byte. The browser tests put Classic back
at `/classic/` on their own server, to check Kuvert still reads what it wrote.

The site's own address appears in a few places: the link-preview tags and canonical link in
`index.html`. The 404 page works it out for itself. Change them if the site moves.

After changing any file of the app, run `npm run stamp` so browsers pick up the new version. CI fails
when the stamp is stale.
