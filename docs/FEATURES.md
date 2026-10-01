# Kuvert feature inventory

Everything the current app (`/index.html`, version 3.0, built 25 Sep 2026) does, read from its source.
The rebuild keeps every line of this list. Items marked **changed** behave better on purpose;
nothing is dropped.

## Lists and catalogue

- Built-in list: 250 films (98 winners, 137 nominees, 15 honorable mentions), permanent ids like
  `1972-the-godfather`, ceremony number `c` for winners and nominees, series `tri`/`ord`
  (The Godfather, The Lord of the Rings, Dune).
- Catalogue name `kuvert-2026-10-v9`; older names `kuvert-2026-09-expanded-v8`…v3, `kuvert-2026-09-hm-v2`,
  `kuvert-2026-09-v1` are accepted on restore.
- Retired films (`2011-hugo`, `2015-the-martian`, `2018-bohemian-rhapsody`, `2012-silver-linings-playbook`,
  `1943-for-whom-the-bell-tolls`, `2017-darkest-hour`) are quietly dropped from older saves.
- Award shelves W / N / H with chip, label and plural; lists without shelves hide chips, filters and shelf stats.
- Custom lists: import CSV or JSON (title, year, shelf, series, part; Letterboxd list exports with preamble),
  up to 2,000 films, name, subtitle and palette. Each list keeps its own progress under `kuvert:list:<id>`.
  Switch lists, export the current list as JSON, delete a custom list.
- Palettes: Kuvert blue, Skog green, Vinter violet, Falu red, Natt black. The dala horse silhouette stays.
- Ticket numbers follow year order (year, part, title), padded to three digits: `089 / 250`.
- Best Picture field sizes per ceremony (1st–98th) for the Oscar line.

## Tonight

- Masthead with the list name and the dala horse; subtitle from the list.
- Envelope with wax seal (three crowns), flap, pocket, "KUVERT FILMKVÄLL" edition mark and "BIO" postmark.
- Draw: "Öppna kuvertet". Series count as one ticket and play in order (the first unwatched part is drawn).
  Set-aside films are out of the draw. Draw again never repeats the film on the ticket when another is eligible.
  "This is the only eligible ticket" when nothing else qualifies. Finale when every film is watched.
- Opening animation: seal breaks, flap lifts, ticket slides out. The horse nods at every draw.
- Ticket: "Kuvert · Biobiljett" header, ticket number, weekly streak punch holes (up to 8, then +n),
  eyebrow "Kvällens film" / "Kvällens vinnare" / "Nästa del" / "Sedd", title, year and shelf,
  Oscar line ("Beat Taxi Driver, All the President's Men and 2 more at the 49th Academy Awards." /
  "Lost to Rocky at …"), poster well with the horse as placeholder, loading skeleton.
- TMDB details on the ticket: certification, runtime, top genres, "planera en fika" for 160+ minutes,
  tagline, director and cast, budget and box office, streaming offers for the country with a TMDB link,
  Letterboxd link, poster and backdrop with a lightbox, match choices when the search is ambiguous,
  Change movie match, Retry details, Edit mood tags.
- Finish estimate ("Start now · finishes around 10:27 PM", "past your finish time"); intermission line for
  3+ hour films ("Paus … Time for a fika").
- Series note: "The Lord of the Rings counts as one ticket and plays in order. Part 2 of 3."
- Albums (`kind: "album"`) skip TMDB and read "Album · 2004 · Listen start to finish".
- Actions: Mark as watched, Draw again, Set aside (one at a time), Share (image), Letterboxd, Close.
- "I own this on disc" shelf toggle.
- Watched stub after marking: SEDD stamp lands, "Hur var den?" star slider (half stars, drag, keys 1–5,
  arrows, Home/End, Delete), rating word in Swedish ("Mästerverk!"), gold seal for five stars,
  "Use your Letterboxd ★★★★" shortcut, watch date with Change date, rank line with Add to ranking /
  See ranking, "Deserved Best Picture?" verdict with "Should have won" picker, note preview,
  Add/Edit note, Share, Done / "Next: <part 2>" / "See your final ticket".
- Milestone ink stamp on the ticket when one is earned, and a gallop across the screen.
- Resume: "Your saved ticket · Continue with …", Put it back. A ticket drawn on an earlier evening asks
  "Drawn yesterday · still on for tonight?" with Keep it for tonight / Put it back.
- Evenings end at 04:00: a film finished after midnight belongs to the evening it started.
- Set-aside reminder with a button to open that film.
- Draw preferences (Adjust): time (any, 2 hours or less, over 2 hours, finish by a clock time that rolls to
  tomorrow and never silently rolls forward once passed), mood (8 moods), "What I can watch tonight"
  (selected streaming services in the country, discs on the shelf always count). Active choices show as
  removable chips; "Any mood · Any length · All services" when none.
- Eligible count ("12 eligible tickets · tonight's filters apply"), missing-details helper with
  "Check missing movie details" (3 workers, stops after 3 failures), messages for expired or missing
  finish times, no services, films without mood tags.
- Deadlines and availability re-checked every 30 s and on returning to the app.
- Sleepy horse after midnight and "Dags att sova? Time for bed? One more is fine too."
- Keyboard: Enter draws (or finishes the stub), W marks watched, 1–5 rates the stub, / searches,
  Escape leaves a field or closes the toast.
- Finale ticket "Hela samlingen." with 250 FILMER SEDDA seal, first and last recorded watch,
  total running time when every film has a runtime, confetti (tickets, crowns, dots), "See your watchthrough".
- Welcome card on first visit: Start with this list, Bring my own list, Add posters & streaming,
  Connect sync or load a backup.

## Library ("The collection")

- Tabs: Unseen, All, Shelf (n), Skipped (n), Recent, Missing runtimes (n, only while open);
  award shelf filters Won / Nom / HM.
- Forgiving search: accents, punctuation, roman numerals, initials ("lotr", "lotr2", "et"), run-together
  words, years ("zola 1937").
- Decade coverage buttons (filter by decade), "98 winners, 137 nominees and 15 honorable mentions still to watch."
- "Use these filters for tonight's draw", Back to tonight.
- Rows: watched toggle, poster thumbnail when TMDB is connected (lazy, two at a time, stops after three
  failures), title opens the film, shelf chip, year.
- Shelf view: search offers "Add to shelf"; Remove. Skipped / Recent / Missing views with hints and Open.
- Watched films archive: poster wall sortable by Recent, Rank, Stars, Year with rank badges, posters
  fetched while open (two workers), Retry missing posters; list with unwatch toggle, date button,
  note / rating button.
- Empty states with the horse and a next step.

## Stats ("Your watchthrough")

- Headline sentence: pace ("27 films in 12 weeks, about 2 a week"), finish estimate month.
- Reel: one mark per film in year order, watched and tonight's ticket highlighted.
- Facts: Watched, Watch time, Average length, Your average stars.
- Jump bar: Ranking, Verdicts, Watch days, Milestones, Award shelves, Decades.
- Ranking ("Min topplista"): drag with pointer, up / down / remove buttons, add from "Not ranked yet"
  (placed after films rated the same or higher), Start from my stars, Copy for group chat (clipboard with
  a selectable fallback), Share as image.
- Verdicts on watched winners: Yes / Unsure / No, "Should have won", summary line.
- Watch days: 26-week (17 on phones) Monday-first heat strip with month labels, tap a day with one film to
  open it; evening facts: longest run, favourite night, busiest week.
- Milestones: 1, 25, 50, 100 and the whole list; Across the decades; Winner's circle; Beyond the ballot;
  one per series. Stamps with ERA / HM / SERIE words.
- By award shelf (bars with average stars) and by decade (table with averages).
- "Open your final ticket" once complete.

## Settings

- Your data: GitHub Gist sync (token field, how-to, Sync now, Turn off sync, status line, auto sync 4 s after
  changes, on return to the app and when back online), progress file (Back up progress with the File System
  Access API and auto-save to that file, download fallback, Load progress, Reconnect to the remembered
  file), backup status line, Recovery & reset (progress code, Copy code, Restore from a code, Clear all
  progress with confirmation and undo).
- Restore preview dialog: counts, Merge or Replace, undo; older codes ask which catalogue made them;
  a backup for another list offers to switch (and installs the list if it came with one).
- Movie details: TMDB credential (bearer token or v3 key), Disconnect, load details for every film
  (3 workers, stop, refresh), show films missing a runtime, streaming country (full TMDB region list),
  My streaming services (searchable checklist per country, refresh), Refresh movie availability,
  JustWatch credit. Availability cached 24 h, provider list 7 days.
- Lists & imports: list picker, Import, Export, Delete; Letterboxd import (ZIP or CSVs, preview with
  fill / replace ratings and dates and remember ratings for films not drawn yet, unmatched list).
- Sound: paper sounds (seal crack, tear, stamp, gold seal ping, wooden knock), off by default.
- About: version, type, Lucide icons credit, TMDB logo and credit, JustWatch, Academy trademark note,
  "for the brave." door.

## Everywhere

- App bar: horse + name (back to Tonight), tally with a Swedish cheer ("Förseglat", "Bra start",
  "På god väg", "Över halvvägs", "Nästan där", "Klart!"), tabs, progress line. Bottom tabs in the
  installed app.
- Toast with Undo (every change can be undone once), optional action, swipe to dismiss, pauses on hover.
- Save state line: "Saved in this browser · 12 watched", "Saving to kuvert-progress.json", warnings.
- Leaving with unsaved changes asks first.
- Wide screens: recently watched stubs on the left, decade bars on the right, kurbits flowers down both
  margins that get painted as you progress.
- The painted dala horse: bare wood, red coat (first film), harness (25%), saddle (50%), saddle flowers
  (75%), gold details (100%), "Nymålad!" when a coat lands. Tap: knock, hop and a word ("Hej!", "Fika?",
  "En film till?", "Gnägg!", "Popcorn?", "Tjena!"); five taps in two seconds: it runs off and trots back
  ("Tillbaka!"). Four stars or more: hop ("Ja!", "Bravo!"); one or less: droop ("Usch…").
- Offline service worker, install as an app.

## SEAGAL mode

- "for the brave." switches it on (clearance boot screen), installs the Steven Seagal filmography list
  (54 films and one album) with the Natt palette, and switches to it. "Stand down" is denied the first time.
- Green-phosphor terminal skin: Michroma small caps, scanlines, vignette, blinking cursor, red accent,
  a case file folder instead of the envelope, "TOP SECRET // EYES ONLY", case number or working title,
  Russian flag sticker, reticle instead of the horse, title un-redacts.
- Words rewritten throughout (Mission, Dossier, Debrief, Loadout, Deploy, Neutralized, Cowardice…).
- Set aside takes three tries ("You cannot go back now.", "We have been over this."), redeploying three
  times calls in the body double, Konami code: "Aikido engaged", every deployment jolts the screen.
- Case stamps ("Direct to video // Priority low", "Seated combat certified"), a cassette deck for the album,
  ponytail-hours and cowardice record in Debrief, four extra commendations
  (Half Past Dead, Driven to Kill, Out for Justice, Hard to Kill).

## Data kept (the compatibility contract)

See `js/compat/` for the exact rules. Storage keys, backup and code formats, catalogue names, retired ids
and Gist file names are frozen.
