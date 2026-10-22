# Kuvert

**Open the envelope and find tonight's film.** Kuvert is a random film picker for working through every
Best Picture winner and selected nominees, plus a few honorable mentions: 275 films, drawn one at a time.

**Use it at https://eforeagleowl.github.io/Kuvert/**. There is nothing to install, though you can add it
to your home screen, and it works offline after your first visit.

## What it does

- **The draw.** Break the seal, watch the year dial roll, and pull out tonight's ticket. Series play in
  order, and you can set one film aside for later.
- **Tonight's filters.** Draw only films that fit the time you have, suit a mood, are on your streaming
  services, or are discs on your shelf.
- **The station.** A split-flap departure board makes the same draw: the board flips, a chime rings, and
  your ticket prints and gets stamped. Switch to *Ankomster* (arrivals) to see the films you've watched
  lately, with your stars on the flaps. Galan leaves from Union Station, Los Angeles, in Art Deco black
  and gold, and SEAGAL from Dark Territory, a rail depot with a green terminal and a radio dispatcher.
- **Your watchthrough.** Mark films watched, rate them, say whether the winner deserved it, and rank your
  favorites. The Library holds the whole list and a poster wall; Stats show your pace, streaks and
  milestones. The dala horse gets painted as you go.
- **Group night.** Add your friends' codes, and the draw only picks films none of you has seen.
- **Your own lists.** Import any film list, or bring your history in from Letterboxd.
- **Envelopes.** Small curated collections (seven nights of noir, a Swedish winter, first steps into
  silent cinema, a Hitchcock week), each with its own progress, context cards and a printable keepsake
  when it's done.
- **Sealed invitations.** Send a friend tonight's film as a link or QR code; they break the seal to see it.
- **Cinema passport.** A printable journal of the films you've watched, for all time or one year.
- **Film club.** Friends agree on a film together and reveal their stars at the same moment. It needs
  the small Kuvert service in `server/` running somewhere. It's ready for Railway
  ([step by step](docs/HOSTING.md#railway-step-by-step)); until it runs, the club stays out of sight on GitHub Pages.
- **Galan.** For the completists: every film ever nominated for Best Picture, all 98 ceremonies, 621
  films and no honorable mentions. Switch it on from "for the completists." in About. The regular list
  of 275 stays as it is, and films watched in one count in the other.
- **På svenska.** Switch the whole app to Swedish under Settings → Language. Films get their Swedish
  titles (*Gudfadern*, *Borta med vinden*), with the original in small type beneath.

## Your progress

Everything stays in your browser; there is no account. To keep it safe or move it between devices, you
can:

- save a backup file,
- copy a short progress code, or
- turn on sync through a private GitHub Gist.

Offline film facts now include source-linked runtimes and suggested moods for every core film. Posters, cast and current streaming offers come from [TMDB](https://www.themoviedb.org/). Connect a personal TMDB key in Settings, or let the optional Kuvert service supply them using its operator token. Sources and edition notes are documented in [EDITORIAL.md](docs/EDITORIAL.md).

The built-in list can also carry posters of its own, so visitors see them without a key. They're off
until a repository secret named `TMDB_TOKEN` holds a TMDB API read access token. From then on, the
"Refresh posters" workflow (`.github/workflows/posters.yml`) fetches them every month. TMDB's terms
allow keeping its data for six months, so Kuvert stops using posters older than that.

## Running it yourself

The site is plain HTML, CSS and JavaScript modules with no build step. The checks need Node 20 or later:

```sh
npm ci
npm run serve    # static-only, http://127.0.0.1:8123/
# or: npm run serve:club   # same site plus private club API
npm run check    # service worker stamp, unit tests and browser tests
```

How it's built: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Every feature:
[docs/FEATURES.md](docs/FEATURES.md).

## Credits and licenses

- Kuvert's code is released under the [MIT License](LICENSE).
- Type: Cormorant Garamond, Geist, Geist Mono and Michroma, under the SIL Open Font License
  ([assets/fonts/OFL.txt](assets/fonts/OFL.txt)).
- QR codes: qrcode-generator 2.0.4 by Kazuhiko Arase, MIT ([license](js/vendor/QRCODE-LICENSE.txt)).
- Offline structured film facts: Wikidata (CC0), plus linked presentation sources.
- Swedish film titles: Wikidata (CC0), checked against [Swedish Wikipedia](https://sv.wikipedia.org/).
- Icons: [Lucide](https://lucide.dev/), ISC License.
- This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.
  Streaming availability data by [JustWatch](https://www.justwatch.com/).
- Oscar® and Academy Award® are trademarks of the Academy of Motion Picture Arts and Sciences. Kuvert
  is a fan project and isn't affiliated with the Academy.
