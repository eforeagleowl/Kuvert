# Kuvert editorial review

Prepared 13 October 2026; film table and ballot-film facts added 11 November 2026; premise lines, the British Academy's winners and the Christmas envelope added 13 November 2026. The collection introductions, context cards and questions are original Kuvert drafts for review in English and Swedish. Film titles, directors and durations are source-linked facts. Mood tags are editorial suggestions, not content ratings.

## Coverage

- The film table (`js/data/films.js`): every film Kuvert ships, once. 684 films, each with its Wikidata item and TMDB entry; every one has a source-linked runtime, a director and mood suggestions.
- Premise lines (`js/data/premises-en.js`, `premises-sv.js`): one line on what each of the 684 films is about, in English and in Swedish, written for Kuvert (below).
- Main Kuvert catalog: 275 films; source-linked offline runtime and mood suggestions for all 275.
- Curated envelopes: 5 finite collections of 7, 6, 6, 7 and 7 films, 33 different films in all.
- Curated film cards: all 33 have a director, a named presentation duration, a spoiler-safe introduction and two discussion questions in both languages. Discussion questions are intended to appear after a film is watched.
- Academy ballots: all 98 complete official Best Picture fields, containing 621 nominations including each winner. Together they make Galan, the extra mode switched on from "for the completists." in About. The main 275-film catalog remains a selection of nominees and honorable mentions. The 368 films that are only on a ballot have had their facts since 11 November 2026 (below).
- British Academy Film Awards: every winner of Best Film, 80 films over 79 ceremonies, as a list of its own (`js/data/bafta.js`, below). 63 of them were already Kuvert films; 17 are new.
- Posters: no artwork was invented or copied into these files. `js/data/posters.js` holds a TMDB entry and poster path for each of the 684 films, fetched on 13 November 2026 by `tools/posters.mjs`; the images themselves stay on TMDB's image server. Every entry is the one the film table names, and each was checked to be released within a year of Kuvert's year for the film, which is what tells a film from a remake of the same title.

## Source and edition policy

The initial general film facts come from Wikidata structured statements under [CC0](https://www.wikidata.org/wiki/Wikidata:Licensing). Identity was checked by title and release-year claims. A duration was accepted automatically only when the non-deprecated (or preferred) records agreed on one duration. These 237 core records are source-linked community-maintained facts; they should not be described as independently verified against a primary film print. References from the original statements are retained where present.

The remaining 38 core duration records were resolved through named BFI, film-institution, studio or distributor presentations. The curated films use source-linked presentations from Criterion, BFI, Janus Films, Kino Lorber, Festival de Cannes and Film at Lincoln Center; Songs from the Second Floor and the seven Hitchcock films cite their Wikidata durations. Differences between theatrical, extended, narrated, restored, regional and differently projected editions are real: durations must not be presented as universal for every copy. Kuvert leaves the source and edition note accessible and allows user/provider details to take precedence.

The first runtime snapshot contains 275 of 275 core films. Film facts need no personal API key.

The second snapshot, read on 11 November 2026, covers the 368 films that appear only on a ballot, under the same rule. Each film was matched to its Wikidata item by title and release year, first among the items Wikidata lists under the award, then by English label, then through the film's English Wikipedia page; every match was checked to be a film released within a year of Kuvert's year, and no two films share an item. For 344 films the non-deprecated duration statements agreed on one duration. For the other 24 they disagreed, usually by a few minutes: those use the running time in the film's English Wikipedia infobox, which most often cites the BBFC or the AFI catalog. Each of those records links the article, says which fields came from it, and carries the note that other editions may differ. Two films had no director statement and take the director from the same infobox. Directors are listed as Wikidata lists them, which can include uncredited ones. Like the first snapshot, these are source-linked community-maintained facts, not checks against a film print.

The third snapshot, read on 13 November 2026, adds the 17 British Academy winners that were on no Academy ballot, under the same rule. For 14 the duration statements agreed. Lacombe, Lucien and Jean de Florette had statements that disagreed, and La Ronde's Wikidata duration (110 minutes) is far from the 95 minutes of its English Wikipedia infobox: those three use the infobox's running time and say so. The Christmas envelope's seven films cite Wikidata for the edition they recommend, except It's a Wonderful Life, whose 131 minutes are the Wikipedia infobox's (Wikidata gives 125).

Every film's TMDB entry in the table is Wikidata's own statement (P4947). The poster job checks that the entry looks like the film before using its poster, and reports any that don't.

To add a film: `node tools/film-facts.mjs "Title" 1999` (or its Wikidata item) prints its line for the table under these rules, and says what a person has to settle. `npm run check:catalogue` then checks every list against the table.

General mood suggestions interpret source genres: comedy/satire suggests Funny; romance suggests Romantic; action/adventure/western/fantasy suggests Adventurous; thriller/crime/horror suggests Tense; horror/noir suggests Dark; epic suggests Epic; drama/biography/documentary or an otherwise unclassified title suggests Reflective. Ambiguous presentation records and curated films have manually selected tags. These are an editable starting point for choosing an evening, not a factual or exhaustive classification.

## Academy history

Every ballot links to the Academy's official record. Two pages are cited through the Academy's public embed view. Presentation dates for those two ceremonies additionally cite primary Academy historical documents. Category labels retain the historical wording (Outstanding Picture, Outstanding Production, Best Motion Picture, etc.). The first ceremony's separate Unique and Artistic Picture award is not silently combined with the Outstanding Picture field.

The Academy's page/edition label is not always the presentation calendar year: its 1931 page is the 3rd awards, held on 5 November 1930; its 1932 and 1933 pages correspond to presentations in 1931 and 1932. The data stores both the edition label and the actual date. Early eligibility windows span release years, and international films can compete after an earlier premiere. Existing permanent core film IDs are retained.

Validation checks each field against the known official nominee count, exactly one winner, all 98 ceremony numbers, and the existing core winner ID. It also checks provenance URLs, bilingual card completeness, collection sizes, series numbering and runtime coverage. Run `node tools/catalogue-check.mjs` and `node --test tests/unit/editorial.test.mjs`.

## The British Academy's Best Film

`js/data/bafta.js` lists every winner of the British Academy's Best Film, one row per ceremony: the 1st honoured the films of 1947, the 79th those of 2025. The 15th had two winners (Ballad of a Soldier and The Hustler), so 79 ceremonies make 80 films. Until the 21st ceremony the prize was called Best Film from any Source; Kuvert calls it Best Film throughout. The list holds winners only: the British Academy's nominees are not in Kuvert.

The rows were read from English Wikipedia's list of the award's winners on 13 November 2026 and each film matched to its Wikidata item; the British Academy's own awards database could not be reached from where this was prepared, so it has not been checked against it directly. Each winner's year in Kuvert is the film's own (its first release), which is why a ceremony's film is often a year or two older than the ceremony.

The list is an ordinary Kuvert list with its own award words (`js/data/awards.js`): "Won at the 36th British Academy Film Awards.", "Deserved Best Film?". Series are left out of it, since only two of the three Lord of the Rings films won. Validation checks that the ceremonies run from the 1st to the last with none missing, that every film is a winner and is in the film table, and that its year is near its ceremony's.

## Premise lines

Every film has one line on what it is about, shown on its ticket: `js/data/premises-en.js` and `js/data/premises-sv.js`, keyed by film id. They are original Kuvert text, written for this purpose in both languages (the Swedish lines are written, not machine translated), and are not copied from any synopsis. Each was written from knowledge of the film and, where that was thin, checked against the introduction of the film's English Wikipedia article.

The rules a line follows:

- Where the story starts, and nothing past that: the situation, the people and what sets things moving. No endings, no reveals, nothing a viewer would rather find out. Where a film's fame rests on a turn (Psycho, The Crying Game, The Sixth Sense), the line stops well before it.
- One sentence, or two short ones; at most 160 characters; no quotation marks and no dashes.
- Plain statement, present tense. No praise, no "classic", no cast names; a director or real person is named only when the film is about them.
- Facts in it (a year, an age, a place) are the film's own. For a film about real events, the line may say what history already has (Apollo 13, Selma).
- The two languages say the same thing in their own words.

`npm run check:catalogue` checks that every film in the table has a line in both languages, that no line is left over, and the length and punctuation rules. A new film needs its line before the check passes. `tests/unit/premises.test.mjs` also looks for the commonest tells of a line that says too much ("in the end", "turns out"); the rule itself is a person's to keep.

## Collections and card drafts

### Seven Nights of Noir / Sju nätter med film noir

ID: `curated-noir` · 7 films · palette: `natt` · seal: NOIR · 7

**English**

Rain on the window. Trouble in the envelope.

Put on the kettle and lower the lights. These seven films travel from the private eye's office to the newsroom, with a riverbank detour along the way. Watch in any order; notice who gets to tell the story, who holds the power, and where the shadows fall.

**Svenska**

Regn mot rutan. Trubbel i kuvertet.

Sätt på vattenkokaren och dämpa ljuset. Sju filmer tar oss från privatdetektivens kontor till tidningsredaktionen, med en avstickare längs floden. Se dem i valfri ordning och lägg märke till vem som berättar, vem som har makten och var skuggorna faller.

**Completion keepsake:** The Night Tram · seven journeys through the shadows / Nattspårvagnen · sju resor genom skuggorna

#### The Maltese Falcon (1941)

John Huston · 101 min · Tense, Dark

[Presentation source](https://bfidatadigipres.github.io/pdf/2021-09-17-maltese-falcon.pdf) · BFI's 101-minute release presentation; other editions may differ slightly.

**Before watching — English**

A private eye, a valuable object and a roomful of competing stories. Listen to the pauses as closely as the fast talk, and watch how Huston arranges people within a frame. A useful first stop for noir's uneasy relationship with trust.

**Före filmen — svenska**

En privatdetektiv, ett värdefullt föremål och ett rum fullt av motstridiga berättelser. Lyssna lika noga på pauserna som på det snabba pratet och se hur Huston placerar människor i bild. En första anhalt i film noirs sköra förhållande till tillit.

**After watching — English**

- Which character's account did you trust first, and why?
- How do rooms, doorways and the camera's position shape the balance of power?

**Efter filmen — svenska**

- Vems berättelse litade du först på, och varför?
- Hur påverkar rum, dörröppningar och kamerans placering maktbalansen?

#### Double Indemnity (1944)

Billy Wilder · 108 min · Tense, Dark

[Presentation source](https://www.criterion.com/films/30460-double-indemnity)

**Before watching — English**

An insurance office becomes an unlikely place for suspense. Wilder and co-writer Raymond Chandler turn professional language into temptation and suspicion. Notice the voice-over, the patterns of light and the difference between the story someone tells and the image we see.

**Före filmen — svenska**

Ett försäkringskontor blir en oväntad plats för spänning. Wilder och medförfattaren Raymond Chandler förvandlar yrkesspråk till lockelse och misstankar. Lägg märke till berättarrösten, ljusmönstren och skillnaden mellan berättelsen vi hör och bilden vi ser.

**After watching — English**

- What does knowing the narrator's perspective change about the suspense?
- Which ordinary object or workplace detail became unexpectedly unsettling?

**Efter filmen — svenska**

- Hur förändras spänningen när vi känner berättarens perspektiv?
- Vilket vardagsföremål eller vilken arbetsplatsdetalj blev oväntat obehaglig?

#### Detour (1945)

Edgar G. Ulmer · 69 min · Tense, Dark

[Presentation source](https://s3.amazonaws.com/criterion-production/janus_promo_packages/259-/Detour_press-notes_r2_original.pdf)

**Before watching — English**

A short road movie with a long shadow. Ulmer turns modest rooms, roadside stops and a troubled voice-over into a claustrophobic world. Treat the narration as a character's version of events, and see how much atmosphere can be made with very little.

**Före filmen — svenska**

En kort vägfilm med en lång skugga. Ulmer gör enkla rum, vägkrogar och en orolig berättarröst till en klaustrofobisk värld. Lyssna på berättelsen som en persons version av händelserna och se hur mycket stämning som kan skapas med små medel.

**After watching — English**

- When did you begin to question the narrator's account?
- How did the film's small scale influence its feeling of fate or confinement?

**Efter filmen — svenska**

- När började du ifrågasätta berättarens version?
- Hur påverkade filmens lilla format känslan av öde eller instängdhet?

#### The Third Man (1949)

Carol Reed · 104 min · Tense, Dark

[Presentation source](https://www.criterion.com/films/236-the-third-man)

**Before watching — English**

A visitor arrives in postwar Vienna with more confidence than understanding. Reed lets the city unsettle both visitor and audience through tilted compositions, echoing spaces and an unmistakable zither score. Watch how friendship competes with the obligation to look more closely.

**Före filmen — svenska**

En besökare kommer till efterkrigstidens Wien med större självförtroende än förståelse. Reed gör staden främmande med lutande bilder, ekande rum och ett omisskännligt cittrapartitur. Se hur vänskap ställs mot skyldigheten att granska det som finns framför oss.

**After watching — English**

- How does Vienna function as more than a backdrop?
- Where did the film ask you to separate loyalty from responsibility?

**Efter filmen — svenska**

- Hur fungerar Wien som mer än en bakgrund?
- När bad filmen dig att skilja lojalitet från ansvar?

#### In a Lonely Place (1950)

Nicholas Ray · 93 min · Dark, Reflective

[Presentation source](https://www.criterion.com/films/27908-in-a-lonely-place)

**Before watching — English**

Hollywood's storytelling machinery meets a fragile romance. Nicholas Ray keeps the mystery close to the emotions of two people learning what it means to trust. Pay attention to changes in tone: a charming conversation can acquire weight without the setting changing at all.

**Före filmen — svenska**

Hollywoods berättarmaskineri möter en skör kärleksrelation. Nicholas Ray låter mysteriet ligga nära känslorna hos två människor som försöker lita på varandra. Lägg märke till tonförskjutningarna: ett charmigt samtal kan bli tungt utan att platsen förändras.

**After watching — English**

- What distinguishes understanding someone from excusing their behavior?
- How did the film change your reading of its early romantic scenes?

**Efter filmen — svenska**

- Vad skiljer förståelse för en person från att ursäkta beteendet?
- Hur förändrade filmen din syn på de tidiga romantiska scenerna?

#### The Night of the Hunter (1955)

Charles Laughton · 93 min · Dark, Tense

[Presentation source](https://www.criterion.com/films/27525-the-night-of-the-hunter) · Criterion's 93-minute presentation.

**Before watching — English**

At noir's edge, a crime story becomes a frightening children's fable. Laughton's only film as director uses silhouettes, songs and dreamlike landscapes to make adult danger feel enormous. Follow the children's view of the world, and notice where the film allows tenderness to enter.

**Före filmen — svenska**

Vid film noirs utkant blir en kriminalhistoria en skrämmande barnsaga. Laughtons enda film som regissör använder silhuetter, sånger och drömlika landskap för att göra vuxenvärldens fara väldig. Följ barnens blick och se var ömheten får komma in.

**After watching — English**

- Which images felt closer to a fairy tale than a realistic crime film?
- How do song and silence change the way danger is presented?

**Efter filmen — svenska**

- Vilka bilder kändes mer som en saga än en realistisk kriminalfilm?
- Hur förändrar sång och tystnad sättet som fara skildras på?

#### Sweet Smell of Success (1957)

Alexander Mackendrick · 96 min · Dark, Tense

[Presentation source](https://www.bfi.org.uk/film/675c22ce-c8cb-5f23-baf9-157ed05fb948/sweet-smell-of-success)

**Before watching — English**

No detective is needed for this journey through New York's publicity business. Reputation is a currency, and every conversation has a price. Mackendrick's city glitters while its people negotiate; listen for the moments when an elegant sentence becomes a weapon.

**Före filmen — svenska**

Ingen detektiv behövs på den här resan genom New Yorks publicitetsbransch. Ryktet är en valuta och varje samtal har ett pris. Mackendricks stad glittrar medan människorna förhandlar; lyssna efter ögonblicken då en elegant mening blir ett vapen.

**After watching — English**

- Which exchange revealed the clearest difference between influence and authority?
- What made the film's city feel inviting, oppressive, or both?

**Efter filmen — svenska**

- Vilket samtal visade tydligast skillnaden mellan inflytande och auktoritet?
- Vad gjorde filmens stad lockande, kvävande eller både och?

### A Swedish Winter / En svensk vinter

ID: `curated-swedish-winter` · 6 films · palette: `vinter` · seal: VINTER · 6

**English**

Outside, the long night. Inside, another world.

A small Swedish cinema season for long evenings: doubt, memory, family warmth, a city at a standstill and an unexpected friendship in the snow. This is a winter viewing ritual, rather than six stories set in winter. Start anywhere, make room for a fika, and let the films speak to one another.

**Svenska**

Utanför väntar den långa natten. Inne finns en annan värld.

En liten svensk filmsäsong för långa kvällar: tvivel, minnen, familjevärme, en stad som stått still och en oväntad vänskap i snön. Det är en vinterritual, inte sex berättelser som alla utspelar sig på vintern. Börja var du vill, ta en fika och låt filmerna tala med varandra.

**Completion keepsake:** The Winter Lantern · six lights in the long night / Vinterlyktan · sex ljus i den långa natten

#### The Seventh Seal (1957)

Ingmar Bergman · 96 min · Reflective, Dark

[Presentation source](https://www.filmlinc.org/films/the-seventh-seal/)

**Before watching — English**

A knight's questions share the road with performers, ordinary worries and flashes of humor. Bergman's medieval world gives abstract doubts physical shapes. Alongside the famous imagery, watch for small acts of care and the contrast between searching for answers and living through a day.

**Före filmen — svenska**

En riddares frågor delar vägen med skådespelare, vardagsbekymmer och glimtar av humor. Bergmans medeltida värld ger tvivlet fysisk form. Se bortom de berömda bilderna efter små omsorgshandlingar och skillnaden mellan att söka svar och att leva en dag.

**After watching — English**

- Which ordinary moment best counterbalanced the film's larger questions?
- How do its comic and solemn passages affect one another?

**Efter filmen — svenska**

- Vilket vardagsögonblick gav bäst motvikt till filmens stora frågor?
- Hur påverkar de komiska och allvarliga avsnitten varandra?

#### Wild Strawberries (1957)

Ingmar Bergman · 92 min · Reflective

[Presentation source](https://www.criterion.com/films/175-wild-strawberries) · Criterion's 92-minute presentation; some other records list 91 minutes.

**Before watching — English**

A road trip becomes an encounter with memory. Victor Sjöström, director of The Phantom Carriage, plays an elderly professor whose present is interrupted by dreams and recollections. Watch the film's faces and transitions: emotional distance can be measured without anyone explaining it.

**Före filmen — svenska**

En bilresa blir ett möte med minnet. Victor Sjöström, som regisserade Körkarlen, spelar en äldre professor vars nutid avbryts av drömmar och minnesbilder. Se på ansiktena och övergångarna: känslomässigt avstånd kan bli synligt utan att någon förklarar det.

**After watching — English**

- How did dreams change the meaning of the journey?
- Where did a gesture communicate something the dialogue left unsaid?

**Efter filmen — svenska**

- Hur förändrade drömmarna resans betydelse?
- När uttryckte en gest något som dialogen lämnade osagt?

#### Winter Light (1963)

Ingmar Bergman · 81 min · Reflective, Dark

[Presentation source](https://www.criterion.com/films/569-winter-light)

**Before watching — English**

A small church, a few visitors and a winter afternoon. Bergman compresses questions of faith and human connection into a spare chamber drama. Notice the light, the gaps between exchanges and the effort it takes simply to listen to another person.

**Före filmen — svenska**

En liten kyrka, några besökare och en vintereftermiddag. Bergman samlar frågor om tro och mänsklig kontakt i ett avskalat kammardrama. Lägg märke till ljuset, mellanrummen i samtalen och ansträngningen som krävs för att lyssna på en annan människa.

**After watching — English**

- Who seems most able to hear another person's needs?
- How did the setting's light and stillness influence your experience of the dialogue?

**Efter filmen — svenska**

- Vem verkar bäst kunna höra en annan människas behov?
- Hur påverkade miljöns ljus och stillhet din upplevelse av dialogen?

#### Fanny and Alexander (1982)

Ingmar Bergman · 188 min · Reflective, Epic

[Presentation source](https://www.bfi.org.uk/film/12cbf169-c5eb-5b83-9ec0-a43a34937127/fanny-and-alexander) · 188-minute theatrical version. The television version needs a longer evening.

**Before watching — English**

A theater family seen partly through children's eyes. Bergman fills rooms with color, ritual and imagination, then asks what a home makes possible. This envelope uses the theatrical version; the much longer television version offers a different pace and more space to linger.

**Före filmen — svenska**

En teaterfamilj sedd delvis genom barnens ögon. Bergman fyller rummen med färg, ritualer och fantasi och undersöker vad ett hem kan ge. Kuvertet utgår från bioversionen; den betydligt längre tv-versionen har ett annat tempo och mer utrymme att dröja kvar.

**After watching — English**

- How do the film's different homes express different kinds of power?
- Where did imagination feel like comfort, resistance, or a threat?

**Efter filmen — svenska**

- Hur uttrycker filmens olika hem olika slags makt?
- När kändes fantasin som tröst, motstånd eller ett hot?

#### Songs from the Second Floor (2000)

Roy Andersson · 98 min · Funny, Reflective

[Presentation source](https://www.wikidata.org/wiki/Q2301516)

**Before watching — English**

A city stuck in traffic and bad news, seen in a series of still, carefully built tableaux. Roy Andersson composes each scene as one deadpan picture in which absurdity, grief and comedy share the frame. Look past the foreground: the background often holds the joke, or the sorrow.

**Före filmen — svenska**

En stad som fastnat i bilköer och dåliga nyheter, sedd i en rad stilla, noga uppbyggda tablåer. Roy Andersson komponerar varje scen som en enda lakonisk bild där det absurda, sorgen och komiken delar bildrutan. Titta förbi förgrunden: bakgrunden bär ofta skämtet, eller sorgen.

**After watching — English**

- Which scene made you laugh and wince in the same moment?
- How did the long, still shots change where you looked in the frame?

**Efter filmen — svenska**

- Vilken scen fick dig att skratta och rycka till i samma ögonblick?
- Hur förändrade de långa, stilla tagningarna var i bilden du tittade?

#### Let the Right One In (2008)

Tomas Alfredson · 114 min · Dark, Tense

[Presentation source](https://bfidatadigipres.github.io/in%20dreams%20are%20monsters/2022/12/06/let-the-right-one-in/)

**Before watching — English**

Snow muffles a Stockholm suburb where a lonely child meets a mysterious neighbor. Alfredson places a supernatural story beside the ordinary cruelties of growing up. Look at the distances between people, the windows and the quiet stretches that make a sudden sound matter.

**Före filmen — svenska**

Snön dämpar en Stockholmsförort där ett ensamt barn möter en gåtfull granne. Alfredson ställer en övernaturlig berättelse bredvid uppväxtens vardagliga grymheter. Se på avstånden mellan människor, fönstren och de tysta partierna som ger ett plötsligt ljud betydelse.

**After watching — English**

- How does the film complicate the idea of finding someone who understands you?
- Which quiet image stayed with you after the more dramatic scenes?

**Efter filmen — svenska**

- Hur gör filmen tanken på att hitta någon som förstår en mer komplicerad?
- Vilken stilla bild stannade kvar efter de mer dramatiska scenerna?

### First Steps into Silent Cinema / Första stegen in i stumfilmen

ID: `curated-silent` · 6 films · palette: `falu` · seal: STUMFILM · 6

**English**

No spoken dialogue. A great deal to say.

Begin with a laugh, then follow the image somewhere stranger. Six approachable landmarks move through comedy, romance, the supernatural and an intensely human trial. Silent cinema often comes with music; different scores and projection speeds can change its rhythm. Choose a restored edition when you can.

**Svenska**

Ingen talad dialog. Mycket att säga.

Börja med ett skratt och följ sedan bilden till mer främmande platser. Sex tillgängliga milstolpar rör sig genom komedi, romantik, övernaturliga berättelser och en djupt mänsklig rättegång. Stumfilm visas ofta med musik; olika partiturer och visningshastigheter kan förändra rytmen. Välj gärna en restaurerad utgåva.

**Completion keepsake:** The First Reel · six discoveries beyond dialogue / Den första filmrullen · sex upptäckter bortom dialogen

#### Sherlock Jr. (1924)

Buster Keaton · 49 min · Funny, Adventurous

[Presentation source](https://kinolorber.com/film/sherlock-jr) · Restored editions run roughly 45 to 49 minutes, depending on the version.

**Before watching — English**

A projectionist dreams himself into a detective story. Keaton makes editing, framing and the cinema screen part of the joke, while precise physical timing keeps everything moving. A compact invitation to notice how a film can play with the rules of its own images.

**Före filmen — svenska**

En biografmaskinist drömmer sig in i en detektivhistoria. Keaton gör klippning, bildutsnitt och bioduken till delar av skämtet, medan exakt fysisk tajming driver allt framåt. En kort inbjudan att se hur film kan leka med sina egna bildregler.

**After watching — English**

- Which joke depended most on editing or the camera rather than performance?
- How does the film connect watching movies with imagining a different life?

**Efter filmen — svenska**

- Vilket skämt byggde mest på klippning eller kamera snarare än skådespel?
- Hur kopplar filmen biobesök till drömmen om ett annat liv?

#### Safety Last! (1923)

Fred Newmeyer and Sam Taylor · 73 min · Funny, Tense

[Presentation source](https://www.criterion.com/films/28446-safety-last)

**Before watching — English**

Harold Lloyd's city striver finds that looking successful and being successful are different jobs. The famous clock is only one part of a carefully built comedy. Track how small everyday obstacles grow, and how the film makes you laugh while holding your breath.

**Före filmen — svenska**

Harold Lloyds storstadsdrömmare upptäcker att framstå som framgångsrik och att faktiskt lyckas är olika saker. Den berömda klockan är bara en del av en noggrant byggd komedi. Följ hur små vardagshinder växer och hur filmen får dig att skratta med andan i halsen.

**After watching — English**

- When did suspense and laughter become inseparable?
- What does the film suggest about the pressure to appear successful?

**Efter filmen — svenska**

- När blev spänning och skratt omöjliga att skilja åt?
- Vad säger filmen om pressen att verka framgångsrik?

#### The Gold Rush (1925)

Charlie Chaplin · 88 min · Funny, Romantic

[Presentation source](https://www.festival-cannes.com/en/f/the-gold-rush/) · The restored 1925 silent version, about 88 minutes; not the 72-minute narrated 1942 reissue.

**Before watching — English**

A little prospector confronts hunger, ambition and loneliness in the Klondike. Chaplin gives humble objects an extraordinary emotional range. Choose the restored 1925 silent version for this journey; the 1942 reissue adds narration and changes the film's rhythm as well as its length.

**Före filmen — svenska**

En liten guldgrävare möter hunger, ambition och ensamhet i Klondike. Chaplin ger enkla föremål ett ovanligt stort känsloregister. Välj den restaurerade stumfilmsversionen från 1925 för den här resan; 1942 års nyutgåva har berättarröst och förändrar både rytmen och längden.

**After watching — English**

- Which prop moved most effectively between comedy and tenderness?
- How did the film balance the wish to belong with the wish to become wealthy?

**Efter filmen — svenska**

- Vilken rekvisita rörde sig bäst mellan komik och ömhet?
- Hur balanserade filmen önskan om gemenskap mot önskan att bli rik?

#### The Phantom Carriage (1921)

Victor Sjöström · 106 min · Dark, Reflective

[Presentation source](https://www.criterion.com/films/27630-the-phantom-carriage) · Criterion's 106-minute restoration; silent-film runtimes vary with projection speed and edition.

**Before watching — English**

A New Year's Eve legend opens the door to memory and responsibility. Sjöström adapts Selma Lagerlöf using layered images and stories nested inside stories. Let the ghosts draw your eye, but keep watching the living: this Swedish silent film finds its force in human behavior.

**Före filmen — svenska**

En nyårssägen öppnar dörren till minnen och ansvar. Sjöström tolkar Selma Lagerlöf med överlagrade bilder och berättelser inuti berättelser. Låt spökena fånga blicken men fortsätt följa de levande: den svenska stumfilmen hämtar sin kraft ur människors handlingar.

**After watching — English**

- How did the film's shifts in time change your judgment of its characters?
- What did the ghostly images express that an ordinary flashback could not?

**Efter filmen — svenska**

- Hur förändrade filmens tidsskiften din bedömning av personerna?
- Vad uttryckte spökbilderna som en vanlig tillbakablick inte kunde?

#### Sunrise: A Song of Two Humans (1927)

F. W. Murnau · 94 min · Romantic, Reflective

[Presentation source](https://bfidatadigipres.github.io/sight%20and%20sound%20greatest%20films%20of%20all%20time%202022%3Cbr%3E11%3D/2023/03/05/sunrise/) · BFI's 94-minute screening presentation; a shorter Czech archive version also circulates.

**Before watching — English**

Rural and urban spaces become states of mind in Murnau's visual love story. Movement, light and layered images carry feelings beyond what dialogue could easily describe. Although it has no spoken dialogue, its original release belongs to cinema's transition toward synchronized sound.

**Före filmen — svenska**

Landsbygd och stad blir sinnestillstånd i Murnaus visuella kärleksberättelse. Rörelse, ljus och överlagrade bilder bär känslor bortom det som dialog enkelt kan uttrycka. Trots avsaknaden av talad dialog hör originalutgåvan till filmens övergång mot synkroniserat ljud.

**After watching — English**

- Which camera movement or visual transition felt most expressive?
- How do the city and the countryside change as the characters' feelings change?

**Efter filmen — svenska**

- Vilken kamerarörelse eller bildövergång kändes mest uttrycksfull?
- Hur förändras staden och landsbygden när personernas känslor förändras?

#### The Passion of Joan of Arc (1928)

Carl Theodor Dreyer · 81 min · Reflective, Dark

[Presentation source](https://www.criterion.com/films/228) · Criterion's 81-minute presentation at 24 frames per second; an alternate slower presentation is longer.

**Before watching — English**

A trial becomes an encounter with a face. Dreyer's close-ups and Renée Falconetti's performance concentrate attention on dignity under pressure. Let the unusual framing guide you rather than searching for a conventional sense of the room; the emotional geography matters more than the floor plan.

**Före filmen — svenska**

En rättegång blir ett möte med ett ansikte. Dreyers närbilder och Renée Falconettis skådespel samlar uppmärksamheten kring värdighet under press. Låt de ovanliga bildutsnitten leda dig i stället för att söka en vanlig rumsbild; känslornas geografi är viktigare än planritningen.

**After watching — English**

- How did close-ups change your relationship with the people on screen?
- What effect did the chosen musical accompaniment have on your experience?

**Efter filmen — svenska**

- Hur förändrade närbilderna din relation till människorna på duken?
- Hur påverkade den valda musiken din upplevelse?

### Hitchcock Week / Hitchcockveckan

ID: `curated-hitchcock` · 7 films · palette: `skog` · seal: HITCHCOCK · 7

**English**

Someone is always watching. Tonight, it's you.

Seven films from Hitchcock's Hollywood years, from a brooding English estate in 1940 to a small Californian bay in 1963, including the only one of his films to win Best Picture. Each builds suspense from what we are shown and what we are kept from: a glance, a key, a window across the yard. Watch in any order, notice how often the camera makes you a witness, and keep an eye out for the director himself: he slips into every one.

**Svenska**

Någon iakttar alltid. I kväll är det du.

Sju filmer från Hitchcocks år i Hollywood, från ett dystert engelskt gods 1940 till en liten bukt i Kalifornien 1963, däribland den enda av hans filmer som vann Oscar för bästa film. Var och en bygger spänning av det vi får se och det som hålls undan: en blick, en nyckel, ett fönster på andra sidan gården. Se dem i valfri ordning, lägg märke till hur ofta kameran gör dig till vittne, och håll utkik efter regissören själv: han smyger in i varenda en.

**Completion keepsake:** The MacGuffin · seven nights of suspense / MacGuffin · sju kvällar av spänning

#### Rebecca (1940)

Alfred Hitchcock · 126 min · Romantic, Tense

[Presentation source](https://www.wikidata.org/wiki/Q204212) · Listed at 126 to 130 minutes, depending on the edition.

**Before watching — English**

A young bride arrives at a grand estate where the first wife still seems to fill every room. Hitchcock's first Hollywood film, and the only one of his to win Best Picture, turns romance into a slow tightening of nerves. Watch how the house itself, with its closed doors, portraits and watchful housekeeper, keeps the past in charge.

**Före filmen — svenska**

En ung brud kommer till ett stort gods där den första frun fortfarande tycks fylla varje rum. Hitchcocks första film i Hollywood, och den enda av hans filmer som vann Oscar för bästa film, förvandlar en romans till nerver som sakta dras åt. Se hur huset självt, med sina stängda dörrar, porträtt och vaksamma hushållerska, låter det förflutna bestämma.

**After watching — English**

- Why do you think we never learn the narrator's first name?
- How does the house change from a place of romance into something threatening?

**Efter filmen — svenska**

- Varför tror du att vi aldrig får veta berättarens förnamn?
- Hur förvandlas huset från en romantisk plats till något hotfullt?

#### Notorious (1946)

Alfred Hitchcock · 102 min · Romantic, Tense

[Presentation source](https://www.wikidata.org/wiki/Q587419)

**Before watching — English**

A woman with a notorious name is recruited for a dangerous assignment in postwar Rio. Hitchcock builds suspense from small objects passed from hand to hand, and from love that has to be performed as duty. Follow the camera when it glides toward something tiny: in this film, a detail can weigh more than a gunfight.

**Före filmen — svenska**

En kvinna med ett ökänt namn rekryteras för ett farligt uppdrag i efterkrigstidens Rio. Hitchcock bygger spänning av små föremål som går från hand till hand och av en kärlek som måste spelas upp som en plikt. Följ kameran när den glider mot något litet: i den här filmen kan en detalj väga tyngre än en skottlossning.

**After watching — English**

- When did a small object make you more nervous than any threat of violence?
- How does the film blur the line between love and duty?

**Efter filmen — svenska**

- När gjorde ett litet föremål dig mer nervös än något hot om våld?
- Hur suddar filmen ut gränsen mellan kärlek och plikt?

#### Rear Window (1954)

Alfred Hitchcock · 112 min · Tense, Funny

[Presentation source](https://www.wikidata.org/wiki/Q34414)

**Before watching — English**

A photographer with a broken leg spends a heat wave watching the apartments across his courtyard. The film stays almost entirely in his room, so we see only what he can see, and soon we want what he wants. Enjoy the wit, then ask yourself when watching became something else.

**Före filmen — svenska**

En fotograf med brutet ben tillbringar en värmebölja med att iaktta lägenheterna på andra sidan gården. Nästan hela filmen stannar i hans rum, så vi ser bara det han ser, och snart vill vi samma sak som han. Njut av kvickheten och fråga dig sedan när tittandet blev något annat.

**After watching — English**

- Which neighbor's story did you follow most closely, and why?
- Did the film make you feel part of the watching? When?

**Efter filmen — svenska**

- Vilken grannes historia följde du mest uppmärksamt, och varför?
- Fick filmen dig att känna dig delaktig i tittandet? När?

#### Vertigo (1958)

Alfred Hitchcock · 128 min · Romantic, Dark

[Presentation source](https://www.wikidata.org/wiki/Q202548)

**Before watching — English**

A former detective with a fear of heights is hired to follow a woman through San Francisco. Hitchcock turns the city into a dream of museums, missions and winding streets, scored by Bernard Herrmann's restless, swirling music. Notice the colors, especially green, and how the mood shifts from mystery to obsession.

**Före filmen — svenska**

En före detta kriminalpolis med höjdskräck anlitas för att skugga en kvinna genom San Francisco. Hitchcock gör staden till en dröm av museer, missionsstationer och slingrande gator, till Bernard Herrmanns rastlösa, virvlande musik. Lägg märke till färgerna, särskilt grönt, och hur stämningen glider från mysterium till besatthet.

**After watching — English**

- How did color and music shape your feelings before anything was explained?
- Where did the film shift from mystery to obsession for you?

**Efter filmen — svenska**

- Hur formade färger och musik dina känslor innan något hade förklarats?
- Var tyckte du att filmen gled från mysterium till besatthet?

#### North by Northwest (1959)

Alfred Hitchcock · 136 min · Adventurous, Funny

[Presentation source](https://www.wikidata.org/wiki/Q223139)

**Before watching — English**

An advertising man is mistaken for someone else and sent running across America. This is Hitchcock at his most playful: a chase from a Manhattan bar to empty prairie and a famous monument, with Cary Grant keeping both his suit and his jokes. Watch how often danger arrives in broad daylight, in open places where there should be nowhere to hide.

**Före filmen — svenska**

En reklamman förväxlas med någon annan och tvingas fly tvärs över USA. Här är Hitchcock som mest lekfull: en jakt från en bar på Manhattan till öde prärie och ett berömt monument, där Cary Grant behåller både kostymen och skämten. Se hur ofta faran kommer mitt på ljusa dagen, på öppna platser där det borde vara omöjligt att gömma sig.

**After watching — English**

- Which scene was most fun, and which was most frightening? Were they the same one?
- Why do you think Hitchcock put so much danger in bright, open places?

**Efter filmen — svenska**

- Vilken scen var roligast och vilken var mest skrämmande? Var det samma scen?
- Varför tror du att Hitchcock lade så mycket fara på ljusa, öppna platser?

#### Psycho (1960)

Alfred Hitchcock · 109 min · Tense, Dark

[Presentation source](https://www.wikidata.org/wiki/Q163038)

**Before watching — English**

A secretary leaves town with money that isn't hers and stops for the night at a quiet roadside motel. Shot quickly and cheaply in black and white, Psycho broke the rules of what audiences expected a film to do. If you somehow don't know what happens, protect that; if you do, watch how carefully Hitchcock steers your sympathy from scene to scene.

**Före filmen — svenska**

En sekreterare lämnar stan med pengar som inte är hennes och stannar för natten på ett stilla motell vid vägen. Psycho spelades in snabbt och billigt i svartvitt och bröt mot reglerna för vad publiken väntade sig av en film. Om du mot förmodan inte vet vad som händer, skydda det; om du vet, se hur noga Hitchcock styr dina sympatier från scen till scen.

**After watching — English**

- Which moment unsettled you most, and why?
- How do the black-and-white images and Bernard Herrmann's strings shape the fear?

**Efter filmen — svenska**

- Vilket ögonblick oroade dig mest, och varför?
- Hur formar de svartvita bilderna och Bernard Herrmanns stråkar rädslan?

#### The Birds (1963)

Alfred Hitchcock · 119 min · Tense, Dark

[Presentation source](https://www.wikidata.org/wiki/Q110043)

**Before watching — English**

A playful pursuit brings a San Francisco socialite to a small coastal town, where the birds begin to behave strangely. There is no musical score, only electronic bird sounds and silence, and the film offers no easy explanations. Notice how ordinary places, a schoolyard, a diner, a phone booth, become impossible to trust.

**Före filmen — svenska**

En lekfull jakt för en societetsdam från San Francisco till en liten kuststad, där fåglarna börjar bete sig konstigt. Det finns ingen filmmusik, bara elektroniska fågelljud och tystnad, och filmen erbjuder inga enkla förklaringar. Se hur vardagliga platser, en skolgård, ett kafé, en telefonkiosk, blir omöjliga att lita på.

**After watching — English**

- How did the absence of music change the way you listened?
- What do you think the birds stand for, if anything?

**Efter filmen — svenska**

- Hur förändrade frånvaron av musik ditt sätt att lyssna?
- Vad tror du att fåglarna står för, om något?

### The Christmas Envelope / Julkuvertet

ID: `curated-christmas` · 7 films · palette: `falu` · seal: JUL · 7

**English**

Snow outside. A light in the window. Seven films to open.

Seven films for the days around Christmas, from a Budapest gift shop in 1940 to a snowed-in boarding school in 1970. Not all of them are Christmas films from start to finish, but each has Christmas at its heart: as a deadline, a party, or a night when someone needs company. Watch in any order, though the two oldest make a good start and The Holdovers a good last evening.

**Svenska**

Snö utanför. Ljus i fönstret. Sju filmer att öppna.

Sju filmer för dagarna kring jul, från en presentbutik i Budapest 1940 till en insnöad internatskola 1970. Alla är inte julfilmer från början till slut, men var och en har julen i sitt hjärta: som en tidsgräns, en fest eller en natt då någon behöver sällskap. Se dem i valfri ordning, även om de två äldsta är en bra början och The Holdovers en bra sista kväll.

**Completion keepsake:** The Christmas Star · seven lights in the window / Julstjärnan · sju ljus i fönstret

#### The Shop Around the Corner (1940)

Ernst Lubitsch · 99 min · Romantic, Funny

[Presentation source](https://www.wikidata.org/wiki/Q782751)

**Before watching — English**

Two clerks in a Budapest shop quarrel all day and, without knowing it, write to each other every night. Lubitsch keeps almost the whole film inside the shop in the weeks before Christmas, and lets small things carry the feeling: a cigarette box that plays a tune, a wallet, a seat at a café table. Notice how gently it treats everyone who works there, including the ones who behave badly.

**Före filmen — svenska**

Två expediter i en butik i Budapest grälar hela dagarna och skriver, utan att veta om det, till varandra varje kväll. Lubitsch håller nästan hela filmen inne i butiken veckorna före jul och låter småsaker bära känslan: en cigarettask som spelar en melodi, en plånbok, en plats vid ett kafébord. Lägg märke till hur varsamt filmen behandlar alla som arbetar där, även dem som beter sig illa.

**After watching — English**

- When did you first feel the two of them were right for each other, and what told you?
- What does the shop itself, with its routines and its worries about money, add to the love story?

**Efter filmen — svenska**

- När kände du först att de två passade ihop, och vad fick dig att känna det?
- Vad tillför själva butiken, med sina rutiner och sin oro för pengar, till kärlekshistorien?

#### Meet Me in St. Louis (1944)

Vincente Minnelli · 113 min · Uplifting, Romantic

[Presentation source](https://www.wikidata.org/wiki/Q1066873)

**Before watching — English**

A year in the life of a St. Louis family, told season by season as the 1904 World's Fair approaches. Minnelli's first great colour musical is remembered for its Christmas, when Judy Garland sings to her little sister on the night the family's future is being decided. Listen to how the songs grow out of ordinary moments: a trolley ride, a party, a window in winter.

**Före filmen — svenska**

Ett år i en familjs liv i St. Louis, berättat årstid för årstid medan världsutställningen 1904 närmar sig. Minnellis första stora färgmusikal är ihågkommen för sin jul, när Judy Garland sjunger för sin lillasyster den kväll då familjens framtid avgörs. Lyssna på hur sångerna växer fram ur vardagliga stunder: en spårvagnsfärd, en fest, ett fönster om vintern.

**After watching — English**

- Which of the film's seasons stayed with you most, and why?
- The song at the heart of the Christmas scene is a sad one. What does the film gain from that?

**Efter filmen — svenska**

- Vilken av filmens årstider stannade kvar hos dig, och varför?
- Sången mitt i julscenen är sorgsen. Vad vinner filmen på det?

#### It's a Wonderful Life (1946)

Frank Capra · 131 min · Uplifting, Reflective

[Presentation source](https://en.wikipedia.org/wiki/It%27s_a_Wonderful_Life) · Listed at 131 minutes; some records give a few minutes less.

**Before watching — English**

On Christmas Eve, a man who has spent his life helping a small town believes it would be better off without him. Capra takes his time getting there: most of the film is the life itself, with its postponed plans and small loyalties, so that the last half-hour lands with its full weight. Watch James Stewart's face in the scenes where George is at his angriest; the film is darker than its reputation.

**Före filmen — svenska**

På julafton tror en man som ägnat sitt liv åt att hjälpa en småstad att den skulle klara sig bättre utan honom. Capra tar god tid på sig: större delen av filmen är själva livet, med sina uppskjutna planer och små lojaliteter, så att den sista halvtimmen får sin fulla tyngd. Se på James Stewarts ansikte i scenerna där George är som argast; filmen är mörkare än sitt rykte.

**After watching — English**

- What did George give up, and did the film persuade you it was worth it?
- Why do you think this became a Christmas tradition, when so much of it is about disappointment?

**Efter filmen — svenska**

- Vad gav George upp, och övertygade filmen dig om att det var värt det?
- Varför tror du att den blev en jultradition, när så mycket av den handlar om besvikelse?

#### Miracle on 34th Street (1947)

George Seaton · 96 min · Uplifting, Funny

[Presentation source](https://www.wikidata.org/wiki/Q1467214)

**Before watching — English**

The man hired to play Santa Claus at Macy's insists that he is the real one, and New York has to decide what to do about it. Much of the film was shot in the real store and at the real Thanksgiving parade of 1946, which gives its fairy tale a crowded, practical city to live in. Notice how the film lets the adults' doubts be reasonable, and settles the argument in a courtroom.

**Före filmen — svenska**

Mannen som anställts för att spela jultomte på varuhuset Macy's hävdar att han är den riktige, och New York måste bestämma sig för vad man ska göra åt saken. Mycket av filmen spelades in i det verkliga varuhuset och under den verkliga Thanksgivingparaden 1946, vilket ger sagan en trång och praktisk stad att leva i. Lägg märke till att filmen låter de vuxnas tvivel vara rimliga, och avgör saken i en rättssal.

**After watching — English**

- Who changes most in the film: the child, her mother or the lawyer?
- What does the film suggest that believing in something is good for?

**Efter filmen — svenska**

- Vem förändras mest i filmen: barnet, hennes mamma eller advokaten?
- Vad menar filmen att det är bra för, att tro på något?

#### The Apartment (1960)

Billy Wilder · 125 min · Romantic, Reflective

[Presentation source](https://www.wikidata.org/wiki/Q270510)

**Before watching — English**

An office clerk lends his flat to his bosses for their affairs, and the film takes him through an office Christmas party to New Year's Eve. Wilder's comedy is set among paper cups and party hats, but its holidays are lonely ones, and it is honest about what people put up with to get ahead. Watch the vast office in the opening minutes, and how small one desk looks in it.

**Före filmen — svenska**

En kontorist lånar ut sin lägenhet till chefernas snedsprång, och filmen följer honom genom en julfest på kontoret fram till nyårsafton. Wilders komedi utspelar sig bland pappersmuggar och partyhattar, men dess helger är ensamma, och den är ärlig med vad människor står ut med för att komma sig upp. Se det väldiga kontoret i de första minuterna, och hur litet ett skrivbord ser ut där.

**After watching — English**

- How does the film make you like a man who, at the start, is doing something shabby?
- Why set this story between Christmas and New Year rather than at any other time?

**Efter filmen — svenska**

- Hur får filmen dig att tycka om en man som i början gör något ganska ynkligt?
- Varför utspelar sig berättelsen mellan jul och nyår och inte vid någon annan tid?

#### Carol (2015)

Todd Haynes · 118 min · Romantic, Reflective

[Presentation source](https://www.wikidata.org/wiki/Q15963780)

**Before watching — English**

A young shop assistant sells a train set to a woman in a fur coat in the Christmas rush of 1952, and the two cannot stop thinking about each other. Todd Haynes shot the film on Super 16, which gives New York a soft, grainy winter light, and much of it is seen through glass: shop windows, car windows, a rainy windscreen. Notice how much is said by a hand on a shoulder.

**Före filmen — svenska**

Ett ungt butiksbiträde säljer en tågbana till en kvinna i päls i julruschen 1952, och de två kan inte sluta tänka på varandra. Todd Haynes filmade på Super 16, vilket ger New York ett mjukt och kornigt vinterljus, och mycket ses genom glas: skyltfönster, bilrutor, en regnig vindruta. Lägg märke till hur mycket som sägs med en hand på en axel.

**After watching — English**

- The film begins and ends with the same meeting. What had changed for you the second time?
- What do the windows and reflections tell us about what these two can and cannot show?

**Efter filmen — svenska**

- Filmen börjar och slutar med samma möte. Vad hade förändrats för dig den andra gången?
- Vad säger fönstren och speglingarna om vad de två kan och inte kan visa?

#### The Holdovers (2023)

Alexander Payne · 133 min · Funny, Reflective

[Presentation source](https://www.wikidata.org/wiki/Q112114745)

**Before watching — English**

A teacher nobody likes, a pupil with nowhere to go and the school's cook are left behind at a New England boarding school over Christmas 1970. Alexander Payne made the film look and sound as if it had been found in a 1970s film can, down to the old studio logos, and gives its three lonely people time to surprise each other. A good last evening for this envelope.

**Före filmen — svenska**

En lärare som ingen tycker om, en elev som inte har någonstans att ta vägen och skolans kokerska blir kvar på en internatskola i New England över julen 1970. Alexander Payne fick filmen att se ut och låta som om den hittats i en filmburk från 1970-talet, ända ner till de gamla bolagslogotyperna, och ger sina tre ensamma människor tid att överraska varandra. En bra sista kväll för det här kuvertet.

**After watching — English**

- Which of the three did you understand best by the end, and when did that change?
- What does the 1970s look add to a story that could be told in any decade?

**Efter filmen — svenska**

- Vem av de tre förstod du bäst mot slutet, och när ändrades det?
- Vad tillför 1970-talsstilen till en berättelse som kunde utspela sig när som helst?

## Review decisions

The winter collection is explicitly a viewing season, not six stories all set in winter. Four of its films are by Bergman; a later Swedish collection can give other directors and periods more space. The noir collection deliberately includes a gothic film and a press satire at the edges of noir. The silent collection requests the 1925 Gold Rush rather than the narrated 1942 reissue and acknowledges score and projection-speed differences. Hitchcock Week follows one director across his Hollywood years, chosen for range rather than as a ranking; its cards stay spoiler-safe, Psycho above all, and Rebecca and Rear Window share their cards with the main list. These choices are part of the drafts for your review.

The Christmas envelope is seven films with Christmas at their heart rather than seven Christmas films: The Apartment and Carol are set among the holidays without being about them, and the introduction says so. It is American studio filmmaking for the most part, which a later seasonal envelope can widen. From 1 November to 6 January it moves to the front of the shelf. Four of its films were already Kuvert films with Wikidata facts; as envelope films their notes now carry the facts for the edition recommended, like every other envelope film.

The premise lines are drafts for review like the cards. They were written in one pass on 13 November 2026 and proofread once; a line that says too much, or too little, is a one-line change in each language file.
