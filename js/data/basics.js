// Source-linked offline film facts. Runtime overrides identify their presentation.
import { CURATED_METADATA } from './curated.js';
import { FILMS } from './catalogue.js';
const FACTS = {
  "1927-wings": {
    "runtime": 141,
    "director": "William A. Wellman, Harry d'Abbadie d'Arrast",
    "genres": [
      "war film",
      "romance film",
      "drama film",
      "silent film",
      "action film"
    ],
    "source": "https://www.wikidata.org/wiki/Q272036",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q272036",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1929-the-broadway-melody": {
    "runtime": 110,
    "director": "Harry Beaumont",
    "genres": [
      "musical film",
      "romance film"
    ],
    "source": "https://www.wikidata.org/wiki/Q463620",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q463620",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1930-hell-s-angels": {
    "runtime": 127,
    "director": "Howard Hughes, James Whale, Edmund Goulding",
    "genres": [
      "war film",
      "drama film",
      "musical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1068328",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1068328",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1930-all-quiet-on-the-western-front": {
    "runtime": 136,
    "director": "Lewis Milestone, Nate Watt",
    "genres": [
      "war film",
      "drama film",
      "anti-war film"
    ],
    "source": "https://www.wikidata.org/wiki/Q272599",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q272599",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1931-cimarron": {
    "runtime": 131,
    "director": "Wesley Ruggles",
    "genres": [
      "Western film",
      "epic film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q251997",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q251997",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1932-grand-hotel": {
    "runtime": 113,
    "director": "Edmund Goulding",
    "genres": [
      "drama film",
      "romance film"
    ],
    "source": "https://www.wikidata.org/wiki/Q246656",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q246656",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1933-cavalcade": {
    "runtime": 110,
    "director": "Frank Lloyd",
    "genres": [
      "drama film",
      "war film"
    ],
    "source": "https://www.wikidata.org/wiki/Q753107",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q753107",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1934-it-happened-one-night": {
    "runtime": 105,
    "director": "Frank Capra",
    "genres": [
      "romantic comedy film"
    ],
    "source": "https://www.wikidata.org/wiki/Q208632",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q208632",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1935-mutiny-on-the-bounty": {
    "runtime": 132,
    "director": "Frank Lloyd",
    "genres": [
      "trial film",
      "adventure film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q329709",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q329709",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1935-a-midsummer-night-s-dream": {
    "runtime": 132,
    "director": "Max Reinhardt, William Dieterle",
    "genres": [
      "romantic comedy",
      "fantasy film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1305191",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1305191",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1935-a-tale-of-two-cities": {
    "runtime": 120,
    "director": "Jack Conway, Robert Z. Leonard",
    "genres": [
      "drama film",
      "romance film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1430490",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1430490",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1936-the-great-ziegfeld": {
    "runtime": 176,
    "director": "Robert Z. Leonard",
    "genres": [
      "biographical film",
      "musical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q470218",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q470218",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1937-the-life-of-emile-zola": {
    "runtime": 116,
    "director": "William Dieterle",
    "genres": [
      "drama film",
      "biographical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q738552",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q738552",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1938-you-can-t-take-it-with-you": {
    "runtime": 126,
    "director": "Frank Capra",
    "genres": [
      "romantic comedy"
    ],
    "source": "https://www.wikidata.org/wiki/Q637835",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q637835",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1939-gone-with-the-wind": {
    "runtime": 238,
    "director": "Victor Fleming, George Cukor, Sam Wood",
    "genres": [
      "romance film",
      "drama film",
      "historical film",
      "war film",
      "melodrama"
    ],
    "source": "https://www.wikidata.org/wiki/Q2875",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q2875",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1940-rebecca": {
    "runtime": 126,
    "director": "Alfred Hitchcock",
    "genres": [
      "mystery film",
      "drama film",
      "romance film",
      "thriller film",
      "psychological drama film",
      "psychological thriller film",
      "erotic thriller film",
      "melodrama"
    ],
    "source": "https://www.wikidata.org/wiki/Q204212",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q204212",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1941-how-green-was-my-valley": {
    "runtime": 118,
    "director": "John Ford",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q244448",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q244448",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1942-mrs-miniver": {
    "runtime": 134,
    "director": "William Wyler",
    "genres": [
      "war film",
      "drama film",
      "propaganda film",
      "romance film"
    ],
    "source": "https://www.wikidata.org/wiki/Q478371",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q478371",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1942-casablanca": {
    "runtime": 102,
    "director": "Michael Curtiz",
    "genres": [
      "romance film",
      "war film",
      "drama film",
      "flashback film",
      "film noir"
    ],
    "source": "https://www.wikidata.org/wiki/Q132689",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q132689",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1944-going-my-way": {
    "runtime": 130,
    "director": "Leo McCarey",
    "genres": [
      "comedy drama",
      "drama film",
      "romantic comedy",
      "musical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q468877",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q468877",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1945-the-lost-weekend": {
    "runtime": 101,
    "director": "Billy Wilder",
    "genres": [
      "drama film",
      "flashback film",
      "film noir"
    ],
    "source": "https://www.wikidata.org/wiki/Q237134",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q237134",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1946-the-best-years-of-our-lives": {
    "runtime": 172,
    "director": "William Wyler",
    "genres": [
      "war film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q645094",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q645094",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1947-gentleman-s-agreement": {
    "runtime": 118,
    "director": "Elia Kazan",
    "genres": [
      "drama film",
      "social problem film"
    ],
    "source": "https://www.wikidata.org/wiki/Q898840",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q898840",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1948-hamlet": {
    "runtime": 150,
    "director": "Laurence Olivier",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q27178",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q27178",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1950-all-about-eve": {
    "runtime": 138,
    "director": "Joseph L. Mankiewicz",
    "genres": [
      "drama film",
      "comedy film"
    ],
    "source": "https://www.wikidata.org/wiki/Q200299",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q200299",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1951-an-american-in-paris": {
    "runtime": 108,
    "director": "Vincente Minnelli",
    "genres": [
      "musical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q747570",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q747570",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1952-the-greatest-show-on-earth": {
    "runtime": 152,
    "director": "Cecil B. DeMille",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q641061",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q641061",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1953-from-here-to-eternity": {
    "runtime": 118,
    "director": "Fred Zinnemann",
    "genres": [
      "romance film",
      "war film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q207588",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q207588",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1953-julius-caesar": {
    "runtime": 120,
    "director": "Joseph L. Mankiewicz",
    "genres": [
      "historical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q734950",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q734950",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1954-on-the-waterfront": {
    "runtime": 108,
    "director": "Elia Kazan",
    "genres": [
      "drama film",
      "crime film",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q211372",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q211372",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1955-marty": {
    "runtime": 91,
    "director": "Delbert Mann",
    "genres": [
      "romantic drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q237116",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q237116",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1956-around-the-world-in-80-days": {
    "runtime": 184,
    "director": "Michael Anderson, John Farrow",
    "genres": [
      "adventure film",
      "action comedy film",
      "fantasy film"
    ],
    "source": "https://www.wikidata.org/wiki/Q696057",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q696057",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1957-the-bridge-on-the-river-kwai": {
    "runtime": 156,
    "director": "David Lean",
    "genres": [
      "drama film",
      "war film"
    ],
    "source": "https://www.wikidata.org/wiki/Q188718",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q188718",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1957-12-angry-men": {
    "runtime": 95,
    "director": "Sidney Lumet",
    "genres": [
      "drama film",
      "trial film",
      "huis-clos film"
    ],
    "source": "https://www.wikidata.org/wiki/Q2345",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q2345",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1958-gigi": {
    "runtime": 119,
    "director": "Vincente Minnelli, Charles Walters",
    "genres": [
      "romantic comedy film",
      "musical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q577757",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q577757",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1959-ben-hur": {
    "runtime": 222,
    "director": "William Wyler",
    "genres": [
      "epic film",
      "drama film",
      "action film",
      "sword-and-sandal film"
    ],
    "source": "https://www.wikidata.org/wiki/Q180098",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q180098",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1959-the-nun-s-story": {
    "runtime": 149,
    "director": "Fred Zinnemann",
    "genres": [
      "drama film",
      "biographical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q781608",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q781608",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1960-the-apartment": {
    "runtime": 125,
    "director": "Billy Wilder",
    "genres": [
      "romantic comedy film",
      "drama film",
      "Christmas film"
    ],
    "source": "https://www.wikidata.org/wiki/Q270510",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q270510",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1960-the-alamo": {
    "runtime": 192,
    "director": "John Wayne",
    "genres": [
      "Western film",
      "war film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1621909",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1621909",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1961-west-side-story": {
    "runtime": 150,
    "director": "Robert Wise, Jerome Robbins",
    "genres": [
      "musical film",
      "romance film",
      "drama film",
      "crime film"
    ],
    "source": "https://www.wikidata.org/wiki/Q273704",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q273704",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1961-the-guns-of-navarone": {
    "runtime": 158,
    "director": "J. Lee Thompson",
    "genres": [
      "war film",
      "adventure film",
      "action film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q756882",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q756882",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1962-lawrence-of-arabia": {
    "runtime": 216,
    "director": "David Lean",
    "genres": [
      "war film",
      "biographical film",
      "drama film",
      "adventure film",
      "flashback film",
      "epic film"
    ],
    "source": "https://www.wikidata.org/wiki/Q228186",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q228186",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1962-the-longest-day": {
    "runtime": 180,
    "director": "Ken Annakin, Bernhard Wicki, Darryl F. Zanuck, Gerd Oswald",
    "genres": [
      "war film",
      "historical film",
      "drama film",
      "action film"
    ],
    "source": "https://www.wikidata.org/wiki/Q468484",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q468484",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1963-tom-jones": {
    "runtime": 128,
    "director": "Tony Richardson",
    "genres": [
      "comedy film",
      "adventure film",
      "drama film",
      "period drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q313315",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q313315",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1963-cleopatra": {
    "runtime": 241,
    "director": "Joseph L. Mankiewicz",
    "genres": [
      "biographical film",
      "war film",
      "romance film",
      "drama film",
      "sword-and-sandal film",
      "epic film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q4430",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q4430",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1964-my-fair-lady": {
    "runtime": 171,
    "director": "George Cukor",
    "genres": [
      "musical film",
      "romance film",
      "drama film",
      "romantic comedy film"
    ],
    "source": "https://www.wikidata.org/wiki/Q201215",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q201215",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1965-the-sound-of-music": {
    "runtime": 174,
    "director": "Robert Wise",
    "genres": [
      "musical film",
      "biographical film",
      "drama film",
      "romance film"
    ],
    "source": "https://www.wikidata.org/wiki/Q60072",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q60072",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1965-doctor-zhivago": {
    "runtime": 197,
    "director": "David Lean",
    "genres": [
      "romance film",
      "drama film",
      "war film",
      "melodrama"
    ],
    "source": "https://www.wikidata.org/wiki/Q323827",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q323827",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1966-a-man-for-all-seasons": {
    "runtime": 118,
    "director": "Fred Zinnemann",
    "genres": [
      "biographical film",
      "trial film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q218999",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q218999",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1967-in-the-heat-of-the-night": {
    "runtime": 109,
    "director": "Norman Jewison",
    "genres": [
      "crime film",
      "drama film",
      "buddy cop film",
      "mystery film"
    ],
    "source": "https://www.wikidata.org/wiki/Q622240",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q622240",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1968-oliver": {
    "runtime": 146,
    "director": "Carol Reed",
    "genres": [
      "musical film",
      "drama film",
      "crime film"
    ],
    "source": "https://www.wikidata.org/wiki/Q141359",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q141359",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1969-midnight-cowboy": {
    "runtime": 108,
    "director": "John Schlesinger",
    "genres": [
      "buddy film",
      "drama film",
      "LGBTQ-related film"
    ],
    "source": "https://www.wikidata.org/wiki/Q61696",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q61696",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1970-patton": {
    "runtime": 170,
    "director": "Franklin J. Schaffner",
    "genres": [
      "biographical film",
      "war film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q217220",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q217220",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1972-the-godfather": {
    "runtime": 175,
    "director": "Francis Ford Coppola",
    "genres": [
      "epic film",
      "gangster film",
      "crime film",
      "drama film",
      "crime drama film",
      "historical film",
      "historical drama film",
      "suspense film",
      "crime thriller film",
      "police procedural film",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q47703",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q47703",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1973-the-sting": {
    "runtime": 129,
    "director": "George Roy Hill",
    "genres": [
      "heist film",
      "buddy film",
      "comedy film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q62665",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q62665",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1973-the-exorcist": {
    "runtime": 122,
    "director": "William Friedkin",
    "genres": [
      "horror film",
      "satanic film",
      "mystery film",
      "drama film",
      "supernatural horror film",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q274167",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q274167",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1975-dog-day-afternoon": {
    "runtime": 125,
    "director": "Sidney Lumet",
    "genres": [
      "heist film",
      "action film",
      "drama film",
      "crime film",
      "comedy drama",
      "LGBTQ-related film",
      "thriller film",
      "crime thriller film",
      "crime drama film",
      "comedy film",
      "biographical film",
      "gangster film",
      "black comedy film",
      "suspense film",
      "docudrama",
      "mystery film"
    ],
    "source": "https://www.wikidata.org/wiki/Q458656",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q458656",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1975-jaws": {
    "runtime": 124,
    "director": "Steven Spielberg",
    "genres": [
      "thriller film",
      "horror film",
      "adventure film",
      "suspense film",
      "science fiction horror film",
      "survival film",
      "science fiction film",
      "natural horror film"
    ],
    "source": "https://www.wikidata.org/wiki/Q189505",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q189505",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1976-rocky": {
    "runtime": 119,
    "director": "John G. Avildsen",
    "genres": [
      "drama film",
      "action film",
      "boxing film"
    ],
    "source": "https://www.wikidata.org/wiki/Q188652",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q188652",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1976-taxi-driver": {
    "runtime": 114,
    "director": "Martin Scorsese",
    "genres": [
      "neo-noir",
      "psychological drama film",
      "crime film",
      "film noir",
      "action film",
      "crime drama film",
      "crime thriller film",
      "psychological thriller film",
      "police procedural film",
      "suspense film",
      "vigilante film",
      "drama film",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q47221",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q47221",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1976-all-the-president-s-men": {
    "runtime": 138,
    "director": "Alan J. Pakula",
    "genres": [
      "crime film",
      "historical film",
      "drama film",
      "political thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q466781",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q466781",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1977-star-wars": {
    "runtime": 121,
    "director": "George Lucas",
    "genres": [
      "space opera",
      "science fiction film",
      "action film",
      "adventure film",
      "coming-of-age film"
    ],
    "source": "https://www.wikidata.org/wiki/Q17738",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q17738",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://www.sensacine.com/peliculas/pelicula-25801/",
      "https://www.beyazperde.com/filmler/film-25801/"
    ],
    "checked": "2026-10-13"
  },
  "1979-kramer-vs-kramer": {
    "runtime": 100,
    "director": "Robert Benton",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q193577",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q193577",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1980-ordinary-people": {
    "runtime": 124,
    "director": "Robert Redford",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q503313",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q503313",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1980-raging-bull": {
    "runtime": 129,
    "director": "Martin Scorsese",
    "genres": [
      "biographical film",
      "drama film",
      "boxing film",
      "historical film",
      "historical drama film",
      "action film",
      "sport film",
      "neo-noir",
      "period drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q220780",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q220780",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1981-raiders-of-the-lost-ark": {
    "runtime": 115,
    "director": "Steven Spielberg",
    "genres": [
      "action film",
      "treasure hunt film"
    ],
    "source": "https://www.wikidata.org/wiki/Q174284",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q174284",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1982-e-t-the-extra-terrestrial": {
    "runtime": 115,
    "director": "Steven Spielberg",
    "genres": [
      "science fiction film",
      "drama film",
      "children's film",
      "family film"
    ],
    "source": "https://www.wikidata.org/wiki/Q11621",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q11621",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1985-the-color-purple": {
    "runtime": 154,
    "director": "Steven Spielberg",
    "genres": [
      "drama film",
      "LGBTQ-related film",
      "epic film"
    ],
    "source": "https://www.wikidata.org/wiki/Q223299",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q223299",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1987-the-last-emperor": {
    "runtime": 165,
    "director": "Bernardo Bertolucci",
    "genres": [
      "drama film",
      "biographical film",
      "historical film",
      "epic film"
    ],
    "source": "https://www.wikidata.org/wiki/Q212775",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q212775",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1988-rain-man": {
    "runtime": 128,
    "director": "Barry Levinson",
    "genres": [
      "drama film",
      "comedy drama",
      "buddy film"
    ],
    "source": "https://www.wikidata.org/wiki/Q188845",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q188845",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1989-driving-miss-daisy": {
    "runtime": 99,
    "director": "Bruce Beresford",
    "genres": [
      "buddy film",
      "comedy film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q211373",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q211373",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1989-field-of-dreams": {
    "runtime": 101,
    "director": "Phil Alden Robinson",
    "genres": [
      "fantasy film",
      "drama film",
      "sport film",
      "ghost film"
    ],
    "source": "https://www.wikidata.org/wiki/Q517958",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q517958",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1990-goodfellas": {
    "runtime": 146,
    "director": "Martin Scorsese",
    "genres": [
      "biographical film",
      "gangster film",
      "crime thriller film",
      "crime film",
      "thriller film",
      "historical drama film",
      "police procedural film",
      "crime drama film",
      "drama film",
      "period drama film",
      "historical film",
      "suspense film"
    ],
    "source": "https://www.wikidata.org/wiki/Q42047",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q42047",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1990-the-godfather-part-iii": {
    "runtime": 162,
    "director": "Francis Ford Coppola",
    "genres": [
      "crime film",
      "drama film",
      "crime thriller film",
      "epic film",
      "gangster film",
      "crime drama film",
      "mystery film",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q202326",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q202326",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1991-the-silence-of-the-lambs": {
    "runtime": 118,
    "director": "Jonathan Demme",
    "genres": [
      "thriller film",
      "horror film",
      "psychological horror film",
      "psychological thriller film",
      "crime film",
      "drama film",
      "police procedural film",
      "crime thriller film",
      "crime drama film",
      "psychological drama film",
      "LGBTQ-related film"
    ],
    "source": "https://www.wikidata.org/wiki/Q133654",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q133654",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1991-jfk": {
    "runtime": 189,
    "director": "Oliver Stone",
    "genres": [
      "historical film",
      "drama film",
      "crime film",
      "mystery film",
      "biographical film",
      "political thriller film",
      "detective film"
    ],
    "source": "https://www.wikidata.org/wiki/Q741823",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q741823",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1992-unforgiven": {
    "runtime": 131,
    "director": "Clint Eastwood",
    "genres": [
      "Western film",
      "drama film",
      "crime film"
    ],
    "source": "https://www.wikidata.org/wiki/Q104137",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q104137",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1992-a-few-good-men": {
    "runtime": 138,
    "director": "Rob Reiner",
    "genres": [
      "trial film",
      "thriller film",
      "drama film",
      "crime film"
    ],
    "source": "https://www.wikidata.org/wiki/Q108946",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q108946",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1993-schindler-s-list": {
    "runtime": 195,
    "director": "Steven Spielberg",
    "genres": [
      "anti-war film",
      "biographical film",
      "drama film",
      "historical film",
      "war drama",
      "historical drama film",
      "war film",
      "epic film",
      "psychological drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q483941",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q483941",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "http://www.bbfc.co.uk/releases/schindlers-list-1970-3"
    ],
    "checked": "2026-10-13"
  },
  "1993-the-fugitive": {
    "runtime": 130,
    "director": "Andrew Davis",
    "genres": [
      "crime film",
      "action film",
      "thriller film",
      "detective film"
    ],
    "source": "https://www.wikidata.org/wiki/Q156309",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q156309",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1994-forrest-gump": {
    "runtime": 142,
    "director": "Robert Zemeckis",
    "genres": [
      "coming-of-age film",
      "flashback film",
      "comedy film",
      "drama film",
      "historical drama",
      "romantic comedy film",
      "tragicomedy",
      "American football film"
    ],
    "source": "https://www.wikidata.org/wiki/Q134773",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q134773",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1994-pulp-fiction": {
    "runtime": 154,
    "director": "Quentin Tarantino",
    "genres": [
      "independent film",
      "crime film",
      "crime drama film",
      "drama film",
      "crime thriller film",
      "action film",
      "thriller film",
      "suspense film",
      "black comedy film",
      "crime comedy film",
      "action thriller",
      "comedy drama",
      "comedy film",
      "neo-noir",
      "gangster film"
    ],
    "source": "https://www.wikidata.org/wiki/Q104123",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q104123",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1994-the-shawshank-redemption": {
    "runtime": 142,
    "director": "Frank Darabont",
    "genres": [
      "drama film",
      "buddy film",
      "prison film",
      "crime film"
    ],
    "source": "https://www.wikidata.org/wiki/Q172241",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q172241",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1995-braveheart": {
    "runtime": 177,
    "director": "Mel Gibson",
    "genres": [
      "biographical film",
      "drama film",
      "war film",
      "action film",
      "medieval film"
    ],
    "source": "https://www.wikidata.org/wiki/Q162729",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q162729",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1995-apollo-13": {
    "runtime": 134,
    "director": "Ron Howard",
    "genres": [
      "docudrama",
      "adventure film",
      "drama film",
      "survival film",
      "disaster film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q106428",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q106428",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1996-the-english-patient": {
    "runtime": 162,
    "director": "Anthony Minghella",
    "genres": [
      "romance film",
      "war film",
      "drama film",
      "flashback film",
      "spy film"
    ],
    "source": "https://www.wikidata.org/wiki/Q63026",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q63026",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1996-fargo": {
    "runtime": 98,
    "director": "Joel Coen, Ethan Coen",
    "genres": [
      "crime film",
      "drama film",
      "neo-noir",
      "black comedy film",
      "thriller film",
      "police procedural film",
      "crime thriller film",
      "crime drama film",
      "comedy film",
      "suspense film",
      "action film",
      "mystery film",
      "film noir",
      "comedy drama"
    ],
    "source": "https://www.wikidata.org/wiki/Q222720",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q222720",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://www.imdb.com/title/tt0116282/technical"
    ],
    "checked": "2026-10-13"
  },
  "1997-titanic": {
    "runtime": 195,
    "director": "James Cameron",
    "genres": [
      "disaster film",
      "drama film",
      "romance film",
      "flashback film",
      "melodrama",
      "historical film",
      "epic film"
    ],
    "source": "https://www.wikidata.org/wiki/Q44578",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q44578",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1997-good-will-hunting": {
    "runtime": 126,
    "director": "Gus Van Sant",
    "genres": [
      "romance film",
      "coming-of-age film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q193835",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q193835",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1997-l-a-confidential": {
    "runtime": 132,
    "director": "Curtis Hanson",
    "genres": [
      "crime film",
      "neo-noir",
      "mystery film",
      "drama film",
      "thriller film",
      "police procedural film",
      "crime drama film",
      "crime thriller film",
      "suspense film",
      "action film"
    ],
    "source": "https://www.wikidata.org/wiki/Q339876",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q339876",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1998-shakespeare-in-love": {
    "runtime": 123,
    "director": "John Madden",
    "genres": [
      "romantic comedy film",
      "comedy drama",
      "drama film",
      "biographical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q182944",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q182944",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1998-saving-private-ryan": {
    "runtime": 169,
    "director": "Steven Spielberg",
    "genres": [
      "war film",
      "drama film",
      "action film"
    ],
    "source": "https://www.wikidata.org/wiki/Q165817",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q165817",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1998-the-thin-red-line": {
    "runtime": 166,
    "director": "Terrence Malick",
    "genres": [
      "war film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q221491",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q221491",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "http://www.nytimes.com/1998/12/23/movies/film-review-beauty-and-destruction-in-pacific-battle.html?mtrref=query.nytimes.com&gwh=2F64CC8A3962C4940F2BA7E3C8D7F2C8&gwt=pay"
    ],
    "checked": "2026-10-13"
  },
  "1999-american-beauty": {
    "runtime": 121,
    "director": "Sam Mendes",
    "genres": [
      "black comedy film",
      "comedy drama",
      "drama film",
      "flashback film",
      "LGBTQ-related film"
    ],
    "source": "https://www.wikidata.org/wiki/Q25139",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q25139",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1999-the-sixth-sense": {
    "runtime": 107,
    "director": "M. Night Shyamalan",
    "genres": [
      "horror film",
      "thriller film",
      "drama film",
      "ghost film",
      "psychological thriller film",
      "psychological horror film",
      "mystery film",
      "psychological drama film",
      "suspense film"
    ],
    "source": "https://www.wikidata.org/wiki/Q183063",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q183063",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2000-gladiator": {
    "runtime": 155,
    "director": "Ridley Scott",
    "genres": [
      "sword-and-sandal film",
      "melodrama",
      "action film",
      "drama film",
      "adventure film",
      "epic film",
      "historical film",
      "historical drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q128518",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q128518",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2000-crouching-tiger-hidden-dragon": {
    "runtime": 115,
    "director": "Ang Lee",
    "genres": [
      "romance film",
      "fantasy film",
      "martial arts film",
      "action film",
      "adventure film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q273978",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q273978",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2001-a-beautiful-mind": {
    "runtime": 135,
    "director": "Ron Howard",
    "genres": [
      "biographical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q164103",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q164103",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2002-chicago": {
    "runtime": 113,
    "director": "Rob Marshall",
    "genres": [
      "musical film",
      "comedy drama",
      "prison film",
      "drama film",
      "comedy film",
      "detective film"
    ],
    "source": "https://www.wikidata.org/wiki/Q189889",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q189889",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2002-gangs-of-new-york": {
    "runtime": 168,
    "director": "Martin Scorsese",
    "genres": [
      "crime film",
      "drama film",
      "historical film",
      "crime drama film",
      "historical drama film",
      "epic film",
      "mystery film",
      "action film",
      "gangster film",
      "period drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q154581",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q154581",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2003-master-and-commander-the-far-side-of-the-world": {
    "runtime": 133,
    "director": "Peter Weir",
    "genres": [
      "action film",
      "adventure film",
      "war film",
      "historical drama",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1125384",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1125384",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2004-million-dollar-baby": {
    "runtime": 132,
    "director": "Clint Eastwood",
    "genres": [
      "buddy film",
      "drama film",
      "boxing film"
    ],
    "source": "https://www.wikidata.org/wiki/Q184255",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q184255",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2004-the-aviator": {
    "runtime": 170,
    "director": "Martin Scorsese",
    "genres": [
      "biographical film",
      "drama film",
      "historical film",
      "thriller film",
      "adventure film",
      "historical drama film",
      "epic film"
    ],
    "source": "https://www.wikidata.org/wiki/Q201924",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q201924",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2005-brokeback-mountain": {
    "runtime": 134,
    "director": "Ang Lee",
    "genres": [
      "romance film",
      "drama film",
      "LGBTQ-related film"
    ],
    "source": "https://www.wikidata.org/wiki/Q160618",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q160618",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2006-the-departed": {
    "runtime": 151,
    "director": "Martin Scorsese",
    "genres": [
      "crime thriller film",
      "drama film",
      "crime film",
      "thriller film",
      "gangster film",
      "crime drama film",
      "mystery film",
      "suspense film",
      "epic film",
      "neo-noir"
    ],
    "source": "https://www.wikidata.org/wiki/Q172975",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q172975",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2006-letters-from-iwo-jima": {
    "runtime": 141,
    "director": "Clint Eastwood",
    "genres": [
      "war film",
      "drama film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q275187",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q275187",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2007-no-country-for-old-men": {
    "runtime": 122,
    "director": "Ethan Coen, Joel Coen",
    "genres": [
      "thriller film",
      "Western film",
      "drama film",
      "contemporary Western film",
      "crime drama film",
      "adventure film",
      "neo-noir",
      "mystery film",
      "psychological thriller film",
      "suspense film",
      "crime film",
      "action film",
      "crime thriller film",
      "psychological drama film",
      "gangster film"
    ],
    "source": "https://www.wikidata.org/wiki/Q183081",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q183081",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2007-there-will-be-blood": {
    "runtime": 158,
    "director": "Paul Thomas Anderson",
    "genres": [
      "drama film",
      "epic film",
      "period drama film",
      "Western film",
      "thriller film",
      "historical drama film",
      "revisionist Western",
      "historical film",
      "independent film"
    ],
    "source": "https://www.wikidata.org/wiki/Q244315",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q244315",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2008-slumdog-millionaire": {
    "runtime": 120,
    "director": "Danny Boyle, Loveleen Tandan",
    "genres": [
      "romance film",
      "drama film",
      "coming-of-age film",
      "crime film"
    ],
    "source": "https://www.wikidata.org/wiki/Q125076",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q125076",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2009-the-hurt-locker": {
    "runtime": 131,
    "director": "Kathryn Bigelow",
    "genres": [
      "action thriller",
      "war film",
      "independent film",
      "drama film",
      "action film"
    ],
    "source": "https://www.wikidata.org/wiki/Q183066",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q183066",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2009-avatar": {
    "runtime": 162,
    "director": "James Cameron",
    "genres": [
      "science fiction film",
      "action film",
      "adventure film",
      "military science fiction",
      "live-action/animated film",
      "epic film",
      "white savior film"
    ],
    "source": "https://www.wikidata.org/wiki/Q24871",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q24871",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2010-the-king-s-speech": {
    "runtime": 118,
    "director": "Tom Hooper",
    "genres": [
      "biographical film",
      "drama film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q160060",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q160060",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2010-inception": {
    "runtime": 148,
    "director": "Christopher Nolan",
    "genres": [
      "heist film",
      "science fiction film",
      "thriller film",
      "science fiction action film",
      "adventure film",
      "drama film",
      "mystery film",
      "action film"
    ],
    "source": "https://www.wikidata.org/wiki/Q25188",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q25188",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2010-black-swan": {
    "runtime": 108,
    "director": "Darren Aronofsky",
    "genres": [
      "psychological thriller film",
      "thriller film",
      "psychological horror fiction",
      "drama film",
      "horror film",
      "LGBTQ-related film",
      "magic realist film"
    ],
    "source": "https://www.wikidata.org/wiki/Q180214",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q180214",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2010-true-grit": {
    "runtime": 110,
    "director": "Ethan Coen, Joel Coen",
    "genres": [
      "Western film",
      "drama film",
      "adventure film"
    ],
    "source": "https://www.wikidata.org/wiki/Q326114",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q326114",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2011-the-artist": {
    "runtime": 100,
    "director": "Michel Hazanavicius",
    "genres": [
      "romantic comedy film",
      "drama film",
      "romance film",
      "comedy drama",
      "comedy film",
      "silent film"
    ],
    "source": "https://www.wikidata.org/wiki/Q171861",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q171861",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "http://www.cnc.fr/web/fr/rechercher-une-oeuvre/-/visa/127108"
    ],
    "checked": "2026-10-13"
  },
  "2011-war-horse": {
    "runtime": 146,
    "director": "Steven Spielberg",
    "genres": [
      "war film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q218589",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q218589",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2012-argo": {
    "runtime": 120,
    "director": "Ben Affleck",
    "genres": [
      "political thriller film",
      "drama film",
      "biographical film",
      "thriller film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q59653",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q59653",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2012-zero-dark-thirty": {
    "runtime": 157,
    "director": "Kathryn Bigelow",
    "genres": [
      "thriller film",
      "war film",
      "drama film",
      "action film"
    ],
    "source": "https://www.wikidata.org/wiki/Q152531",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q152531",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2012-django-unchained": {
    "runtime": 165,
    "director": "Quentin Tarantino",
    "genres": [
      "revisionist Western",
      "Western film",
      "action film",
      "blaxploitation film",
      "historical drama film",
      "historical film",
      "comedy drama",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q571032",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q571032",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2013-12-years-a-slave": {
    "runtime": 133,
    "director": "Steve McQueen",
    "genres": [
      "drama film",
      "biographical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q3023357",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q3023357",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1989-born-on-the-fourth-of-july": {
    "runtime": 138,
    "director": "Oliver Stone",
    "genres": [
      "war film",
      "drama film",
      "biographical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q471159",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q471159",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2014-birdman-or-the-unexpected-virtue-of-ignorance": {
    "runtime": 119,
    "director": "Alejandro González Iñárritu",
    "genres": [
      "comedy film",
      "drama film",
      "black comedy",
      "tragicomedy"
    ],
    "source": "https://www.wikidata.org/wiki/Q13255497",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q13255497",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2014-whiplash": {
    "runtime": 106,
    "director": "Damien Chazelle",
    "genres": [
      "musical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q15648198",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q15648198",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2015-spotlight": {
    "runtime": 127,
    "director": "Tom McCarthy",
    "genres": [
      "drama film",
      "biographical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q18154496",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q18154496",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "http://www.nytimes.com/2015/11/06/movies/review-in-spotlight-the-boston-globe-digs-up-the-catholic-churchs-dirt.html"
    ],
    "checked": "2026-10-13"
  },
  "2015-the-revenant": {
    "runtime": 157,
    "director": "Alejandro González Iñárritu",
    "genres": [
      "Western film",
      "survival film",
      "thriller film",
      "drama film",
      "biographical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q18002795",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q18002795",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2015-bridge-of-spies": {
    "runtime": 142,
    "director": "Steven Spielberg",
    "genres": [
      "war film",
      "trial film",
      "biographical film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q18067135",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q18067135",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2016-moonlight": {
    "runtime": 111,
    "director": "Barry Jenkins",
    "genres": [
      "drama film",
      "LGBTQ-related film",
      "coming-of-age film"
    ],
    "source": "https://www.wikidata.org/wiki/Q21527875",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q21527875",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2016-arrival": {
    "runtime": 116,
    "director": "Denis Villeneuve",
    "genres": [
      "drama film",
      "science fiction film",
      "thriller film",
      "mystery film"
    ],
    "source": "https://www.wikidata.org/wiki/Q20382729",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q20382729",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2016-hell-or-high-water": {
    "runtime": 102,
    "director": "David Mackenzie",
    "genres": [
      "heist film",
      "crime film",
      "drama film",
      "contemporary Western film",
      "police procedural film"
    ],
    "source": "https://www.wikidata.org/wiki/Q20026847",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q20026847",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2016-hacksaw-ridge": {
    "runtime": 131,
    "director": "Mel Gibson",
    "genres": [
      "biographical film",
      "drama film",
      "war film"
    ],
    "source": "https://www.wikidata.org/wiki/Q21010856",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q21010856",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2016-manchester-by-the-sea": {
    "runtime": 135,
    "director": "Kenneth Lonergan",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q19864603",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q19864603",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2017-the-shape-of-water": {
    "runtime": 123,
    "director": "Guillermo del Toro",
    "genres": [
      "thriller film",
      "fantasy film",
      "drama film",
      "romance film",
      "magic realist film",
      "melodrama"
    ],
    "source": "https://www.wikidata.org/wiki/Q26698156",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q26698156",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2017-dunkirk": {
    "runtime": 106,
    "director": "Christopher Nolan",
    "genres": [
      "drama film",
      "war film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q21935651",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q21935651",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "http://www.bbfc.co.uk/releases/dunkirk-2017",
      "http://www.imdb.com/title/tt5013056/technical"
    ],
    "checked": "2026-10-13"
  },
  "2017-get-out": {
    "runtime": 104,
    "director": "Jordan Peele",
    "genres": [
      "horror film",
      "mystery film",
      "comedy horror",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q25136235",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q25136235",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "http://www.imdb.com/title/tt5052448/technical"
    ],
    "checked": "2026-10-13"
  },
  "2018-green-book": {
    "runtime": 130,
    "director": "Peter Farrelly",
    "genres": [
      "comedy drama",
      "comedy film",
      "biographical film",
      "drama film",
      "LGBTQ-related film",
      "road movie"
    ],
    "source": "https://www.wikidata.org/wiki/Q48673898",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q48673898",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2019-parasite": {
    "runtime": 132,
    "director": "Bong Joon-ho",
    "genres": [
      "comedy drama",
      "black comedy",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q61448040",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q61448040",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://www.imdb.com/title/tt6751668/technical"
    ],
    "checked": "2026-10-13"
  },
  "2019-ford-v-ferrari": {
    "runtime": 152,
    "director": "James Mangold",
    "genres": [
      "biographical film",
      "drama film",
      "action film",
      "sport film"
    ],
    "source": "https://www.wikidata.org/wiki/Q55081822",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q55081822",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2019-1917": {
    "runtime": 119,
    "director": "Sam Mendes",
    "genres": [
      "war film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q62721520",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q62721520",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2019-little-women": {
    "runtime": 134,
    "director": "Greta Gerwig",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q56881140",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q56881140",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://www.boxofficemojo.com/title/tt3281548/?ref_=bo_gr_ti"
    ],
    "checked": "2026-10-13"
  },
  "2019-the-irishman": {
    "runtime": 209,
    "director": "Martin Scorsese",
    "genres": [
      "crime film",
      "drama film",
      "epic film",
      "gangster film",
      "crime drama film",
      "biographical film",
      "historical drama film",
      "crime thriller film",
      "period drama film",
      "thriller film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q29057443",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q29057443",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2019-jojo-rabbit": {
    "runtime": 108,
    "director": "Taika Waititi",
    "genres": [
      "comedy drama",
      "comedy film",
      "drama film",
      "war film"
    ],
    "source": "https://www.wikidata.org/wiki/Q54862508",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q54862508",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2019-once-upon-a-time-in-hollywood": {
    "runtime": 161,
    "director": "Quentin Tarantino",
    "genres": [
      "comedy drama",
      "black comedy film",
      "drama film",
      "crime film",
      "alternate history film",
      "alternate history",
      "comedy film"
    ],
    "source": "https://www.wikidata.org/wiki/Q47300912",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q47300912",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2019-joker": {
    "runtime": 122,
    "director": "Todd Phillips",
    "genres": [
      "crime film",
      "thriller film",
      "drama film",
      "psychological thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q42759035",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q42759035",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2020-nomadland": {
    "runtime": 107,
    "director": "Chloé Zhao",
    "genres": [
      "drama film",
      "road movie"
    ],
    "source": "https://www.wikidata.org/wiki/Q61740820",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q61740820",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2021-coda": {
    "runtime": 111,
    "director": "Siân Héder",
    "genres": [
      "comedy drama",
      "musical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q104686893",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q104686893",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2022-everything-everywhere-all-at-once": {
    "runtime": 139,
    "director": "Dan Kwan, Daniel Scheinert",
    "genres": [
      "science fiction film",
      "action film",
      "comedy drama",
      "absurdist fiction",
      "martial arts film",
      "psychedelic film"
    ],
    "source": "https://www.wikidata.org/wiki/Q83808444",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q83808444",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://movie.douban.com/subject/30314848/",
      "https://www.imdb.com/title/tt6710474/",
      "https://port.hu/adatlap/film/mozi/minden-mindenhol-mindenkor-everything-everywhere-all-at-once/movie-220290",
      "https://tv.apple.com/us/movie/everything-everywhere-all-at-once/umc.cmc.5cxq4yswbsp3apykshwrcb890?at=1000l3V2&ct=trakt_tv&playableId=tvs.sbd.9001%3A1616561026"
    ],
    "checked": "2026-10-13"
  },
  "2022-all-quiet-on-the-western-front": {
    "runtime": 147,
    "director": "Edward Berger",
    "genres": [
      "war film",
      "drama film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q108837349",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q108837349",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2022-elvis": {
    "runtime": 159,
    "director": "Baz Luhrmann",
    "genres": [
      "biographical film",
      "musical film",
      "drama film",
      "gambling film"
    ],
    "source": "https://www.wikidata.org/wiki/Q84362533",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q84362533",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://lsf.go.id/collection/17/"
    ],
    "checked": "2026-10-13"
  },
  "2023-killers-of-the-flower-moon": {
    "runtime": 206,
    "director": "Martin Scorsese",
    "genres": [
      "thriller film",
      "drama film",
      "detective film",
      "Western film",
      "crime film",
      "crime thriller film",
      "crime drama film",
      "epic film"
    ],
    "source": "https://www.wikidata.org/wiki/Q66316924",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q66316924",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2023-barbie": {
    "runtime": 114,
    "director": "Greta Gerwig",
    "genres": [
      "romantic comedy film",
      "adventure film",
      "comedy film",
      "family film",
      "teen film",
      "fantasy film",
      "musical film",
      "romance film",
      "musical comedy",
      "fantasy comedy film",
      "chick flick",
      "satirical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q55436290",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q55436290",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://lsf.go.id/collection/13/"
    ],
    "checked": "2026-10-13"
  },
  "2024-anora": {
    "runtime": 139,
    "director": "Sean Baker",
    "genres": [
      "comedy drama"
    ],
    "source": "https://www.wikidata.org/wiki/Q123185887",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q123185887",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2024-dune-part-two": {
    "runtime": 166,
    "director": "Denis Villeneuve",
    "genres": [
      "science fiction film",
      "action film",
      "adventure film",
      "speculative fiction film",
      "epic film"
    ],
    "source": "https://www.wikidata.org/wiki/Q109228991",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q109228991",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://lsf.go.id/collection/13/"
    ],
    "checked": "2026-10-13"
  },
  "2025-marty-supreme": {
    "runtime": 150,
    "director": "Josh Safdie",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q130118681",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q130118681",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://www.imdb.com/title/tt32916440/technical/"
    ],
    "checked": "2026-10-13"
  },
  "2021-dune": {
    "runtime": 155,
    "director": "Denis Villeneuve",
    "genres": [
      "science fiction film",
      "action film",
      "adventure film",
      "speculative fiction film"
    ],
    "source": "https://www.wikidata.org/wiki/Q60834962",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q60834962",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://lsf.go.id/collection/su/"
    ],
    "checked": "2026-10-13"
  },
  "1954-seven-samurai": {
    "runtime": 207,
    "director": "Akira Kurosawa",
    "genres": [
      "drama film",
      "samurai cinema",
      "epic film",
      "action film",
      "historical drama",
      "adventure film"
    ],
    "source": "https://www.wikidata.org/wiki/Q189540",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q189540",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1989-do-the-right-thing": {
    "runtime": 120,
    "director": "Spike Lee",
    "genres": [
      "hood film",
      "comedy film",
      "independent film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1141252",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1141252",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1944-double-indemnity": {
    "runtime": 107,
    "director": "Billy Wilder",
    "genres": [
      "crime film",
      "flashback film",
      "film noir",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q478209",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q478209",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1941-the-maltese-falcon": {
    "runtime": 101,
    "director": "John Huston",
    "genres": [
      "crime film",
      "mystery film",
      "film noir",
      "treasure hunt film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q221462",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q221462",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1950-sunset-boulevard": {
    "runtime": 110,
    "director": "Billy Wilder",
    "genres": [
      "drama film",
      "flashback film",
      "film noir"
    ],
    "source": "https://www.wikidata.org/wiki/Q193570",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q193570",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1952-high-noon": {
    "runtime": 85,
    "director": "Fred Zinnemann",
    "genres": [
      "Western film",
      "revisionist Western"
    ],
    "source": "https://www.wikidata.org/wiki/Q245208",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q245208",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1961-the-hustler": {
    "runtime": 134,
    "director": "Robert Rossen",
    "genres": [
      "drama film",
      "sport film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1130084",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1130084",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1967-the-graduate": {
    "runtime": 102,
    "director": "Mike Nichols",
    "genres": [
      "comedy drama",
      "coming-of-age film",
      "drama film",
      "romantic comedy film",
      "independent film"
    ],
    "source": "https://www.wikidata.org/wiki/Q217627",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q217627",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1983-the-right-stuff": {
    "runtime": 184,
    "director": "Philip Kaufman",
    "genres": [
      "adventure film",
      "drama film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1197185",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1197185",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1956-the-searchers": {
    "runtime": 119,
    "director": "John Ford",
    "genres": [
      "Western film",
      "drama film",
      "war film"
    ],
    "source": "https://www.wikidata.org/wiki/Q276769",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q276769",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1995-heat": {
    "runtime": 171,
    "director": "Michael Mann",
    "genres": [
      "epic film",
      "thriller film",
      "crime drama film",
      "action film",
      "crime thriller film",
      "crime film",
      "psychological thriller film",
      "neo-noir",
      "drama film",
      "suspense film",
      "heist film",
      "psychological drama film",
      "mystery film",
      "gangster film",
      "adventure film"
    ],
    "source": "https://www.wikidata.org/wiki/Q42198",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q42198",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1955-the-night-of-the-hunter": {
    "runtime": 89,
    "director": "Charles Laughton",
    "genres": [
      "film noir",
      "crime thriller film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1132629",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1132629",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1954-rear-window": {
    "runtime": 112,
    "director": "Alfred Hitchcock",
    "genres": [
      "crime film",
      "mystery film",
      "thriller film",
      "detective film",
      "drama film",
      "crime thriller film",
      "crime drama film",
      "psychological drama film",
      "psychological thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q34414",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q34414",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1934-the-house-of-rothschild": {
    "runtime": 88,
    "director": "Alfred L. Werker, Sidney Lanfield",
    "genres": [
      "biographical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1215836",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1215836",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1940-the-great-dictator": {
    "runtime": 125,
    "director": "Charlie Chaplin",
    "genres": [
      "comedy drama",
      "political satire",
      "war film",
      "anti-war film",
      "drama film",
      "parody film",
      "slapstick",
      "comedy of error",
      "comedy film"
    ],
    "source": "https://www.wikidata.org/wiki/Q109116",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q109116",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1940-the-grapes-of-wrath": {
    "runtime": 128,
    "director": "John Ford",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q676039",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q676039",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1941-citizen-kane": {
    "runtime": 119,
    "director": "Orson Welles",
    "genres": [
      "drama film",
      "fiction film",
      "flashback film",
      "biographical film",
      "mystery film"
    ],
    "source": "https://www.wikidata.org/wiki/Q24815",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q24815",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1942-wake-island": {
    "runtime": 87,
    "director": "John Farrow",
    "genres": [
      "propaganda film",
      "action film",
      "war film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1581633",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1581633",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1985-witness": {
    "runtime": 112,
    "director": "Peter Weir",
    "genres": [
      "drama film",
      "crime film",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q488041",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q488041",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1946-the-yearling": {
    "runtime": 128,
    "director": "Clarence Brown",
    "genres": [
      "children's film",
      "drama film",
      "family film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1217612",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1217612",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1944-henry-v": {
    "runtime": 143,
    "director": "Laurence Olivier",
    "genres": [
      "drama film",
      "historical film",
      "medieval film"
    ],
    "source": "https://www.wikidata.org/wiki/Q268055",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q268055",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1948-the-treasure-of-the-sierra-madre": {
    "runtime": 126,
    "director": "John Huston",
    "genres": [
      "treasure hunt film",
      "drama film",
      "Western film",
      "contemporary Western film"
    ],
    "source": "https://www.wikidata.org/wiki/Q251559",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q251559",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1951-a-streetcar-named-desire": {
    "runtime": 120,
    "director": "Elia Kazan",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q212129",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q212129",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1952-ivanhoe": {
    "runtime": 106,
    "director": "Richard Thorpe",
    "genres": [
      "swashbuckler film",
      "medieval film"
    ],
    "source": "https://www.wikidata.org/wiki/Q735410",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q735410",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1956-the-king-and-i": {
    "runtime": 133,
    "director": "Walter Lang",
    "genres": [
      "romance film",
      "musical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q27149",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q27149",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1958-cat-on-a-hot-tin-roof": {
    "runtime": 104,
    "director": "Richard Brooks",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q713979",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q713979",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1960-the-sundowners": {
    "runtime": 141,
    "director": "Fred Zinnemann",
    "genres": [
      "adventure film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1198545",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1198545",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1962-how-the-west-was-won": {
    "runtime": 162,
    "director": "John Ford, Henry Hathaway, George Marshall",
    "genres": [
      "Western film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q162518",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q162518",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1964-mary-poppins": {
    "runtime": 140,
    "director": "Robert Stevenson",
    "genres": [
      "fantasy film",
      "musical film",
      "comedy film",
      "family film",
      "live-action/animated film"
    ],
    "source": "https://www.wikidata.org/wiki/Q209170",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q209170",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1969-butch-cassidy-and-the-sundance-kid": {
    "runtime": 105,
    "director": "George Roy Hill",
    "genres": [
      "buddy film",
      "comedy drama",
      "Western film",
      "biographical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q232000",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q232000",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1970-airport": {
    "runtime": 137,
    "director": "George Seaton",
    "genres": [
      "disaster film"
    ],
    "source": "https://www.wikidata.org/wiki/Q409022",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q409022",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1971-a-clockwork-orange": {
    "runtime": 136,
    "director": "Stanley Kubrick",
    "genres": [
      "drama film",
      "crime film",
      "dystopian film",
      "thriller film",
      "prison film",
      "mystery film",
      "speculative fiction film",
      "science fiction film",
      "arthouse science fiction film",
      "black comedy film",
      "crime drama film",
      "crime thriller film",
      "action film",
      "satirical film",
      "crime comedy film",
      "exploitation film",
      "comedy drama"
    ],
    "source": "https://www.wikidata.org/wiki/Q181086",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q181086",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "http://www.bbfc.co.uk/releases/clockwork-orange-1970-3"
    ],
    "checked": "2026-10-13"
  },
  "1971-fiddler-on-the-roof": {
    "runtime": 181,
    "director": "Norman Jewison",
    "genres": [
      "comedy drama",
      "musical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q934036",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q934036",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1979-all-that-jazz": {
    "runtime": 123,
    "director": "Bob Fosse",
    "genres": [
      "musical film",
      "flashback film",
      "drama film",
      "biographical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1353441",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1353441",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1980-the-elephant-man": {
    "runtime": 124,
    "director": "David Lynch",
    "genres": [
      "biographical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q272860",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q272860",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1980-coal-miner-s-daughter": {
    "runtime": 125,
    "director": "Michael Apted",
    "genres": [
      "biographical film",
      "musical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1285467",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1285467",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1996-jerry-maguire": {
    "runtime": 139,
    "director": "Cameron Crowe",
    "genres": [
      "romance film",
      "comedy film",
      "drama film",
      "American football film",
      "sport film"
    ],
    "source": "https://www.wikidata.org/wiki/Q329131",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q329131",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1999-the-green-mile": {
    "runtime": 189,
    "director": "Frank Darabont",
    "genres": [
      "drama film",
      "flashback film",
      "fantasy film",
      "prison film",
      "magic realist film"
    ],
    "source": "https://www.wikidata.org/wiki/Q208263",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q208263",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2009-district-9": {
    "runtime": 112,
    "director": "Neill Blomkamp",
    "genres": [
      "thriller film",
      "science fiction film",
      "action film",
      "drama film",
      "dystopian film",
      "biopunk",
      "adventure film",
      "suspense film",
      "horror film",
      "independent film",
      "action thriller",
      "science fiction action film",
      "science fiction horror film",
      "mockumentary"
    ],
    "source": "https://www.wikidata.org/wiki/Q201819",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q201819",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2010-127-hours": {
    "runtime": 94,
    "director": "Danny Boyle",
    "genres": [
      "docudrama",
      "drama film",
      "biographical film",
      "survival film",
      "independent film"
    ],
    "source": "https://www.wikidata.org/wiki/Q174371",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q174371",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2010-the-social-network": {
    "runtime": 121,
    "director": "David Fincher",
    "genres": [
      "biographical film",
      "trial film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q185888",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q185888",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1999-the-insider": {
    "runtime": 157,
    "director": "Michael Mann",
    "genres": [
      "biographical film",
      "thriller film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q463832",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q463832",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2011-moneyball": {
    "runtime": 133,
    "director": "Bennett Miller",
    "genres": [
      "biographical film",
      "sport film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q221820",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q221820",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2013-dallas-buyers-club": {
    "runtime": 117,
    "director": "Jean-Marc Vallée",
    "genres": [
      "drama film",
      "biographical film",
      "LGBTQ-related film"
    ],
    "source": "https://www.wikidata.org/wiki/Q3520498",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q3520498",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2013-her": {
    "runtime": 126,
    "director": "Spike Jonze",
    "genres": [
      "science fiction film",
      "drama film",
      "romantic comedy film",
      "comedy film",
      "arthouse science fiction film"
    ],
    "source": "https://www.wikidata.org/wiki/Q788822",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q788822",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "http://www.imdb.com/title/tt1798709/technical"
    ],
    "checked": "2026-10-13"
  },
  "2013-captain-phillips": {
    "runtime": 134,
    "director": "Paul Greengrass",
    "genres": [
      "action film",
      "thriller film",
      "biographical film",
      "survival film",
      "drama film",
      "pirate film"
    ],
    "source": "https://www.wikidata.org/wiki/Q2937646",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q2937646",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2014-the-grand-budapest-hotel": {
    "runtime": 99,
    "director": "Wes Anderson",
    "genres": [
      "comedy film",
      "drama film",
      "adventure film",
      "romance film",
      "crime film",
      "tragicomedy"
    ],
    "source": "https://www.wikidata.org/wiki/Q3521099",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q3521099",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "http://www.imdb.com/title/tt2278388/technical"
    ],
    "checked": "2026-10-13"
  },
  "2005-munich": {
    "runtime": 157,
    "director": "Steven Spielberg",
    "genres": [
      "spy film",
      "drama film",
      "political thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q152456",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q152456",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2016-la-la-land": {
    "runtime": 128,
    "director": "Damien Chazelle",
    "genres": [
      "romance film",
      "comedy drama",
      "comedy film",
      "musical film",
      "drama film",
      "dance film"
    ],
    "source": "https://www.wikidata.org/wiki/Q20856802",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q20856802",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2018-blackkklansman": {
    "runtime": 135,
    "director": "Spike Lee",
    "genres": [
      "biographical film",
      "crime film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q43370948",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q43370948",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2014-gone-girl": {
    "runtime": 149,
    "director": "David Fincher",
    "genres": [
      "crime thriller film",
      "crime film",
      "drama film",
      "mystery film",
      "detective film",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q14920425",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q14920425",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "http://www.imdb.com/title/tt2267998/technical"
    ],
    "checked": "2026-10-13"
  },
  "2021-nightmare-alley": {
    "runtime": 150,
    "director": "Guillermo del Toro",
    "genres": [
      "thriller film",
      "drama film",
      "horror film",
      "neo-noir",
      "psychological horror film",
      "psychological thriller film",
      "psychological drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q82430214",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q82430214",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2023-maestro": {
    "runtime": 129,
    "director": "Bradley Cooper",
    "genres": [
      "biographical film",
      "drama film",
      "LGBTQ-related film",
      "romance film"
    ],
    "source": "https://www.wikidata.org/wiki/Q111907282",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q111907282",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2014-american-sniper": {
    "runtime": 132,
    "director": "Clint Eastwood",
    "genres": [
      "action film",
      "war film",
      "biographical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q16970789",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q16970789",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1997-boogie-nights": {
    "runtime": 149,
    "director": "Paul Thomas Anderson",
    "genres": [
      "drama film",
      "buddy film"
    ],
    "source": "https://www.wikidata.org/wiki/Q291170",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q291170",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2025-f1": {
    "runtime": 155,
    "director": "Joseph Kosinski",
    "genres": [
      "action film",
      "sport film"
    ],
    "source": "https://www.wikidata.org/wiki/Q114246242",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q114246242",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1993-true-romance": {
    "runtime": 120,
    "director": "Tony Scott",
    "genres": [
      "crime film",
      "action film",
      "drama film",
      "romance film",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1127709",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1127709",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2025-sinners": {
    "runtime": 137,
    "director": "Ryan Coogler",
    "genres": [
      "vampire film",
      "drama film",
      "fantasy film",
      "thriller film",
      "horror film"
    ],
    "source": "https://www.wikidata.org/wiki/Q125473145",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q125473145",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1943-the-ox-bow-incident": {
    "runtime": 77,
    "director": "William A. Wellman, James Tinling",
    "genres": [
      "Western film",
      "drama film",
      "revisionist Western"
    ],
    "source": "https://www.wikidata.org/wiki/Q1426269",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1426269",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1979-the-warriors": {
    "runtime": 93,
    "director": "Walter Hill",
    "genres": [
      "action film",
      "thriller film",
      "hood film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1122971",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1122971",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1982-tootsie": {
    "runtime": 112,
    "director": "Sydney Pollack",
    "genres": [
      "romantic comedy film",
      "comedy drama",
      "LGBTQ-related film",
      "satirical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q221249",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q221249",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1982-the-verdict": {
    "runtime": 129,
    "director": "Sidney Lumet",
    "genres": [
      "trial film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q679373",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q679373",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1986-the-mission": {
    "runtime": 126,
    "director": "Roland Joffé",
    "genres": [
      "drama film",
      "historical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q302490",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q302490",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1988-mississippi-burning": {
    "runtime": 127,
    "director": "Alan Parker",
    "genres": [
      "drama film",
      "crime film"
    ],
    "source": "https://www.wikidata.org/wiki/Q918367",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q918367",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1988-die-hard": {
    "runtime": 131,
    "director": "John McTiernan",
    "genres": [
      "action film",
      "action thriller",
      "Christmas film",
      "heist film"
    ],
    "source": "https://www.wikidata.org/wiki/Q105598",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q105598",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1989-dead-poets-society": {
    "runtime": 123,
    "director": "Peter Weir",
    "genres": [
      "coming-of-age film",
      "drama film",
      "teen film"
    ],
    "source": "https://www.wikidata.org/wiki/Q106316",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q106316",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1991-beauty-and-the-beast": {
    "runtime": 84,
    "director": "Gary Trousdale, Kirk Wise",
    "genres": [
      "romance film",
      "musical film",
      "comedy drama",
      "cinematic fairy tale",
      "romantic fantasy"
    ],
    "source": "https://www.wikidata.org/wiki/Q179673",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q179673",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1992-scent-of-a-woman": {
    "runtime": 150,
    "director": "Martin Brest",
    "genres": [
      "drama film",
      "coming-of-age film"
    ],
    "source": "https://www.wikidata.org/wiki/Q321561",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q321561",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1992-the-crying-game": {
    "runtime": 107,
    "director": "Neil Jordan",
    "genres": [
      "drama film",
      "romance film",
      "psychological thriller film",
      "crime film",
      "transgender film",
      "political thriller film",
      "LGBTQ-related film"
    ],
    "source": "https://www.wikidata.org/wiki/Q182727",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q182727",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1993-in-the-name-of-the-father": {
    "runtime": 133,
    "director": "Jim Sheridan",
    "genres": [
      "biographical film",
      "prison film",
      "trial film",
      "political drama",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q304074",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q304074",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1994-quiz-show": {
    "runtime": 133,
    "director": "Robert Redford",
    "genres": [
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q651722",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q651722",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1995-se7en": {
    "runtime": 127,
    "director": "David Fincher",
    "genres": [
      "crime film",
      "mystery film",
      "buddy cop film",
      "drama film",
      "thriller film",
      "detective film",
      "suspense film",
      "psychological horror film",
      "crime drama film",
      "action film",
      "crime thriller film",
      "psychological thriller film",
      "psychological drama film",
      "independent film",
      "chase film",
      "police procedural film",
      "horror film",
      "neo-noir"
    ],
    "source": "https://www.wikidata.org/wiki/Q190908",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q190908",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "1997-as-good-as-it-gets": {
    "runtime": 133,
    "director": "James L. Brooks",
    "genres": [
      "romantic comedy film",
      "LGBTQ-related film",
      "comedy drama",
      "comedy film",
      "romance film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q221594",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q221594",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2000-traffic": {
    "runtime": 141,
    "director": "Steven Soderbergh",
    "genres": [
      "crime film",
      "drama film",
      "political thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q142292",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q142292",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2002-the-pianist": {
    "runtime": 149,
    "director": "Roman Polanski",
    "genres": [
      "musical film",
      "drama film",
      "biographical film",
      "historical film",
      "war film"
    ],
    "source": "https://www.wikidata.org/wiki/Q150804",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q150804",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://www.bbfc.co.uk/release/the-pianist-q29sbgvjdglvbjpwwc0zmzq1nta"
    ],
    "checked": "2026-10-13"
  },
  "2002-catch-me-if-you-can": {
    "runtime": 135,
    "director": "Steven Spielberg",
    "genres": [
      "heist film",
      "crime film",
      "comedy film",
      "drama film",
      "biographical film"
    ],
    "source": "https://www.wikidata.org/wiki/Q208108",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q208108",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2003-lost-in-translation": {
    "runtime": 97,
    "director": "Sofia Coppola",
    "genres": [
      "romantic comedy film",
      "independent film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q107270",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q107270",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2003-mystic-river": {
    "runtime": 137,
    "director": "Clint Eastwood",
    "genres": [
      "mystery film",
      "crime thriller film",
      "drama film",
      "neo-noir",
      "psychological thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q221586",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q221586",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2007-michael-clayton": {
    "runtime": 119,
    "director": "Tony Gilroy",
    "genres": [
      "thriller film",
      "drama film",
      "mystery film",
      "legal thriller"
    ],
    "source": "https://www.wikidata.org/wiki/Q694140",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q694140",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2008-frost-nixon": {
    "runtime": 122,
    "director": "Ron Howard",
    "genres": [
      "biographical film",
      "drama film"
    ],
    "source": "https://www.wikidata.org/wiki/Q691672",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q691672",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  },
  "2008-the-dark-knight": {
    "runtime": 153,
    "director": "Christopher Nolan",
    "genres": [
      "action film",
      "neo-noir",
      "crime thriller film",
      "crime film",
      "superhero film",
      "drama film",
      "thriller film"
    ],
    "source": "https://www.wikidata.org/wiki/Q163872",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q163872",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [
      "https://www.vooplay.tv/movie-detail.php?vid=155"
    ],
    "checked": "2026-10-13"
  },
  "2013-the-wolf-of-wall-street": {
    "runtime": 180,
    "director": "Martin Scorsese",
    "genres": [
      "black comedy film",
      "biographical film",
      "crime film",
      "drama film",
      "crime drama film",
      "comedy film",
      "comedy drama",
      "epic film"
    ],
    "source": "https://www.wikidata.org/wiki/Q1392744",
    "sources": [
      {
        "label": "Wikidata · CC0 film facts",
        "url": "https://www.wikidata.org/wiki/Q1392744",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director",
          "genres"
        ]
      }
    ],
    "references": [],
    "checked": "2026-10-13"
  }
};
const PRIMARY = {
  "1971-the-french-connection": {
    "runtime": 104,
    "director": "William Friedkin",
    "source": "https://www.bfi.org.uk/film/fa40fdbc-a163-5f0a-921e-6868bcbacc7b/the-french-connection",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/fa40fdbc-a163-5f0a-921e-6868bcbacc7b/the-french-connection",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Tense",
      "Dark"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1972-cabaret": {
    "runtime": 123,
    "director": "Bob Fosse",
    "source": "https://www.bfi.org.uk/film/0a962596-ec15-50be-bf96-4fe6a9318bf0/cabaret",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/0a962596-ec15-50be-bf96-4fe6a9318bf0/cabaret",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Dark",
      "Reflective"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1972-deliverance": {
    "runtime": 109,
    "director": "John Boorman",
    "source": "https://www.bfi.org.uk/film/79f2751c-ef83-51cb-9771-7d3076f415c1/deliverance",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/79f2751c-ef83-51cb-9771-7d3076f415c1/deliverance",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Tense",
      "Dark"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1964-dr-strangelove": {
    "runtime": 94,
    "director": "Stanley Kubrick",
    "source": "https://www.bfi.org.uk/film/0f172a91-5ac3-52fc-8622-bf0ce1cce435/dr-strangelove-or-how-i-learned-to-stop-worrying-and-love-the-bomb",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/0f172a91-5ac3-52fc-8622-bf0ce1cce435/dr-strangelove-or-how-i-learned-to-stop-worrying-and-love-the-bomb",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Funny",
      "Dark"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1975-one-flew-over-the-cuckoo-s-nest": {
    "runtime": 134,
    "director": "Milos Forman",
    "source": "https://www.bfi.org.uk/film/a7ab4976-a256-53a0-9019-a6aaeace068f/one-flew-over-the-cuckoos-nest",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/a7ab4976-a256-53a0-9019-a6aaeace068f/one-flew-over-the-cuckoos-nest",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Reflective",
      "Dark"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1974-the-godfather-part-ii": {
    "runtime": 202,
    "director": "Francis Ford Coppola",
    "source": "https://www.filmlinc.org/nyff2025/films/the-godfather-part-ii/",
    "sources": [
      {
        "label": "Film at Lincoln Center",
        "url": "https://www.filmlinc.org/nyff2025/films/the-godfather-part-ii/",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Epic",
      "Dark"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1974-chinatown": {
    "runtime": 131,
    "director": "Roman Polanski",
    "source": "https://www.bfi.org.uk/film/991533a0-fad3-5d39-a5e2-9c77ba46d83f/chinatown",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/991533a0-fad3-5d39-a5e2-9c77ba46d83f/chinatown",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Tense",
      "Dark"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1975-barry-lyndon": {
    "runtime": 185,
    "source": "https://www.criterion.com/films/29008-barry-lyndon",
    "sources": [
      {
        "label": "The Criterion Collection",
        "url": "https://www.criterion.com/films/29008-barry-lyndon",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Epic",
      "Reflective"
    ],
    "moodProvenance": "Kuvert editorial suggestion",
    "director": "Stanley Kubrick"
  },
  "1978-the-deer-hunter": {
    "runtime": 182,
    "director": "Michael Cimino",
    "source": "https://www.bfi.org.uk/film/351e0eb6-936d-516e-9f2a-8b0eed3b5ffc/the-deer-hunter",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/351e0eb6-936d-516e-9f2a-8b0eed3b5ffc/the-deer-hunter",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Dark",
      "Reflective"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1979-apocalypse-now": {
    "runtime": 183,
    "director": "Francis Ford Coppola",
    "source": "https://www.filmlinc.org/films/apocalypse-now/",
    "sources": [
      {
        "label": "Film at Lincoln Center",
        "url": "https://www.filmlinc.org/films/apocalypse-now/",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Film at Lincoln Center's 183-minute screening presentation. The original theatrical, Redux and Final Cut versions differ substantially; check your copy before planning.",
      "sv": "Film at Lincoln Centers 183 minuter långa visningsversion. Originalversionen, Redux och Final Cut skiljer sig betydligt; kontrollera din utgåva när du planerar."
    },
    "moods": [
      "Dark",
      "Epic"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1981-chariots-of-fire": {
    "runtime": 123,
    "director": "Hugh Hudson",
    "source": "https://www.bfi.org.uk/film/602dd8c2-792b-5470-9735-ed7083c9bfa1/chariots-of-fire",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/602dd8c2-792b-5470-9735-ed7083c9bfa1/chariots-of-fire",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Uplifting",
      "Reflective"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1984-amadeus": {
    "runtime": 160,
    "director": "Milos Forman",
    "source": "https://www.bfi.org.uk/film/c65f9652-92a9-5063-a417-6013aef0f741/amadeus",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/c65f9652-92a9-5063-a417-6013aef0f741/amadeus",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Funny",
      "Reflective"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1982-gandhi": {
    "runtime": 188,
    "director": "Richard Attenborough",
    "source": "https://www.bfi.org.uk/film/0d8de71d-68e9-5682-a0b0-cc6d9be9bba8/gandhi",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/0d8de71d-68e9-5682-a0b0-cc6d9be9bba8/gandhi",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Epic",
      "Reflective"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "2001-the-lord-of-the-rings-the-fellowship-of-the-ring": {
    "runtime": 178,
    "director": "Peter Jackson",
    "source": "https://www.bfi.org.uk/film/52b45f51-7f3b-56e6-991d-eae1443c0e77/the-lord-of-the-rings-the-fellowship-of-the-ring",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/52b45f51-7f3b-56e6-991d-eae1443c0e77/the-lord-of-the-rings-the-fellowship-of-the-ring",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Adventurous",
      "Epic"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1986-platoon": {
    "runtime": 120,
    "director": "Oliver Stone",
    "source": "https://www.bfi.org.uk/film/fdc3bce7-5784-5455-80ee-3ca64a8504aa/platoon",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/fdc3bce7-5784-5455-80ee-3ca64a8504aa/platoon",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Dark",
      "Tense"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1985-out-of-africa": {
    "runtime": 162,
    "director": "Sydney Pollack",
    "source": "https://www.bfi.org.uk/film/4ed1a6bf-941c-50b8-ac43-5209b243e026/out-of-africa",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/4ed1a6bf-941c-50b8-ac43-5209b243e026/out-of-africa",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Romantic",
      "Epic"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "2002-the-lord-of-the-rings-the-two-towers": {
    "runtime": 179,
    "director": "Peter Jackson",
    "source": "https://www.bfi.org.uk/film/83919a25-6bb5-5866-bef4-3249172e8b9a/the-lord-of-the-rings-the-two-towers",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/83919a25-6bb5-5866-bef4-3249172e8b9a/the-lord-of-the-rings-the-two-towers",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Adventurous",
      "Epic"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "2003-the-lord-of-the-rings-the-return-of-the-king": {
    "runtime": 201,
    "director": "Peter Jackson",
    "source": "https://www.bfi.org.uk/film/de658a5d-ddbc-589c-95d0-08dd1af9635f/the-lord-of-the-rings-the-return-of-the-king",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/de658a5d-ddbc-589c-95d0-08dd1af9635f/the-lord-of-the-rings-the-return-of-the-king",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Adventurous",
      "Epic"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "2020-judas-and-the-black-messiah": {
    "runtime": 126,
    "director": "Shaka King",
    "source": "https://www.bfi.org.uk/film/e737e361-c37e-51c0-a654-1fb38f4efaa8/judas-and-the-black-messiah",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/e737e361-c37e-51c0-a654-1fb38f4efaa8/judas-and-the-black-messiah",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Tense",
      "Reflective"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1966-the-good-the-bad-and-the-ugly": {
    "runtime": 177,
    "director": "Sergio Leone",
    "source": "https://www.bfi.org.uk/film/48f84a16-0530-544f-b591-0d564249dd43/the-good-the-bad-and-the-ugly",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/48f84a16-0530-544f-b591-0d564249dd43/the-good-the-bad-and-the-ugly",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Adventurous",
      "Tense"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "2025-one-battle-after-another": {
    "runtime": 162,
    "director": "Paul Thomas Anderson",
    "source": "https://www.filmlinc.org/films/one-battle-after-another/",
    "sources": [
      {
        "label": "Film at Lincoln Center",
        "url": "https://www.filmlinc.org/films/one-battle-after-another/",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Tense",
      "Adventurous"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1981-blow-out": {
    "runtime": 108,
    "source": "https://www.criterion.com/films/27561-blow-out",
    "sources": [
      {
        "label": "The Criterion Collection",
        "url": "https://www.criterion.com/films/27561-blow-out",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Tense",
      "Dark"
    ],
    "moodProvenance": "Kuvert editorial suggestion",
    "director": "Brian De Palma"
  },
  "1968-once-upon-a-time-in-the-west": {
    "runtime": 168,
    "director": "Sergio Leone",
    "source": "https://www.bfi.org.uk/film/f3d8c1dc-2761-5fdc-ab54-9b054daec0ee/once-upon-a-time-in-the-west",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/f3d8c1dc-2761-5fdc-ab54-9b054daec0ee/once-upon-a-time-in-the-west",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Epic",
      "Reflective"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1983-scarface": {
    "runtime": 170,
    "director": "Brian De Palma",
    "source": "https://www.bfi.org.uk/film/dd5006da-3260-5b6d-81ed-ceda31aa9880/scarface",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/dd5006da-3260-5b6d-81ed-ceda31aa9880/scarface",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Dark",
      "Tense"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1984-once-upon-a-time-in-america": {
    "runtime": 229,
    "director": "Sergio Leone",
    "source": "https://www.filmlinc.org/films/once-upon-a-time-in-america/",
    "sources": [
      {
        "label": "Film at Lincoln Center",
        "url": "https://www.filmlinc.org/films/once-upon-a-time-in-america/",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.",
      "sv": "Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig."
    },
    "moods": [
      "Epic",
      "Dark"
    ],
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1949-all-the-king-s-men": {
    "runtime": 110,
    "director": "Robert Rossen",
    "moods": [
      "Reflective"
    ],
    "source": "https://parkcircus.com/film/106775-All-The-King%E2%80%99s-Men",
    "sources": [
      {
        "label": "Park Circus distribution record",
        "url": "https://parkcircus.com/film/106775-All-The-King%E2%80%99s-Men",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1977-annie-hall": {
    "runtime": 93,
    "director": "Woody Allen",
    "moods": [
      "Funny",
      "Romantic"
    ],
    "source": "https://www.bfi.org.uk/film/37565e9a-6847-5a43-abea-6659ef2cce22/annie-hall",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/37565e9a-6847-5a43-abea-6659ef2cce22/annie-hall",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1983-terms-of-endearment": {
    "runtime": 133,
    "director": "James L. Brooks",
    "moods": [
      "Reflective",
      "Funny"
    ],
    "source": "https://parkcircus.com/film/109675-Terms-Of-Endearment",
    "sources": [
      {
        "label": "Park Circus distribution record",
        "url": "https://parkcircus.com/film/109675-Terms-Of-Endearment",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1990-dances-with-wolves": {
    "runtime": 181,
    "director": "Kevin Costner",
    "moods": [
      "Epic",
      "Reflective"
    ],
    "source": "https://parkcircus.com/film/108081-Dances-With-Wolves",
    "sources": [
      {
        "label": "Park Circus distribution record",
        "url": "https://parkcircus.com/film/108081-Dances-With-Wolves",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "2005-crash": {
    "runtime": 112,
    "director": "Paul Haggis",
    "moods": [
      "Reflective"
    ],
    "source": "https://www.bfi.org.uk/film/af9d81fc-bb88-51fa-a62d-dd7e4aef4c18/crash",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/film/af9d81fc-bb88-51fa-a62d-dd7e4aef4c18/crash",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "2022-top-gun-maverick": {
    "runtime": 130,
    "director": "Joseph Kosinski",
    "moods": [
      "Adventurous",
      "Tense"
    ],
    "source": "https://www.paramount.de/top-gun-maverick",
    "sources": [
      {
        "label": "Paramount Pictures",
        "url": "https://www.paramount.de/top-gun-maverick",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "2023-oppenheimer": {
    "runtime": 180,
    "director": "Christopher Nolan",
    "moods": [
      "Reflective",
      "Tense"
    ],
    "source": "https://filmsandfestivals.britishcouncil.org/projects/oppenheimer",
    "sources": [
      {
        "label": "British Council UK Films Database",
        "url": "https://filmsandfestivals.britishcouncil.org/projects/oppenheimer",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1981-das-boot": {
    "runtime": 149,
    "director": "Wolfgang Petersen",
    "moods": [
      "Tense",
      "Dark"
    ],
    "source": "https://www.bfi.org.uk/sight-and-sound/lists/remake-remodel-directors-cuts-alternative-film-versions",
    "sources": [
      {
        "label": "British Film Institute",
        "url": "https://www.bfi.org.uk/sight-and-sound/lists/remake-remodel-directors-cuts-alternative-film-versions",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Original 149-minute theatrical cut, documented by BFI. The director's cut and television version are substantially longer.",
      "sv": "Den ursprungliga bioversionen på 149 minuter, dokumenterad av BFI. Director's cut och tv-versionen är betydligt längre."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1973-american-graffiti": {
    "runtime": 113,
    "director": "George Lucas",
    "moods": [
      "Funny",
      "Reflective"
    ],
    "source": "https://parkcircus.com/film/114361-American-Graffiti",
    "sources": [
      {
        "label": "Park Circus distribution record",
        "url": "https://parkcircus.com/film/114361-American-Graffiti",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1984-the-killing-fields": {
    "runtime": 141,
    "director": "Roland Joffé",
    "moods": [
      "Dark",
      "Reflective"
    ],
    "source": "https://parkcircus.com/film/112388-The-Killing-Fields",
    "sources": [
      {
        "label": "Park Circus distribution record",
        "url": "https://parkcircus.com/film/112388-The-Killing-Fields",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "1987-fatal-attraction": {
    "runtime": 119,
    "director": "Adrian Lyne",
    "moods": [
      "Tense",
      "Dark"
    ],
    "source": "https://parkcircus.com/film/109839-Fatal-Attraction",
    "sources": [
      {
        "label": "Park Circus distribution record",
        "url": "https://parkcircus.com/film/109839-Fatal-Attraction",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "2009-the-blind-side": {
    "runtime": 129,
    "director": "John Lee Hancock",
    "moods": [
      "Reflective",
      "Uplifting"
    ],
    "source": "https://parkcircus.com/film/118054-The-Blind-Side",
    "sources": [
      {
        "label": "Park Circus distribution record",
        "url": "https://parkcircus.com/film/118054-The-Blind-Side",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  },
  "2015-the-hateful-eight": {
    "runtime": 168,
    "director": "Quentin Tarantino",
    "moods": [
      "Dark",
      "Tense"
    ],
    "source": "https://www.swank.com/movie-events/details/12230-the-hateful-eight",
    "sources": [
      {
        "label": "Swank Motion Pictures",
        "url": "https://www.swank.com/movie-events/details/12230-the-hateful-eight",
        "checked": "2026-10-13",
        "fields": [
          "runtime",
          "director"
        ]
      }
    ],
    "editionNotes": {
      "en": "Duration of the presentation listed by the linked source; other editions may differ.",
      "sv": "Speltid för den version som anges av källan; andra utgåvor kan skilja sig."
    },
    "moodProvenance": "Kuvert editorial suggestion"
  }
};

// Mood suggestions are Kuvert editorial interpretations of genre, not factual ratings.
function suggestMoods(genres = []) {
  const text = genres.join(' ').toLowerCase(), tags = [];
  if (/comedy|satire|parody/.test(text)) tags.push('Funny');
  if (/romance|romantic/.test(text)) tags.push('Romantic');
  if (/adventure|action|western|fantasy/.test(text)) tags.push('Adventurous');
  if (/thriller|suspense|crime|horror/.test(text)) tags.push('Tense');
  if (/horror|noir/.test(text)) tags.push('Dark');
  if (/epic/.test(text)) tags.push('Epic');
  if (/drama|documentary|biograph/.test(text) || !tags.length) tags.push('Reflective');
  return [...new Set(tags)].slice(0,3);
}
export const BASIC_METADATA = Object.fromEntries(Object.entries(FACTS).map(([id,value]) => [id,{...value,moods:suggestMoods(value.genres),moodProvenance:'Kuvert genre interpretation',editionNotes:{en:'Source-listed duration; restored, extended and regional presentations may differ.',sv:'Speltid enligt källan; restaurerade, förlängda och regionala versioner kan skilja sig.'}}]));
Object.assign(BASIC_METADATA, PRIMARY, CURATED_METADATA);
export const MISSING_RUNTIME_IDS = FILMS.filter(f => !BASIC_METADATA[f.id]?.runtime).map(f => f.id);
export const METADATA_PROVENANCE = {
  checked:'2026-10-13', factsLicense:'Wikidata structured facts: CC0', licenseSource:'https://www.wikidata.org/wiki/Wikidata:Licensing',
  coreFilms:FILMS.length, coreRuntimeCoverage:FILMS.length-MISSING_RUNTIME_IDS.length, missingRuntimeIds:MISSING_RUNTIME_IDS,
  method:'Film identity matched by title and release year; one unambiguous duration or an explicitly sourced presentation. Curated records override general facts.',
  moods:'Kuvert editorial suggestions derived from source genres; curated-film tags are hand-selected.',
  artwork:'No poster artwork is included or inferred in this metadata file.',
};
