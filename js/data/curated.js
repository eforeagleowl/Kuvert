// Original Kuvert editorial drafts. Film facts are linked to primary presentation records.
// Titles and years define permanent IDs, just as buildListDefinition does.
const slug = (s) => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const film = (t, y) => ({ t, y, id: `${y}-${slug(t)}`, s: "" });
const source = (label, url) => ({ label, url, checked: "2026-10-13", fields: ["title", "year", "director", "runtime"] });
const note = (runtime, director, moods, sources, context, discussion, runtimeNote = null) => ({
  runtime, director, moods, sources, context, discussion, ...(runtimeNote ? { runtimeNote } : {}),
  questions: discussion, source: sources[0].url, editionNotes: runtimeNote,
  editorial: { author: "Kuvert", status: "draft-for-review", spoilerSafe: true },
});

export const CURATED_COLLECTIONS = [
  {
    id: "curated-noir", version: 1, name: "Seven Nights of Noir", subtitle: "Seven letters from the city after dark", palette: "natt", series: {}, shelves: null,
    title: { en: "Seven Nights of Noir", sv: "Sju nätter med film noir" },
    tagline: { en: "Rain on the window. Trouble in the envelope.", sv: "Regn mot rutan. Trubbel i kuvertet." },
    introduction: {
      en: "Put on the kettle and lower the lights. These seven films travel from the private eye's office to the newsroom, with a riverbank detour along the way. Watch in any order; notice who gets to tell the story, who holds the power, and where the shadows fall.",
      sv: "Sätt på vattenkokaren och dämpa ljuset. Sju filmer tar oss från privatdetektivens kontor till tidningsredaktionen, med en avstickare längs floden. Se dem i valfri ordning och lägg märke till vem som berättar, vem som har makten och var skuggorna faller.",
    },
    motif: "rain", seal: "NOIR · 7", completion: { en: "The Night Tram · seven journeys through the shadows", sv: "Nattspårvagnen · sju resor genom skuggorna" },
    films: [film("The Maltese Falcon", 1941), film("Double Indemnity", 1944), film("Detour", 1945), film("The Third Man", 1949), film("In a Lonely Place", 1950), film("The Night of the Hunter", 1955), film("Sweet Smell of Success", 1957)],
    editorial: { status: "draft-for-review", theme: "A broad introduction to noir, including its gothic and satirical edges." },
  },
  {
    // Version 2: Songs from the Second Floor in place of The Phantom Carriage (js/views/journeys.js upgradeCurated).
    id: "curated-swedish-winter", version: 2, name: "A Swedish Winter", subtitle: "Six films for the long evenings", palette: "vinter", series: {}, shelves: null,
    title: { en: "A Swedish Winter", sv: "En svensk vinter" },
    tagline: { en: "Outside, the long night. Inside, another world.", sv: "Utanför väntar den långa natten. Inne finns en annan värld." },
    introduction: {
      en: "A small Swedish cinema season for long evenings: doubt, memory, family warmth, a city at a standstill and an unexpected friendship in the snow. This is a winter viewing ritual, rather than six stories set in winter. Start anywhere, make room for a fika, and let the films speak to one another.",
      sv: "En liten svensk filmsäsong för långa kvällar: tvivel, minnen, familjevärme, en stad som stått still och en oväntad vänskap i snön. Det är en vinterritual, inte sex berättelser som alla utspelar sig på vintern. Börja var du vill, ta en fika och låt filmerna tala med varandra.",
    },
    motif: "snow", seal: "VINTER · 6", completion: { en: "The Winter Lantern · six lights in the long night", sv: "Vinterlyktan · sex ljus i den långa natten" },
    films: [film("The Seventh Seal", 1957), film("Wild Strawberries", 1957), film("Winter Light", 1963), film("Fanny and Alexander", 1982), film("Songs from the Second Floor", 2000), film("Let the Right One In", 2008)],
    editorial: { status: "draft-for-review", theme: "An introductory season, not a representative survey of every Swedish filmmaker." },
  },
  {
    id: "curated-silent", version: 1, name: "First Steps into Silent Cinema", subtitle: "Six stories told through faces, movement and light", palette: "falu", series: {}, shelves: null,
    title: { en: "First Steps into Silent Cinema", sv: "Första stegen in i stumfilmen" },
    tagline: { en: "No spoken dialogue. A great deal to say.", sv: "Ingen talad dialog. Mycket att säga." },
    introduction: {
      en: "Begin with a laugh, then follow the image somewhere stranger. Six approachable landmarks move through comedy, romance, the supernatural and an intensely human trial. Silent cinema often comes with music; different scores and projection speeds can change its rhythm. Choose a restored edition when you can.",
      sv: "Börja med ett skratt och följ sedan bilden till mer främmande platser. Sex tillgängliga milstolpar rör sig genom komedi, romantik, övernaturliga berättelser och en djupt mänsklig rättegång. Stumfilm visas ofta med musik; olika partiturer och visningshastigheter kan förändra rytmen. Välj gärna en restaurerad utgåva.",
    },
    motif: "frames", seal: "STUMFILM · 6", completion: { en: "The First Reel · six discoveries beyond dialogue", sv: "Den första filmrullen · sex upptäckter bortom dialogen" },
    films: [film("Sherlock Jr.", 1924), film("Safety Last!", 1923), film("The Gold Rush", 1925), film("The Phantom Carriage", 1921), film("Sunrise: A Song of Two Humans", 1927), film("The Passion of Joan of Arc", 1928)],
    editorial: { status: "draft-for-review", theme: "An entry point, not a complete history of silent cinema." },
  },
];

export const CURATED_METADATA = {
  "1941-the-maltese-falcon": note(101, "John Huston", ["Tense", "Dark"], [source("BFI release programme", "https://bfidatadigipres.github.io/pdf/2021-09-17-maltese-falcon.pdf")], {
    en: "A private eye, a valuable object and a roomful of competing stories. Listen to the pauses as closely as the fast talk, and watch how Huston arranges people within a frame. A useful first stop for noir's uneasy relationship with trust.",
    sv: "En privatdetektiv, ett värdefullt föremål och ett rum fullt av motstridiga berättelser. Lyssna lika noga på pauserna som på det snabba pratet och se hur Huston placerar människor i bild. En första anhalt i film noirs sköra förhållande till tillit.",
  }, {
    en: ["Which character's account did you trust first, and why?", "How do rooms, doorways and the camera's position shape the balance of power?"],
    sv: ["Vems berättelse litade du först på, och varför?", "Hur påverkar rum, dörröppningar och kamerans placering maktbalansen?"],
  }, { en: "BFI's 101-minute release presentation; other editions may differ slightly.", sv: "BFI:s 101 minuter långa visningsversion; andra utgåvor kan skilja sig något." }),
  "1944-double-indemnity": note(108, "Billy Wilder", ["Tense", "Dark"], [source("The Criterion Collection", "https://www.criterion.com/films/30460-double-indemnity")], {
    en: "An insurance office becomes an unlikely place for suspense. Wilder and co-writer Raymond Chandler turn professional language into temptation and suspicion. Notice the voice-over, the patterns of light and the difference between the story someone tells and the image we see.",
    sv: "Ett försäkringskontor blir en oväntad plats för spänning. Wilder och medförfattaren Raymond Chandler förvandlar yrkesspråk till lockelse och misstankar. Lägg märke till berättarrösten, ljusmönstren och skillnaden mellan berättelsen vi hör och bilden vi ser.",
  }, {
    en: ["What does knowing the narrator's perspective change about the suspense?", "Which ordinary object or workplace detail became unexpectedly unsettling?"],
    sv: ["Hur förändras spänningen när vi känner berättarens perspektiv?", "Vilket vardagsföremål eller vilken arbetsplatsdetalj blev oväntat obehaglig?"],
  }),
  "1945-detour": note(69, "Edgar G. Ulmer", ["Tense", "Dark"], [source("Janus Films restoration press notes", "https://s3.amazonaws.com/criterion-production/janus_promo_packages/259-/Detour_press-notes_r2_original.pdf")], {
    en: "A short road movie with a long shadow. Ulmer turns modest rooms, roadside stops and a troubled voice-over into a claustrophobic world. Treat the narration as a character's version of events, and see how much atmosphere can be made with very little.",
    sv: "En kort vägfilm med en lång skugga. Ulmer gör enkla rum, vägkrogar och en orolig berättarröst till en klaustrofobisk värld. Lyssna på berättelsen som en persons version av händelserna och se hur mycket stämning som kan skapas med små medel.",
  }, {
    en: ["When did you begin to question the narrator's account?", "How did the film's small scale influence its feeling of fate or confinement?"],
    sv: ["När började du ifrågasätta berättarens version?", "Hur påverkade filmens lilla format känslan av öde eller instängdhet?"],
  }),
  "1949-the-third-man": note(104, "Carol Reed", ["Tense", "Dark"], [source("The Criterion Collection", "https://www.criterion.com/films/236-the-third-man")], {
    en: "A visitor arrives in postwar Vienna with more confidence than understanding. Reed lets the city unsettle both visitor and audience through tilted compositions, echoing spaces and an unmistakable zither score. Watch how friendship competes with the obligation to look more closely.",
    sv: "En besökare kommer till efterkrigstidens Wien med större självförtroende än förståelse. Reed gör staden främmande med lutande bilder, ekande rum och ett omisskännligt cittrapartitur. Se hur vänskap ställs mot skyldigheten att granska det som finns framför oss.",
  }, {
    en: ["How does Vienna function as more than a backdrop?", "Where did the film ask you to separate loyalty from responsibility?"],
    sv: ["Hur fungerar Wien som mer än en bakgrund?", "När bad filmen dig att skilja lojalitet från ansvar?"],
  }),
  "1950-in-a-lonely-place": note(93, "Nicholas Ray", ["Dark", "Reflective"], [source("The Criterion Collection", "https://www.criterion.com/films/27908-in-a-lonely-place")], {
    en: "Hollywood's storytelling machinery meets a fragile romance. Nicholas Ray keeps the mystery close to the emotions of two people learning what it means to trust. Pay attention to changes in tone: a charming conversation can acquire weight without the setting changing at all.",
    sv: "Hollywoods berättarmaskineri möter en skör kärleksrelation. Nicholas Ray låter mysteriet ligga nära känslorna hos två människor som försöker lita på varandra. Lägg märke till tonförskjutningarna: ett charmigt samtal kan bli tungt utan att platsen förändras.",
  }, {
    en: ["What distinguishes understanding someone from excusing their behavior?", "How did the film change your reading of its early romantic scenes?"],
    sv: ["Vad skiljer förståelse för en person från att ursäkta beteendet?", "Hur förändrade filmen din syn på de tidiga romantiska scenerna?"],
  }),
  "1955-the-night-of-the-hunter": note(93, "Charles Laughton", ["Dark", "Tense"], [source("The Criterion Collection", "https://www.criterion.com/films/27525-the-night-of-the-hunter")], {
    en: "At noir's edge, a crime story becomes a frightening children's fable. Laughton's only film as director uses silhouettes, songs and dreamlike landscapes to make adult danger feel enormous. Follow the children's view of the world, and notice where the film allows tenderness to enter.",
    sv: "Vid film noirs utkant blir en kriminalhistoria en skrämmande barnsaga. Laughtons enda film som regissör använder silhuetter, sånger och drömlika landskap för att göra vuxenvärldens fara väldig. Följ barnens blick och se var ömheten får komma in.",
  }, {
    en: ["Which images felt closer to a fairy tale than a realistic crime film?", "How do song and silence change the way danger is presented?"],
    sv: ["Vilka bilder kändes mer som en saga än en realistisk kriminalfilm?", "Hur förändrar sång och tystnad sättet som fara skildras på?"],
  }, { en: "Criterion's 93-minute presentation.", sv: "Criterion-utgåvan är 93 minuter." }),
  "1957-sweet-smell-of-success": note(96, "Alexander Mackendrick", ["Dark", "Tense"], [source("British Film Institute", "https://www.bfi.org.uk/film/675c22ce-c8cb-5f23-baf9-157ed05fb948/sweet-smell-of-success")], {
    en: "No detective is needed for this journey through New York's publicity business. Reputation is a currency, and every conversation has a price. Mackendrick's city glitters while its people negotiate; listen for the moments when an elegant sentence becomes a weapon.",
    sv: "Ingen detektiv behövs på den här resan genom New Yorks publicitetsbransch. Ryktet är en valuta och varje samtal har ett pris. Mackendricks stad glittrar medan människorna förhandlar; lyssna efter ögonblicken då en elegant mening blir ett vapen.",
  }, {
    en: ["Which exchange revealed the clearest difference between influence and authority?", "What made the film's city feel inviting, oppressive, or both?"],
    sv: ["Vilket samtal visade tydligast skillnaden mellan inflytande och auktoritet?", "Vad gjorde filmens stad lockande, kvävande eller både och?"],
  }),
  "1921-the-phantom-carriage": note(106, "Victor Sjöström", ["Dark", "Reflective"], [source("The Criterion Collection", "https://www.criterion.com/films/27630-the-phantom-carriage")], {
    en: "A New Year's Eve legend opens the door to memory and responsibility. Sjöström adapts Selma Lagerlöf using layered images and stories nested inside stories. Let the ghosts draw your eye, but keep watching the living: this Swedish silent film finds its force in human behavior.",
    sv: "En nyårssägen öppnar dörren till minnen och ansvar. Sjöström tolkar Selma Lagerlöf med överlagrade bilder och berättelser inuti berättelser. Låt spökena fånga blicken men fortsätt följa de levande: den svenska stumfilmen hämtar sin kraft ur människors handlingar.",
  }, {
    en: ["How did the film's shifts in time change your judgment of its characters?", "What did the ghostly images express that an ordinary flashback could not?"],
    sv: ["Hur förändrade filmens tidsskiften din bedömning av personerna?", "Vad uttryckte spökbilderna som en vanlig tillbakablick inte kunde?"],
  }, { en: "Criterion's 106-minute restoration; silent-film runtimes vary with projection speed and edition.", sv: "Criterion-restaureringen är 106 minuter; stumfilmers speltid varierar med visningshastighet och utgåva." }),
  "1957-the-seventh-seal": note(96, "Ingmar Bergman", ["Reflective", "Dark"], [source("Film at Lincoln Center", "https://www.filmlinc.org/films/the-seventh-seal/")], {
    en: "A knight's questions share the road with performers, ordinary worries and flashes of humor. Bergman's medieval world gives abstract doubts physical shapes. Alongside the famous imagery, watch for small acts of care and the contrast between searching for answers and living through a day.",
    sv: "En riddares frågor delar vägen med skådespelare, vardagsbekymmer och glimtar av humor. Bergmans medeltida värld ger tvivlet fysisk form. Se bortom de berömda bilderna efter små omsorgshandlingar och skillnaden mellan att söka svar och att leva en dag.",
  }, {
    en: ["Which ordinary moment best counterbalanced the film's larger questions?", "How do its comic and solemn passages affect one another?"],
    sv: ["Vilket vardagsögonblick gav bäst motvikt till filmens stora frågor?", "Hur påverkar de komiska och allvarliga avsnitten varandra?"],
  }),
  "1957-wild-strawberries": note(92, "Ingmar Bergman", ["Reflective"], [source("The Criterion Collection", "https://www.criterion.com/films/175-wild-strawberries")], {
    en: "A road trip becomes an encounter with memory. Victor Sjöström, director of The Phantom Carriage, plays an elderly professor whose present is interrupted by dreams and recollections. Watch the film's faces and transitions: emotional distance can be measured without anyone explaining it.",
    sv: "En bilresa blir ett möte med minnet. Victor Sjöström, som regisserade Körkarlen, spelar en äldre professor vars nutid avbryts av drömmar och minnesbilder. Se på ansiktena och övergångarna: känslomässigt avstånd kan bli synligt utan att någon förklarar det.",
  }, {
    en: ["How did dreams change the meaning of the journey?", "Where did a gesture communicate something the dialogue left unsaid?"],
    sv: ["Hur förändrade drömmarna resans betydelse?", "När uttryckte en gest något som dialogen lämnade osagt?"],
  }, { en: "Criterion's 92-minute presentation; some other records list 91 minutes.", sv: "Criterion-utgåvan är 92 minuter; andra kataloger anger ibland 91 minuter." }),
  "1963-winter-light": note(81, "Ingmar Bergman", ["Reflective", "Dark"], [source("The Criterion Collection", "https://www.criterion.com/films/569-winter-light")], {
    en: "A small church, a few visitors and a winter afternoon. Bergman compresses questions of faith and human connection into a spare chamber drama. Notice the light, the gaps between exchanges and the effort it takes simply to listen to another person.",
    sv: "En liten kyrka, några besökare och en vintereftermiddag. Bergman samlar frågor om tro och mänsklig kontakt i ett avskalat kammardrama. Lägg märke till ljuset, mellanrummen i samtalen och ansträngningen som krävs för att lyssna på en annan människa.",
  }, {
    en: ["Who seems most able to hear another person's needs?", "How did the setting's light and stillness influence your experience of the dialogue?"],
    sv: ["Vem verkar bäst kunna höra en annan människas behov?", "Hur påverkade miljöns ljus och stillhet din upplevelse av dialogen?"],
  }),
  "1982-fanny-and-alexander": note(188, "Ingmar Bergman", ["Reflective", "Epic"], [source("British Film Institute", "https://www.bfi.org.uk/film/12cbf169-c5eb-5b83-9ec0-a43a34937127/fanny-and-alexander")], {
    en: "A theater family seen partly through children's eyes. Bergman fills rooms with color, ritual and imagination, then asks what a home makes possible. This envelope uses the theatrical version; the much longer television version offers a different pace and more space to linger.",
    sv: "En teaterfamilj sedd delvis genom barnens ögon. Bergman fyller rummen med färg, ritualer och fantasi och undersöker vad ett hem kan ge. Kuvertet utgår från bioversionen; den betydligt längre tv-versionen har ett annat tempo och mer utrymme att dröja kvar.",
  }, {
    en: ["How do the film's different homes express different kinds of power?", "Where did imagination feel like comfort, resistance, or a threat?"],
    sv: ["Hur uttrycker filmens olika hem olika slags makt?", "När kändes fantasin som tröst, motstånd eller ett hot?"],
  }, { en: "188-minute theatrical version. The television version needs a longer evening.", sv: "Bioversionen är 188 minuter. Tv-versionen kräver en längre kväll." }),
  "2000-songs-from-the-second-floor": note(98, "Roy Andersson", ["Funny", "Reflective"], [source("Wikidata", "https://www.wikidata.org/wiki/Q2301516")], {
    en: "A city stuck in traffic and bad news, seen in a series of still, carefully built tableaux. Roy Andersson composes each scene as one deadpan picture in which absurdity, grief and comedy share the frame. Look past the foreground: the background often holds the joke, or the sorrow.",
    sv: "En stad som fastnat i bilköer och dåliga nyheter, sedd i en rad stilla, noga uppbyggda tablåer. Roy Andersson komponerar varje scen som en enda lakonisk bild där det absurda, sorgen och komiken delar bildrutan. Titta förbi förgrunden: bakgrunden bär ofta skämtet, eller sorgen.",
  }, {
    en: ["Which scene made you laugh and wince in the same moment?", "How did the long, still shots change where you looked in the frame?"],
    sv: ["Vilken scen fick dig att skratta och rycka till i samma ögonblick?", "Hur förändrade de långa, stilla tagningarna var i bilden du tittade?"],
  }),
  "2008-let-the-right-one-in": note(114, "Tomas Alfredson", ["Dark", "Tense"], [source("BFI Southbank programme notes", "https://bfidatadigipres.github.io/in%20dreams%20are%20monsters/2022/12/06/let-the-right-one-in/")], {
    en: "Snow muffles a Stockholm suburb where a lonely child meets a mysterious neighbor. Alfredson places a supernatural story beside the ordinary cruelties of growing up. Look at the distances between people, the windows and the quiet stretches that make a sudden sound matter.",
    sv: "Snön dämpar en Stockholmsförort där ett ensamt barn möter en gåtfull granne. Alfredson ställer en övernaturlig berättelse bredvid uppväxtens vardagliga grymheter. Se på avstånden mellan människor, fönstren och de tysta partierna som ger ett plötsligt ljud betydelse.",
  }, {
    en: ["How does the film complicate the idea of finding someone who understands you?", "Which quiet image stayed with you after the more dramatic scenes?"],
    sv: ["Hur gör filmen tanken på att hitta någon som förstår en mer komplicerad?", "Vilken stilla bild stannade kvar efter de mer dramatiska scenerna?"],
  }),
  "1924-sherlock-jr": note(49, "Buster Keaton", ["Funny", "Adventurous"], [source("Kino Lorber theatrical presentation", "https://kinolorber.com/film/sherlock-jr")], {
    en: "A projectionist dreams himself into a detective story. Keaton makes editing, framing and the cinema screen part of the joke, while precise physical timing keeps everything moving. A compact invitation to notice how a film can play with the rules of its own images.",
    sv: "En biografmaskinist drömmer sig in i en detektivhistoria. Keaton gör klippning, bildutsnitt och bioduken till delar av skämtet, medan exakt fysisk tajming driver allt framåt. En kort inbjudan att se hur film kan leka med sina egna bildregler.",
  }, {
    en: ["Which joke depended most on editing or the camera rather than performance?", "How does the film connect watching movies with imagining a different life?"],
    sv: ["Vilket skämt byggde mest på klippning eller kamera snarare än skådespel?", "Hur kopplar filmen biobesök till drömmen om ett annat liv?"],
  }, { en: "Restored editions run roughly 45 to 49 minutes, depending on the version.", sv: "Restaurerade utgåvor är ungefär 45–49 minuter långa, beroende på version." }),
  "1923-safety-last": note(73, "Fred Newmeyer and Sam Taylor", ["Funny", "Tense"], [source("The Criterion Collection", "https://www.criterion.com/films/28446-safety-last")], {
    en: "Harold Lloyd's city striver finds that looking successful and being successful are different jobs. The famous clock is only one part of a carefully built comedy. Track how small everyday obstacles grow, and how the film makes you laugh while holding your breath.",
    sv: "Harold Lloyds storstadsdrömmare upptäcker att framstå som framgångsrik och att faktiskt lyckas är olika saker. Den berömda klockan är bara en del av en noggrant byggd komedi. Följ hur små vardagshinder växer och hur filmen får dig att skratta med andan i halsen.",
  }, {
    en: ["When did suspense and laughter become inseparable?", "What does the film suggest about the pressure to appear successful?"],
    sv: ["När blev spänning och skratt omöjliga att skilja åt?", "Vad säger filmen om pressen att verka framgångsrik?"],
  }),
  "1925-the-gold-rush": note(88, "Charlie Chaplin", ["Funny", "Romantic"], [source("Festival de Cannes — 2025 restored silent presentation", "https://www.festival-cannes.com/en/f/the-gold-rush/")], {
    en: "A little prospector confronts hunger, ambition and loneliness in the Klondike. Chaplin gives humble objects an extraordinary emotional range. Choose the restored 1925 silent version for this journey; the 1942 reissue adds narration and changes the film's rhythm as well as its length.",
    sv: "En liten guldgrävare möter hunger, ambition och ensamhet i Klondike. Chaplin ger enkla föremål ett ovanligt stort känsloregister. Välj den restaurerade stumfilmsversionen från 1925 för den här resan; 1942 års nyutgåva har berättarröst och förändrar både rytmen och längden.",
  }, {
    en: ["Which prop moved most effectively between comedy and tenderness?", "How did the film balance the wish to belong with the wish to become wealthy?"],
    sv: ["Vilken rekvisita rörde sig bäst mellan komik och ömhet?", "Hur balanserade filmen önskan om gemenskap mot önskan att bli rik?"],
  }, { en: "The restored 1925 silent version, about 88 minutes; not the 72-minute narrated 1942 reissue.", sv: "Den restaurerade stumfilmsversionen från 1925, omkring 88 minuter; inte 1942 års version med berättarröst på 72 minuter." }),
  "1927-sunrise-a-song-of-two-humans": note(94, "F. W. Murnau", ["Romantic", "Reflective"], [source("BFI Southbank programme notes", "https://bfidatadigipres.github.io/sight%20and%20sound%20greatest%20films%20of%20all%20time%202022%3Cbr%3E11%3D/2023/03/05/sunrise/")], {
    en: "Rural and urban spaces become states of mind in Murnau's visual love story. Movement, light and layered images carry feelings beyond what dialogue could easily describe. Although it has no spoken dialogue, its original release belongs to cinema's transition toward synchronized sound.",
    sv: "Landsbygd och stad blir sinnestillstånd i Murnaus visuella kärleksberättelse. Rörelse, ljus och överlagrade bilder bär känslor bortom det som dialog enkelt kan uttrycka. Trots avsaknaden av talad dialog hör originalutgåvan till filmens övergång mot synkroniserat ljud.",
  }, {
    en: ["Which camera movement or visual transition felt most expressive?", "How do the city and the countryside change as the characters' feelings change?"],
    sv: ["Vilken kamerarörelse eller bildövergång kändes mest uttrycksfull?", "Hur förändras staden och landsbygden när personernas känslor förändras?"],
  }, { en: "BFI's 94-minute screening presentation; a shorter Czech archive version also circulates.", sv: "BFI:s visningsversion är 94 minuter; även en kortare version från det tjeckiska filmarkivet finns." }),
  "1928-the-passion-of-joan-of-arc": note(81, "Carl Theodor Dreyer", ["Reflective", "Dark"], [source("The Criterion Collection", "https://www.criterion.com/films/228")], {
    en: "A trial becomes an encounter with a face. Dreyer's close-ups and Renée Falconetti's performance concentrate attention on dignity under pressure. Let the unusual framing guide you rather than searching for a conventional sense of the room; the emotional geography matters more than the floor plan.",
    sv: "En rättegång blir ett möte med ett ansikte. Dreyers närbilder och Renée Falconettis skådespel samlar uppmärksamheten kring värdighet under press. Låt de ovanliga bildutsnitten leda dig i stället för att söka en vanlig rumsbild; känslornas geografi är viktigare än planritningen.",
  }, {
    en: ["How did close-ups change your relationship with the people on screen?", "What effect did the chosen musical accompaniment have on your experience?"],
    sv: ["Hur förändrade närbilderna din relation till människorna på duken?", "Hur påverkade den valda musiken din upplevelse?"],
  }, { en: "Criterion's 81-minute presentation at 24 frames per second; an alternate slower presentation is longer.", sv: "Criterion-utgåvan med 24 bilder per sekund är 81 minuter; en alternativ långsammare visning är längre." }),
};

export function curatedCollection(id) { return CURATED_COLLECTIONS.find((collection) => collection.id === id) || null; }
export function editorialFor(id) { return CURATED_METADATA[id] || null; }
