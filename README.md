# Kuvert

**Open the envelope and find tonight's film.** Kuvert is a random film picker for working through every
Best Picture winner and nominee, plus a few honorable mentions: 275 films, drawn one at a time.

**Use it at https://eforeagleowl.github.io/Kuvert/**. There is nothing to install, though you can add it
to your home screen, and it works offline after your first visit.

## What it does

- **The draw.** Break the seal, watch the year dial roll, and pull out tonight's ticket. Series play in
  order, and you can set one film aside for later.
- **Tonight's filters.** Draw only films that fit the time you have, suit a mood, are on your streaming
  services, or are discs on your shelf.
- **The station.** A split-flap departure board makes the same draw: the board flips, a chime rings, and
  your ticket prints and gets stamped.
- **Your watchthrough.** Mark films watched, rate them, say whether the winner deserved it, and rank your
  favourites. The Library holds the whole list and a poster wall; Stats show your pace, streaks and
  milestones. The dala horse gets painted as you go.
- **Group night.** Add your friends' codes, and the draw only picks films none of you has seen.
- **Your own lists.** Import any film list, or bring your history in from Letterboxd.

## Your progress

Everything stays in your browser; there is no account. To keep it safe or move it between devices, you
can:

- save a backup file,
- copy a short progress code, or
- turn on sync through a private GitHub Gist.

Posters come from [TMDB](https://www.themoviedb.org/) and show for everyone. For runtimes, cast and
where to stream a film, connect your own free TMDB key in Settings.

The built-in list's posters are refreshed every month by the "Refresh posters" workflow
(`.github/workflows/posters.yml`), which needs a repository secret named `TMDB_TOKEN` holding a TMDB
API read access token. TMDB's terms allow keeping its data for six months, so Kuvert stops using posters
older than that.

## Running it yourself

The site is plain HTML, CSS and JavaScript modules with no build step. The checks need Node 20 or later:

```sh
npm ci
npm run serve    # http://127.0.0.1:8123/
npm run check    # service worker stamp, unit tests and browser tests
```

How it's built: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Every feature:
[docs/FEATURES.md](docs/FEATURES.md).

## Credits and licences

- Kuvert's code is released under the [MIT License](LICENSE).
- Type: Cormorant Garamond, Geist, Geist Mono and Michroma, under the SIL Open Font License
  ([assets/fonts/OFL.txt](assets/fonts/OFL.txt)).
- Icons: [Lucide](https://lucide.dev/), ISC License.
- This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.
  Streaming availability data by [JustWatch](https://www.justwatch.com/).
- Oscar® and Academy Award® are trademarks of the Academy of Motion Picture Arts and Sciences. Kuvert
  is a fan project and isn't affiliated with the Academy.
