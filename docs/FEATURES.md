# Kuvert feature inventory

Everything the current app (`/index.html`, version 3.0, built 25 Sep 2026) does, read from its source.
The rebuild keeps every line of this list. Items marked **changed** behave better on purpose;
nothing is dropped.

For the additions in version 5, see the README and [ARCHITECTURE.md](ARCHITECTURE.md). The original feature inventory below remains the compatibility baseline.

## Lists and catalog

- Built-in list: 275 films (98 winners, 155 nominees, 22 honorable mentions), permanent ids like
  `1972-the-godfather`, ceremony number `c` for winners and nominees, series `tri`/`ord`
  (The Godfather, The Lord of the Rings, Dune).
- Catalog name `kuvert-2026-10-v9`; older names `kuvert-2026-09-expanded-v8`…v3, `kuvert-2026-09-hm-v2`,
  `kuvert-2026-09-v1` are accepted on restore.
- Retired films (`2011-hugo`, `2015-the-martian`, `2018-bohemian-rhapsody`, `2012-silver-linings-playbook`,
  `1943-for-whom-the-bell-tolls`, `2017-darkest-hour`) are quietly dropped from older saves.
- Award shelves W / N / H with chip, label and plural; lists without shelves hide chips, filters and shelf stats.
- Custom lists: import CSV or JSON (title, year, shelf, series, part; Letterboxd list exports with preamble),
  up to 2,000 films, name, subtitle and palette. Each list keeps its own progress under `kuvert:list:<id>`.
  Switch lists, export the current list as JSON, delete a custom list.
- Palettes: Kuvert blue, Skog green, Vinter violet, Falu red, Natt black. The dala horse silhouette stays.
- Ticket numbers follow year order (year, part, title), padded to three digits: `089 / 275`.
- Best Picture field sizes per ceremony (1st–98th) for the Oscar line.

## Tonight

- Masthead with the list name and the dala horse; subtitle from the list.
- Envelope with wax seal (three crowns), flap, pocket, "KUVERT FILMKVÄLL" edition mark and "BIO" postmark.
  It collects a mark for each of these milestones once earned: the first ticket (the wavy lines of a
  cancellation), 25 films (a registered-mail label), 50 (an airmail label), 100 (an express stamp) and
  ten winners (a gold seal). The marks step aside while a ticket is out.
- The poster lights the room: while a ticket is out, two colours taken from its poster glow from the
  corners of the screen and along the ticket's sides (a black-and-white poster gives silver). The light
  is held to a brightness that leaves the page's words as readable as before. No poster, no light.
- Draw: "Öppna kuvertet". Series count as one ticket and play in order (the first unwatched part is drawn).
  Set-aside films are out of the draw. Draw again never repeats the film on the ticket when another is eligible.
  "This is the only eligible ticket" when nothing else qualifies. Finale when every film is watched.
- Opening animation: seal breaks, flap lifts, ticket slides out. The horse nods at every draw.
- Every ticket is engraved for its film: a band of woven lines under its head and a rosette in the paper,
  drawn from the film's id, so no two films share one. The paper is the film's decade's stock (cream
  thirties, salmon forties, mint fifties, sky sixties, mustard seventies, pink eighties, aqua nineties,
  silver 2000s, lavender 2010s, pistachio 2020s), with the band in the decade's colour; a winner's is brass.
- The pictures to share (`js/share/images.js`) carry the same look. The ticket image is printed on the
  film's decade's paper with its band and rosette, in the light of its poster (one colour from the upper
  left, one from the lower right). The ranking image shows the first three as stamps from the album,
  perforated, with the poster, the place on a brass tab, the stars as the stamp's value and the watch day
  as a postmark, and lists the rest; the film-year image shows the year's best five the same way. A stamp
  needs at least one poster to be had: with none, both images are the plain lists. SEAGAL's stay plain.
- Ticket: "Kuvert · Biobiljett" header, ticket number, weekly streak punch holes (up to 8) with what they
  count in words ("26 weeks in a row"),
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
- Finale ticket "Hela samlingen." with 275 FILMER SEDDA seal, first and last recorded watch,
  total running time when every film has a runtime, confetti (tickets, crowns, dots), "See your watchthrough".
- First visit: the envelope and its button come first. Beneath them, until the first draw: a few words on
  what Kuvert is, with I've seen some already, Bring my own list, and Connect sync or load a backup.
- On Tonight the masthead carries the name, so the app bar there shows the tally only.
- After a draw the ticket comes up under the app bar as far as it takes to show its buttons. On a phone
  the poster takes a good third of the ticket; the order is title, one line of facts (year, shelf,
  running time, director), the premise, then the award line.

## Library ("The collection")

- Tabs: Unseen, All, Shelf (n), Skipped (n), Recent, Missing runtimes (n, only while open);
  award shelf filters Won / Nom / HM.
- Forgiving search: accents, punctuation, roman numerals, initials ("lotr", "lotr2", "et"), run-together
  words, years ("zola 1937").
- Decade coverage buttons (filter by decade), "98 winners, 155 nominees and 22 honorable mentions still to watch."
- List or Posters (remembered): the same films as rows or as a grid of posters, where the poster opens
  the film and the ring in its corner ticks it off. Wide screens add the director and the running time
  to each row. A film found by what it's about shows its premise under the title.
- "Use these filters for tonight's draw" shows once a filter narrows the list (or while it is on).
- "Use these filters for tonight's draw", Back to tonight.
- Rows: watched toggle, poster thumbnail when TMDB is connected (lazy, two at a time, stops after three
  failures), title opens the film, shelf chip, year.
- Shelf view: search offers "Add to shelf"; Remove. Skipped / Recent / Missing views with hints and Open.
- The watched wall is a stamp album: each film a perforated stamp with its poster, your stars as the
  value printed on it ("4½"), and the day you watched it struck across a corner as a postmark. A film
  with no date has no postmark.
- Watched films archive: poster wall sortable by Recent, Rank, Stars, Year with rank badges, posters
  fetched while open (two workers), Retry missing posters; list with unwatch toggle, date button,
  note / rating button.
- Empty states with a small drawing and a next step: a magnifier over a search that finds nothing, a coffee
  cup when everything that matches is watched, a cinema seat where the watched films will be, and a
  ticket, a disc, a projector or an hourglass for the side lists.

## Stats ("Your watchthrough")

- Headline sentence: pace ("27 films in 12 weeks, about 2 a week"), finish estimate month.
- Reel: one mark per film in year order, watched and tonight's ticket highlighted.
- A kurbits garland (Dalarna folk painting) under the heading: eleven flowers, each painted in four steps
  (stem, leaves, petals, heart) as you watch. On screens wide enough for flowers down the margins, those
  carry the painting instead.
- Facts: Watched, Watch time, Average length, Your average stars.
- Jump bar: Ranking, Verdicts, Watch days, Milestones, Award shelves, Decades.
- Ranking ("Min topplista"): the top ten, with "Show all n" for the rest (a film moved below the ten
  opens the list). On a phone's touch screen the arrows step aside for the title and stay available to a
  screen reader and a keyboard. Drag with pointer, up / down / remove buttons, add from "Not ranked yet"
  (placed after films rated the same or higher), Start from my stars, Copy for group chat (clipboard with
  a selectable fallback), Share as image.
- Verdicts on watched winners: Yes / Unsure / No, "Should have won", summary line. Three at a time, the
  ones still to judge first, with "Show all n". Each winner is a ballot slip ("Valsedel"): paper, a printed
  head with the prize and the year, and three boxes to cross. The boxes are the same three buttons; the
  one chosen gets a cross in blue ink, and "Should have won" is the line to write a name on.
- Watch days: 26-week (17 on phones) Monday-first heat strip with month labels, tap a day with one film to
  open it; evening facts: longest run, favorite night, busiest week.
- The weekly streak as a klippkort (a punch card): ten numbered rings to a card, a hole punched for each
  week in a row with a film, the card's number once a streak fills more than one, and the next ring marked
  while this week is still open. Under the holes, in words: "12 weeks in a row", and whether this week is
  punched.
- Milestones: 1, 25, 50, 100 and the whole list; Across the decades; Winner's circle; Beyond the ballot;
  one per series. In each stamp, a small drawing (a ticket, an envelope, an hourglass, a trophy, a rosette,
  a clapperboard) or, for 25, 50 and 100, the number.
- By award shelf (bars with average stars) and by decade (table with averages). Under each decade's
  numbers, its strip of film: a frame per film in year order, lit once the film is watched, with the
  film's name on the frame for whoever points at it. The decade with the most films spans the column and
  the others are as long as their films make them. A list with more than 48 films in a decade puts
  several films in a frame.
- The small drawings (twelve, in index.html) are all in one hand: one pen, one weight, with one detail
  picked out in brass.
- "Open your final ticket" once complete.

## Settings

- Your data: GitHub Gist sync (token field, how-to, Sync now, Turn off sync, status line, auto sync 4 s after
  changes, on return to the app and when back online), progress file (Back up progress with the File System
  Access API and auto-save to that file, download fallback, Load progress, Reconnect to the remembered
  file), backup status line, Recovery & reset (progress code, Copy code, Restore from a code, Clear all
  progress with confirmation and undo).
- Restore preview dialog: counts, Merge or Replace, undo; older codes ask which catalog made them;
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

- App bar: horse + name (back to Tonight; not shown on Tonight itself), tally with a Swedish cheer ("Förseglat", "Bra start",
  "På god väg", "Över halvvägs", "Nästan där", "Klart!"), tabs, progress line. Bottom tabs in the
  installed app. On a phone the cheer steps aside when the name and the count need the room: the name is
  only cut short when it is an envelope's name too long for the screen.
- Toast with Undo (every change can be undone once), optional action, swipe to dismiss, pauses on hover.
- Save state line: "Saved in this browser · 12 watched", "Saving to kuvert-progress.json", warnings.
- Leaving with unsaved changes asks first.
- Wide screens: recently watched stubs on the left, decade bars on the right, kurbits flowers down both
  margins that get painted as you progress.
- The painted dala horse: bare wood, red coat (first film), harness (25%), saddle (50%), saddle flowers
  (75%), gold details (100%), "Nymålad!" when a coat lands. Tap: knock, hop and a word ("Hej!", "Fika?",
  "En film till?", "Gnägg!", "Popcorn?", "Tjena!"); five taps in two seconds: it runs off and trots back
  ("Tillbaka!"). Four stars or more: hop ("Ja!", "Bravo!"); one or less: droop ("Usch…"). What it says
  shows in a bubble over its head, in front of the top bar and all of it on the screen; the answer to a
  tap is read out to a screen reader too.
- The horse keeps the Swedish calendar, and dresses for nine occasions in it (`js/state/calendar.js`, drawn
  in `js/ui/outfits.js`):

  | When | What it wears | What it says |
  |---|---|---|
  | Easter, Maundy Thursday to Easter Monday | An Easter witch's kerchief, and a rosy cheek | "Glad påsk!" |
  | Valborg, 30 April | A student's cap | "Glad Valborg!" |
  | The National Day, 6 June | The flag, on a pole | "Glad nationaldag!" |
  | Midsummer Eve and Midsummer Day | A crown of flowers | "Glad midsommar!" |
  | The crayfish season, 7 to 31 August | A paper hat with a crayfish on it | "Skål!" |
  | Cinnamon bun day, 4 October | A cinnamon bun | "Kanelbulle?" |
  | Saint Bridget's day, 7 October | The Bridgettine crown, over a veil | "Grattis, Birgitta!" |
  | Lucia, 13 December | A crown of candles | "Glad Lucia!" |
  | Christmas Eve to the day after Christmas | A tomte's cap | "God jul!" |

  Every horse on the page wears it (masthead, bar, station), its tooltip says so, and the first pat of the
  day gets the day's greeting. Easter and Midsummer are worked out for the year. A day lasts until 04:00,
  as everywhere in Kuvert. SEAGAL has no horse, so none of this.
- Offline service worker, install as an app. New versions arrive in the background: an untouched page
  restarts on the new one, a page in use offers Reload. About shows the release a device is running, and
  links to the issue page for reports.
- Group night (Tonight, Adjust): friends' friend codes (KF1, one bit per film of the list, under 64
  characters, copied from the "You" row), progress codes and backup files; the draw leaves out every
  film anyone has seen.

## SEAGAL mode

- "for the brave." switches it on (clearance boot screen), installs the Steven Seagal filmography list
  (54 films and one album) with the Natt palette, and switches to it. "Stand down" is denied the first time.
- Green-phosphor terminal skin: Michroma small caps, scanlines, vignette, blinking cursor, red accent,
  a case file folder instead of the envelope, "TOP SECRET // EYES ONLY", case number or working title,
  Russian flag sticker, reticle instead of the horse, title un-redacts. Stats keeps its plain verdict
  buttons, decade table and lettered stamps, with no klippkort, film strips or small drawings.
- Words rewritten throughout (Mission, Dossier, Debrief, Loadout, Deploy, Neutralized, Cowardice…).
- Set aside takes three tries ("You cannot go back now.", "We have been over this."), redeploying three
  times calls in the body double, Konami code: "Aikido engaged", every deployment jolts the screen.
- Case stamps ("Direct to video // Priority low", "Seated combat certified"), a cassette deck for the album,
  ponytail-hours and cowardice record in Debrief, four extra commendations
  (Half Past Dead, Driven to Kill, Out for Justice, Hard to Kill).

## Data kept (the compatibility contract)

See `js/compat/` for the exact rules. Storage keys, backup and code formats, catalog names, retired ids
and Gist file names are frozen.
