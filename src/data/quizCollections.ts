import { QuizCollection, Song } from "../types";
import { COUNTRIES } from "./countries";
import { ALL_SONGS } from "./moroccanSongs";
import { GENRE_DEFINITIONS, slugifyChallenge } from "../utils/challengeCatalog";

const CURATED_QUIZ_COLLECTIONS: QuizCollection[] = [
  {
    "id": "spotify-todays-top-hits",
    "title": "Today's Top Hits (Official Spotify)",
    "description": "The world's biggest playlist featuring global chart-dominators from The Weeknd, Dua Lipa, Harry Styles, Taylor Swift and more.",
    "category": "Spotify Official",
    "countryCode": "GLOBAL",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 8,
    "songIds": [
      "us-blinding-lights",
      "us-as-it-was",
      "us-levitating",
      "us-cruel-summer",
      "us-flowers",
      "us-bad-guy",
      "gb-shape-of-you",
      "gb-one-kiss"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Today's Top Hits",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Today's%20Top%20Hits",
    "tags": [
      "Global",
      "Official Spotify",
      "Pop",
      "Top 50"
    ]
  },
  {
    "id": "global-dance-club",
    "title": "Global Club & Festival Anthems",
    "description": "High-energy festival and radio club bangers from David Guetta, Daft Punk, Calvin Harris and Robin Schulz.",
    "category": "Electronic",
    "countryCode": "GLOBAL",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 6,
    "songIds": [
      "fr-titanium",
      "fr-one-more-time",
      "gb-one-kiss",
      "de-sugar",
      "it-piece-of-your-heart",
      "it-blue"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Dance Party",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Dance%20Party",
    "tags": [
      "Dance",
      "EDM",
      "Club",
      "Party"
    ]
  },
  {
    "id": "spotify-rapcaviar",
    "title": "RapCaviar (Official Spotify US)",
    "description": "The premier US hip-hop playlist with hard-hitting trap, lyrical masterclasses, and Drake, Kendrick Lamar & Eminem.",
    "category": "Spotify Official",
    "countryCode": "US",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    "difficulty": "MEDIUM",
    "songsCount": 5,
    "songIds": [
      "us-gods-plan",
      "us-humble",
      "us-sicko-mode",
      "us-lose-yourself",
      "us-circles"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • RapCaviar",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/RapCaviar",
    "tags": [
      "US Hip-Hop",
      "Official Spotify",
      "Trap",
      "RapCaviar"
    ]
  },
  {
    "id": "us-billboard-mega-hits",
    "title": "Billboard Hot 100 All-Stars",
    "description": "Historic chart champions and billion-stream pop anthems from Taylor Swift, Miley Cyrus, Bruno Mars and Billie Eilish.",
    "category": "Pop",
    "countryCode": "US",
    "coverImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 6,
    "songIds": [
      "us-blinding-lights",
      "us-cruel-summer",
      "us-flowers",
      "us-bad-guy",
      "us-uptown-funk",
      "us-circles"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Billboard Hot 100",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Billboard%20Hot%20100",
    "tags": [
      "Billboard",
      "Hot 100",
      "US Pop",
      "Hits"
    ]
  },
  {
    "id": "spotify-hot-hits-uk",
    "title": "Hot Hits UK (Official Spotify)",
    "description": "The United Kingdom's official top chart playlist: Britpop, UK Drill, and anthems from Adele, Ed Sheeran and Central Cee.",
    "category": "Spotify Official",
    "countryCode": "GB",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 8,
    "songIds": [
      "gb-shape-of-you",
      "gb-rolling-in-the-deep",
      "gb-central-cee-doja",
      "gb-sprinter",
      "gb-viva-la-vida",
      "gb-wonderwall",
      "gb-bohemian-rhapsody",
      "gb-one-kiss"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Hot Hits UK",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Hot%20Hits%20UK",
    "tags": [
      "UK Hits",
      "Official Spotify",
      "Britpop",
      "UK Drill"
    ]
  },
  {
    "id": "spotify-hits-du-moment-fr",
    "title": "Hits du Moment (Official Spotify France)",
    "description": "France's most streamed tracks featuring Aya Nakamura, Gims, Ninho, Jul, PNL, Stromae, and Heuss L'enfoiré.",
    "category": "Spotify Official",
    "countryCode": "FR",
    "coverImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 8,
    "songIds": [
      "fr-djadja",
      "fr-bella",
      "fr-lettre-femme",
      "fr-bande-organisee",
      "fr-papaoutai",
      "fr-au-dd",
      "fr-derniere-danse",
      "fr-moulaga"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Hits du Moment France",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Hits%20du%20Moment%20France",
    "tags": [
      "France",
      "Official Spotify",
      "Rap Français",
      "Pop Urbaine"
    ]
  },
  {
    "id": "spotify-exitos-espana",
    "title": "Éxitos España & Viva Latino (Official Spotify)",
    "description": "The hottest Latin & Spanish tracks: Rosalía, Bad Bunny, Quevedo, Luis Fonsi, and high-energy Reggaeton.",
    "category": "Spotify Official",
    "countryCode": "ES",
    "coverImage": "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 8,
    "songIds": [
      "es-despacito",
      "es-despecha",
      "es-bizarrap-quevedo",
      "es-titi-me-pregunto",
      "es-quedate",
      "es-todo-de-ti",
      "es-bailando",
      "es-gasolina"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Viva Latino",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Viva%20Latino",
    "tags": [
      "Spain",
      "Latin",
      "Reggaeton",
      "Official Spotify"
    ]
  },
  {
    "id": "spotify-top-hits-germany",
    "title": "Top Hits Deutschland (Official Spotify)",
    "description": "Germany's top chart breakers from Apache 207, Peter Fox, Cro, Rammstein, Nina Chuba and Milky Chance.",
    "category": "Spotify Official",
    "countryCode": "DE",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 10,
    "songIds": [
      "de-roller",
      "de-du-hast",
      "de-500-ps",
      "de-haus-am-see",
      "de-was-du-liebe-nennst",
      "de-sugar",
      "de-stolen-dance",
      "de-traum",
      "de-sie-weiss",
      "de-clarity"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Top Hits Deutschland",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Top%20Hits%20Deutschland",
    "tags": [
      "Germany",
      "Official Spotify",
      "Deutschrap",
      "German Pop"
    ]
  },
  {
    "id": "deutschrap-brandneu",
    "title": "Deutschrap Brandneu & Drill",
    "description": "Hard-hitting German rap icons: Apache 207, Bonez MC & RAF Camora, Ayliva, and Peter Fox.",
    "category": "Hip-Hop",
    "countryCode": "DE",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    "difficulty": "MEDIUM",
    "songsCount": 5,
    "songIds": [
      "de-roller",
      "de-500-ps",
      "de-sie-weiss",
      "de-traum",
      "de-was-du-liebe-nennst"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Deutschrap Brandneu",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Deutschrap%20Brandneu",
    "tags": [
      "Deutschrap",
      "Berlin",
      "Drill",
      "Hip-Hop"
    ]
  },
  {
    "id": "spotify-top-50-italia",
    "title": "Top 50 Italia & Sanremo (Official Spotify)",
    "description": "Italy's chart dominators: Måneskin, Mahmood & Blanco, Lazza, Sfera Ebbasta, Meduza and classic Italo Pop.",
    "category": "Spotify Official",
    "countryCode": "IT",
    "coverImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 10,
    "songIds": [
      "it-beggin",
      "it-tran-tran",
      "it-brividi",
      "it-cenere",
      "it-blue",
      "it-sara-perche",
      "it-piece-of-your-heart",
      "it-casa-mia",
      "it-la-solitudine",
      "it-zitti-e-buoni"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Top 50 Italia",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Top%2050%20Italia",
    "tags": [
      "Italy",
      "Official Spotify",
      "Sanremo",
      "Trap Italia"
    ]
  },
  {
    "id": "sanremo-italian-rock-pop",
    "title": "Sanremo Champions & Italian Rock",
    "description": "Eurovision winners Måneskin, Mahmood, Laura Pausini, and timeless Italian anthems.",
    "category": "Pop",
    "countryCode": "IT",
    "coverImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80",
    "difficulty": "MEDIUM",
    "songsCount": 6,
    "songIds": [
      "it-beggin",
      "it-zitti-e-buoni",
      "it-brividi",
      "it-cenere",
      "it-sara-perche",
      "it-la-solitudine"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Sanremo",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Sanremo",
    "tags": [
      "Sanremo",
      "Eurovision",
      "Måneskin",
      "Pop"
    ]
  },
  {
    "id": "spotify-top-brasil",
    "title": "Top Brasil & Funk Hits (Official Spotify)",
    "description": "Brazil's unstoppable music wave: Anitta, MC Kevinho, Pedro Sampaio, Alok, Luísa Sonza, and Gusttavo Lima.",
    "category": "Spotify Official",
    "countryCode": "BR",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 9,
    "songIds": [
      "br-ai-se-eu-te-pego",
      "br-envolver",
      "br-ta-ok",
      "br-hear-me-now",
      "br-dancarina",
      "br-balada",
      "br-chico",
      "br-anos-luz",
      "br-maldivas"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Top Brasil",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Top%20Brasil",
    "tags": [
      "Brazil",
      "Official Spotify",
      "Funk Carioca",
      "Sertanejo"
    ]
  },
  {
    "id": "funk-hits-favela",
    "title": "Funk Hits & Baile Favela",
    "description": "High-octane Brazilian Funk and party hits from Dennis DJ, Kevin O Chris, Anitta and Pedro Sampaio.",
    "category": "Dance",
    "countryCode": "BR",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    "difficulty": "MEDIUM",
    "songsCount": 5,
    "songIds": [
      "br-ta-ok",
      "br-dancarina",
      "br-envolver",
      "br-maldivas",
      "br-ai-se-eu-te-pego"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Funk Hits",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Funk%20Hits",
    "tags": [
      "Funk",
      "Baile",
      "Rio",
      "São Paulo"
    ]
  },
  {
    "id": "spotify-exitos-mexico",
    "title": "Éxitos México & Corridos Tumbados (Official Spotify)",
    "description": "The global Mexican revolution: Peso Pluma, Christian Nodal, Carin Leon, Natanael Cano, Grupo Frontera, and Maná.",
    "category": "Spotify Official",
    "countryCode": "MX",
    "coverImage": "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 9,
    "songIds": [
      "mx-ella-baila-sola",
      "mx-prc",
      "mx-adios-amor",
      "mx-primera-cita",
      "mx-un-x100to",
      "mx-nunca-es-suficiente",
      "mx-oye-mi-amor",
      "mx-la-incondicional",
      "mx-salvame"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Éxitos México",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/%C3%89xitos%20M%C3%A9xico",
    "tags": [
      "Mexico",
      "Official Spotify",
      "Corridos",
      "Regional Mexicano"
    ]
  },
  {
    "id": "corridos-tumbados-peso-pluma",
    "title": "Corridos Tumbados & Bélicos",
    "description": "The viral acoustic sensation dominating worldwide charts: Peso Pluma, Natanael Cano, and Grupo Frontera.",
    "category": "Regional",
    "countryCode": "MX",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 4,
    "songIds": [
      "mx-ella-baila-sola",
      "mx-prc",
      "mx-un-x100to",
      "mx-primera-cita"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Corridos Bélicos",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Corridos%20B%C3%A9licos",
    "tags": [
      "Peso Pluma",
      "Bélicos",
      "Tumbados",
      "Viral"
    ]
  },
  {
    "id": "spotify-african-heat",
    "title": "African Heat & Afrobeats (Official Spotify)",
    "description": "The beating heart of Afrobeats: Burna Boy, Rema, Wizkid, Asake, Davido, Ayra Starr, and CKay.",
    "category": "Spotify Official",
    "countryCode": "NG",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 10,
    "songIds": [
      "ng-calm-down",
      "ng-last-last",
      "ng-essence",
      "ng-lonely-at-the-top",
      "ng-unavailable",
      "ng-rush",
      "ng-love-nwantiti",
      "ng-peru",
      "ng-soso",
      "ng-free-mind"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • African Heat",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/African%20Heat",
    "tags": [
      "Afrobeats",
      "Nigeria",
      "Official Spotify",
      "Lagos"
    ]
  },
  {
    "id": "naija-amapiano-fusion",
    "title": "Naija Giants & Amapiano Wave",
    "description": "Lagos street energy meets hypnotic South African log-drums with Asake, Rema, Davido, and Fireboy DML.",
    "category": "Afrobeats",
    "countryCode": "NG",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    "difficulty": "MEDIUM",
    "songsCount": 6,
    "songIds": [
      "ng-lonely-at-the-top",
      "ng-unavailable",
      "ng-calm-down",
      "ng-peru",
      "ng-rush",
      "ng-last-last"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Naija Hits",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Naija%20Hits",
    "tags": [
      "Amapiano",
      "Asake",
      "Naija",
      "Afrobeats"
    ]
  },
  {
    "id": "spotify-kpop-on",
    "title": "K-Pop ON! (Official Spotify)",
    "description": "The ultimate K-Pop experience featuring BTS, BLACKPINK, NewJeans, Stray Kids, Jung Kook, and PSY.",
    "category": "Spotify Official",
    "countryCode": "KR",
    "coverImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 10,
    "songIds": [
      "kr-dynamite",
      "kr-how-you-like-that",
      "kr-super-shy",
      "kr-gods-menu",
      "kr-the-feels",
      "kr-gangnam-style",
      "kr-cupid",
      "kr-seven",
      "kr-eve-psyche",
      "kr-bang-bang-bang"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • K-Pop ON!",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/K-Pop%20ON!",
    "tags": [
      "K-Pop",
      "Korea",
      "Official Spotify",
      "BTS",
      "BLACKPINK"
    ]
  },
  {
    "id": "kpop-girl-power",
    "title": "K-Pop Queens & Girl Groups",
    "description": "Catchy hooks and stunning choreography from BLACKPINK, NewJeans, TWICE, LE SSERAFIM and FIFTY FIFTY.",
    "category": "K-Pop",
    "countryCode": "KR",
    "coverImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 5,
    "songIds": [
      "kr-how-you-like-that",
      "kr-super-shy",
      "kr-the-feels",
      "kr-cupid",
      "kr-eve-psyche"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • K-Pop Girl Groups",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/K-Pop%20Girl%20Groups",
    "tags": [
      "Girl Groups",
      "NewJeans",
      "BLACKPINK",
      "Pop"
    ]
  },
  {
    "id": "spotify-anime-jpop",
    "title": "Anime Now & J-Pop Hits (Official Spotify)",
    "description": "Iconic anime opening themes and Japanese viral sensations from YOASOBI, Fujii Kaze, LiSA, King Gnu, and City Pop.",
    "category": "Spotify Official",
    "countryCode": "JP",
    "coverImage": "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=600&auto=format&fit=crop&q=80",
    "difficulty": "MEDIUM",
    "songsCount": 11,
    "songIds": [
      "jp-idol",
      "jp-first-love",
      "jp-shinunoga-e-wa",
      "jp-gurenge",
      "jp-lemon",
      "jp-specialz",
      "jp-usseewa",
      "jp-pretender",
      "jp-stay-with-me",
      "jp-zenzenzense",
      "jp-kaikai-kitan"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Anime Now",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Anime%20Now",
    "tags": [
      "Anime",
      "J-Pop",
      "Japan",
      "YOASOBI",
      "Official Spotify"
    ]
  },
  {
    "id": "anime-shonen-anthems",
    "title": "Shonen Jump Anime Openings",
    "description": "High-octane OST anthems from Jujutsu Kaisen, Demon Slayer, Oshi no Ko, and Your Name.",
    "category": "Anime",
    "countryCode": "JP",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 5,
    "songIds": [
      "jp-idol",
      "jp-specialz",
      "jp-gurenge",
      "jp-kaikai-kitan",
      "jp-zenzenzense"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Anime Openings",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Anime%20Openings",
    "tags": [
      "Anime",
      "Shonen",
      "Jujutsu Kaisen",
      "Demon Slayer"
    ]
  },
  {
    "id": "spotify-yalla-egypt",
    "title": "Yalla Egyptian Hits (Official Spotify)",
    "description": "The pulse of Cairo: Wegz, Amr Diab, Hassan Shakoush, Mohamed Ramadan, Hamaki, and Cairokee.",
    "category": "Spotify Official",
    "countryCode": "EG",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 10,
    "songIds": [
      "eg-tamally-maak",
      "eg-el-bakht",
      "eg-bent-el-giran",
      "eg-mafia",
      "eg-adrenalin",
      "eg-sabry-qaleel",
      "eg-free",
      "eg-eish-beshoak",
      "eg-ya-el-midan",
      "eg-dorak-gai"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Yalla Egypt",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Yalla%20Egypt",
    "tags": [
      "Egypt",
      "Official Spotify",
      "Mahraganat",
      "Wegz",
      "Amr Diab"
    ]
  },
  {
    "id": "mahraganat-street-shaabi",
    "title": "Mahraganat & Street Shaabi",
    "description": "High-octane autotune electronic Shaabi festival anthems taking over Egyptian weddings and street parties.",
    "category": "Mahraganat",
    "countryCode": "EG",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 4,
    "songIds": [
      "eg-bent-el-giran",
      "eg-mafia",
      "eg-el-bakht",
      "eg-dorak-gai"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Mahraganat",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Mahraganat",
    "tags": [
      "Mahraganat",
      "Shaabi",
      "Cairo",
      "Party"
    ]
  },
  {
    "id": "spotify-rai-nation-dz",
    "title": "Rai Nation & Algeria Hits (Official Spotify)",
    "description": "The proud heritage of Algerian Rai, Rap & Pop from Soolking, Cheb Khaled, Cheb Mami, Cheb Bilal, and Didine Canon 16.",
    "category": "Spotify Official",
    "countryCode": "DZ",
    "coverImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 12,
    "songIds": [
      "dz-abdel-kader",
      "dz-cest-la-vie",
      "dz-soolking-dalida",
      "dz-didi",
      "dz-guerilla",
      "dz-zemer",
      "dz-courage",
      "dz-desert-rose",
      "dz-tesla",
      "dz-senorita",
      "dz-el-bayda",
      "dz-machafouhach"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Rai Nation",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Rai%20Nation",
    "tags": [
      "Algeria",
      "Rai",
      "Official Spotify",
      "Soolking",
      "Khaled"
    ]
  },
  {
    "id": "soolking-algerian-rap",
    "title": "Soolking & Dz Rap Explosif",
    "description": "The anthems that united the diaspora: Dalida, Guerilla, Zemër, and Didine Canon 16 trap bangers.",
    "category": "Hip-Hop",
    "countryCode": "DZ",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 6,
    "songIds": [
      "dz-soolking-dalida",
      "dz-guerilla",
      "dz-zemer",
      "dz-courage",
      "dz-tesla",
      "dz-machafouhach"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Rap DZ",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Rap%20DZ",
    "tags": [
      "Soolking",
      "Rap DZ",
      "Algeria",
      "Trap"
    ]
  },
  {
    "id": "moroccan-rap-essentials",
    "title": "Moroccan Rap Kings / ملوك الراب المغربي",
    "titleArabic": "ملوك الراب المغربي",
    "description": "Hard-hitting trap and drill anthems from ElGrandeToto, Dizzy DROS, Stormy, Tagne, Small X, Snor, and Dollypran.",
    "category": "Hip-Hop",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 15,
    "songIds": [
      "toto-mghayer",
      "toto-staline",
      "toto-dellali",
      "dizzy-m3a-l3echrane",
      "dizzy-lallamoulati",
      "dizzy-m3a-l3essba",
      "stormy-nikey",
      "stormy-africano",
      "snor-de9a-de9a",
      "tagne-fratello",
      "dollypran-trax",
      "smallx-liyana",
      "muslim-al-rissala",
      "don-bigg-17",
      "kouz1-magic"
    ],
    "isHot": true,
    "isOfficialSpotify": true,
    "spotifyPlaylistName": "Spotify • Moroccan Rap Kings",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Moroccan%20Rap%20Kings",
    "tags": [
      "Rap",
      "Trap",
      "Drill",
      "Casablanca"
    ],
    "countryCode": "MA"
  },
  {
    "id": "maghreb-pop-stars",
    "title": "Maghreb Pop Stars / نجوم البوب المغربي",
    "titleArabic": "نجوم البوب المغربي",
    "description": "Chart-topping pop melodies from Saad Lamjarred, Zouhair Bahaoui, Manal, Hatim Ammor, Douzi, Salma Rachid and Asma Lmnawar.",
    "category": "Pop",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 12,
    "songIds": [
      "saad-lm3allem",
      "saad-ghaltana",
      "saad-enty",
      "saad-casablanca",
      "zouhair-decapotable",
      "zouhair-mucho-amor",
      "manal-taj",
      "manal-slay",
      "hatim-hasdouna",
      "hatim-bla-3onwan",
      "douzi-mina",
      "asma-lmnawar-ando-zin"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Maghreb Pop Stars",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Maghreb%20Pop%20Stars",
    "tags": [
      "Pop",
      "Maghreb",
      "Saad",
      "Manal"
    ],
    "countryCode": "MA"
  },
  {
    "id": "chaabi-wedding-bangers",
    "title": "Chaabi & Wedding Bangers / الأعراس والشعبي",
    "titleArabic": "الأعراس والنشاط المغربي",
    "description": "Pure high-energy Moroccan party anthems by Daoudi, Senhaji, Stati, Najat Aatabou, and Statia.",
    "category": "Chaabi",
    "coverImage": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80",
    "difficulty": "MEDIUM",
    "songsCount": 8,
    "songIds": [
      "najat-kedba",
      "najat-j-en-ai-marre",
      "daoudi-3tini-saki",
      "senhaji-kheddouj",
      "senhaji-zid-dardeg",
      "abdelaziz-stati-visa",
      "abdelaziz-stati-zwina",
      "statia-hwa-dani"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • Chaabi Hits",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Chaabi%20Hits",
    "tags": [
      "Chaabi",
      "Wedding",
      "Stati",
      "Senhaji"
    ],
    "countryCode": "MA"
  },
  {
    "id": "moroccan-classics-heritage",
    "title": "Nass El Ghiwane & 70s Heritage / الرواد والأساطير",
    "titleArabic": "رواد الموسيقى والتراث المغربي",
    "description": "Timeless poetic masterpieces by Nass El Ghiwane, Jil Jilala, Lemchaheb, and Mohamed Rouicha.",
    "category": "Classics",
    "coverImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    "difficulty": "HARD",
    "songsCount": 8,
    "songIds": [
      "nass-siniya",
      "nass-mahmouma",
      "nass-allah-ya-moulana",
      "jil-laayoune",
      "jil-chamaa",
      "lemchaheb-daouini",
      "rouicha-inas-inas",
      "rouicha-chhal-men-lila"
    ],
    "spotifyPlaylistName": "Spotify • Moroccan Heritage",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Moroccan%20Heritage",
    "tags": [
      "Classics",
      "Nass El Ghiwane",
      "Heritage",
      "Ghiwane"
    ],
    "countryCode": "MA"
  },
  {
    "id": "toto-essentials",
    "title": "ElGrandeToto Essentials / طوطو سبيسيال",
    "titleArabic": "طوطو سبيسيال",
    "description": "The biggest bangers from the record-breaking Arab rap superstar: Mghayer, STALINE, Silhouette, Dellali, and Darbeda.",
    "category": "Hip-Hop",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 5,
    "songIds": [
      "toto-mghayer",
      "toto-staline",
      "toto-dellali",
      "toto-silhouette",
      "toto-darbeda"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • This Is ElGrandeToto",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/This%20Is%20ElGrandeToto",
    "tags": [
      "ElGrandeToto",
      "Toto",
      "Caméléon",
      "Rap"
    ],
    "countryCode": "MA"
  },
  {
    "id": "dizzy-dros-bangers",
    "title": "Dizzy DROS Masterclass / ديزي دروس",
    "titleArabic": "ديزي دروس ماستركلاس",
    "description": "From Cazafonia and Men Hna to M3a L3echrane and Lalla Moulati, the razor-sharp punchlines of Mr. Cazafonia.",
    "category": "Hip-Hop",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    "difficulty": "EASY",
    "songsCount": 6,
    "songIds": [
      "dizzy-lallamoulati",
      "dizzy-m3a-l3echrane",
      "dizzy-m3a-l3essba",
      "dizzy-nota",
      "dizzy-moul-ballon",
      "dizzy-cazafonia"
    ],
    "isHot": true,
    "spotifyPlaylistName": "Spotify • This Is Dizzy DROS",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/This%20Is%20Dizzy%20DROS",
    "tags": [
      "Dizzy Dros",
      "Cazafonia",
      "Drill",
      "Rap"
    ],
    "countryCode": "MA"
  },
  {
    "id": "col-spotify-top-ca",
    "title": "Top Hits Canada",
    "category": "Top 50",
    "difficulty": "EASY",
    "description": "Canada's biggest superstars: The Weeknd, Drake, Justin Bieber, Tate McRae, Shawn Mendes and Celine Dion.",
    "spotifyPlaylistName": "Top Hits Canada",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Top%20Hits%20Canada",
    "isOfficialSpotify": true,
    "countryCode": "CA",
    "songIds": [
      "ca-weeknd-blinding",
      "ca-drake-godsplan",
      "ca-bieber-peaches",
      "ca-tate-greedy",
      "ca-weeknd-starboy",
      "ca-drake-onedance",
      "ca-bieber-sorry",
      "ca-shawn-senorita",
      "ca-celine-myheart",
      "ca-avril-complicated"
    ],
    "tags": [
      "Canada",
      "Top 50",
      "The Weeknd",
      "Drake",
      "Bieber"
    ]
  },
  {
    "id": "col-ca-ovo-rnb",
    "title": "OVO Sound & Canadian R&B",
    "category": "R&B / Hip-Hop",
    "difficulty": "MEDIUM",
    "description": "The mood, late-night vibes and melodies from Toronto & Montreal icons.",
    "spotifyPlaylistName": "Toronto R&B & Hip-Hop",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Toronto%20R%26B%20Drake",
    "isOfficialSpotify": false,
    "countryCode": "CA",
    "songIds": [
      "ca-drake-godsplan",
      "ca-weeknd-starboy",
      "ca-drake-onedance",
      "ca-weeknd-blinding",
      "ca-bieber-peaches",
      "ca-tate-greedy"
    ],
    "tags": [
      "Canada",
      "OVO",
      "Drake",
      "The Weeknd"
    ]
  },
  {
    "id": "col-spotify-top-india",
    "title": "Hot Hits India",
    "category": "Top 50",
    "difficulty": "EASY",
    "description": "The biggest Bollywood & Punjabi chart-busters from Arijit Singh, AP Dhillon, Diljit Dosanjh and King.",
    "spotifyPlaylistName": "Hot Hits India",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Hot%20Hits%20India",
    "isOfficialSpotify": true,
    "countryCode": "IN",
    "nativeTitle": "हॉट हिट्स इंडिया",
    "songIds": [
      "in-arijit-tumhiho",
      "in-apdhillon-excuses",
      "in-diljit-lover",
      "in-apdhillon-brownmunde",
      "in-king-maanmerijaan",
      "in-badshah-gendaphool",
      "in-sidhu-295",
      "in-divine-mirchi"
    ],
    "tags": [
      "India",
      "Bollywood",
      "Punjabi",
      "Arijit",
      "AP Dhillon"
    ]
  },
  {
    "id": "col-in-punjabi-fire",
    "title": "Punjabi Party Bangers",
    "category": "Punjabi Pop",
    "difficulty": "MEDIUM",
    "description": "High-octane Punjabi beats from AP Dhillon, Diljit Dosanjh, Sidhu Moose Wala and Badshah.",
    "spotifyPlaylistName": "Punjabi 101",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Punjabi%20101",
    "isOfficialSpotify": true,
    "countryCode": "IN",
    "songIds": [
      "in-apdhillon-brownmunde",
      "in-diljit-lover",
      "in-apdhillon-excuses",
      "in-sidhu-295",
      "in-badshah-gendaphool"
    ],
    "tags": [
      "India",
      "Punjabi",
      "Diljit",
      "AP Dhillon"
    ]
  },
  {
    "id": "col-spotify-top-colombia",
    "title": "Éxitos Colombia",
    "category": "Top 50",
    "difficulty": "EASY",
    "description": "Colombia's chart-topping global hits: Karol G, Shakira, J Balvin, Maluma, Feid and Sebastian Yatra.",
    "spotifyPlaylistName": "Éxitos Colombia",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Éxitos%20Colombia",
    "isOfficialSpotify": true,
    "countryCode": "CO",
    "songIds": [
      "co-karolg-provenza",
      "co-shakira-hipsdontlie",
      "co-jbalvin-migente",
      "co-maluma-hawai",
      "co-karolg-tqg",
      "co-feid-chorrito",
      "co-shakira-wakawaka",
      "co-yatra-tacones"
    ],
    "tags": [
      "Colombia",
      "Reggaeton",
      "Karol G",
      "Shakira",
      "J Balvin"
    ]
  },
  {
    "id": "col-spotify-viva-latino-pr",
    "title": "Viva Latino Puerto Rico",
    "category": "Reggaeton",
    "difficulty": "EASY",
    "description": "The epicenter of Reggaeton: Bad Bunny, Daddy Yankee, Rauw Alejandro, Ozuna, Farruko and Don Omar.",
    "spotifyPlaylistName": "Viva Latino",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Viva%20Latino%20Bad%20Bunny",
    "isOfficialSpotify": true,
    "countryCode": "PR",
    "songIds": [
      "pr-badbunny-titi",
      "pr-daddy-gasolina",
      "pr-rauw-tododeti",
      "pr-farruko-pepas",
      "pr-badbunny-monaco",
      "pr-ozuna-sepreparo",
      "pr-daddy-concalma",
      "pr-donomar-danzakuduro"
    ],
    "tags": [
      "Puerto Rico",
      "Reggaeton",
      "Bad Bunny",
      "Daddy Yankee"
    ]
  },
  {
    "id": "col-spotify-top-argentina",
    "title": "Top Hits Argentina",
    "category": "Trap / Pop",
    "difficulty": "EASY",
    "description": "Argentine urban domination: Bizarrap Music Sessions, Duki, Nicki Nicole, Trueno and Tiago PZK.",
    "spotifyPlaylistName": "Top Hits Argentina",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Top%20Hits%20Argentina",
    "isOfficialSpotify": true,
    "countryCode": "AR",
    "songIds": [
      "ar-bizarrap-quevedo",
      "ar-duki-shedontgive",
      "ar-bizarrap-shakira",
      "ar-nicki-colocao",
      "ar-tiago-entrenosotros",
      "ar-duki-givenchy",
      "ar-trueno-dancecrip",
      "ar-nicki-wapo"
    ],
    "tags": [
      "Argentina",
      "Trap Argentino",
      "Bizarrap",
      "Duki",
      "Nicki Nicole"
    ]
  },
  {
    "id": "col-ar-bzrp-sessions",
    "title": "Bzrp Music Sessions Pack",
    "category": "Electronic / Trap",
    "difficulty": "MEDIUM",
    "description": "The viral studio sessions by master producer Bizarrap featuring Quevedo, Shakira, Duki and Nicki Nicole.",
    "spotifyPlaylistName": "Bzrp Music Sessions",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Bzrp%20Music%20Sessions",
    "isOfficialSpotify": false,
    "countryCode": "AR",
    "songIds": [
      "ar-bizarrap-quevedo",
      "ar-bizarrap-shakira",
      "ar-duki-shedontgive",
      "ar-nicki-colocao",
      "ar-trueno-dancecrip"
    ],
    "tags": [
      "Argentina",
      "Bizarrap",
      "Quevedo",
      "Shakira"
    ]
  },
  {
    "id": "col-spotify-top-turkey",
    "title": "Türkçe Pop & Trap Hits",
    "category": "Top 50",
    "difficulty": "EASY",
    "description": "The biggest Turkish chart toppers from Ezhel, Murda, Tarkan, Reynmen and Motive.",
    "spotifyPlaylistName": "Top 50 - Türkiye",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Top%2050%20Türkiye",
    "isOfficialSpotify": true,
    "countryCode": "TR",
    "nativeTitle": "Türkçe Top 50",
    "songIds": [
      "tr-ezhel-geceler",
      "tr-tarkan-simarik",
      "tr-murda-aya",
      "tr-reynmen-renklensin",
      "tr-ezhel-felaket",
      "tr-tarkan-dudu",
      "tr-motive-10mg"
    ],
    "tags": [
      "Turkey",
      "Ezhel",
      "Tarkan",
      "Murda",
      "Reynmen"
    ]
  },
  {
    "id": "col-spotify-khaleeji-top",
    "title": "Khaleeji & Gulf Hits",
    "category": "Khaleeji Pop",
    "difficulty": "EASY",
    "description": "Timeless Khaleeji melodies and modern Gulf hits from Abdul Majeed Abdullah, Mohammed Abdu, Ayed, Assala and Rabeh Saqer.",
    "spotifyPlaylistName": "Khaleeji Hits",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Khaleeji%20Hits",
    "isOfficialSpotify": true,
    "countryCode": "SA",
    "titleArabic": "أغاني خليجية توب",
    "songIds": [
      "sa-abdulmajeed-tetnafasek",
      "sa-mohammed-alamaken",
      "sa-assala-bentakaber",
      "sa-ayed-fmanallah",
      "sa-abdulmajeed-ghalatan",
      "sa-rabeh-maghroor",
      "sa-dalia-beniobink"
    ],
    "tags": [
      "Saudi Arabia",
      "Khaleeji",
      "Abdul Majeed",
      "Mohammed Abdu",
      "Assala"
    ]
  },
  {
    "id": "col-spotify-top-tunisia",
    "title": "Rap & Pop Tunisie",
    "category": "Rap Tunisien",
    "difficulty": "EASY",
    "description": "North African street anthems and hits from Balti, Hamouda, Samara, Nordo and Sanfara.",
    "spotifyPlaylistName": "Top Hits Tunisie",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Top%20Hits%20Tunisie",
    "isOfficialSpotify": true,
    "countryCode": "TN",
    "titleArabic": "راب وأغاني تونسية",
    "songIds": [
      "tn-balti-yalili",
      "tn-hamouda-baba",
      "tn-balti-allo",
      "tn-nordo-ghariba",
      "tn-samara-pourlesgang",
      "tn-sanfara-w9ayet"
    ],
    "tags": [
      "Tunisia",
      "Balti",
      "Hamouda",
      "Samara",
      "Nordo"
    ]
  },
  {
    "id": "col-spotify-top-netherlands",
    "title": "Dutch EDM & Nederpop Hits",
    "category": "EDM / Pop",
    "difficulty": "EASY",
    "description": "World-dominating Dutch DJs and hip-hop stars: Martin Garrix, Tiësto, Armin van Buuren, Joost and Frenna.",
    "spotifyPlaylistName": "Top Hits Netherlands",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Top%20Hits%20Netherlands",
    "isOfficialSpotify": true,
    "countryCode": "NL",
    "songIds": [
      "nl-garrix-animals",
      "nl-tiesto-thebusiness",
      "nl-joost-europapa",
      "nl-armin-blahblah",
      "nl-garrix-scared",
      "nl-frenna-verledentijd",
      "nl-boef-habiba"
    ],
    "tags": [
      "Netherlands",
      "EDM",
      "Martin Garrix",
      "Tiësto",
      "Joost"
    ]
  },
  {
    "id": "col-spotify-top-sweden",
    "title": "Swedish Pop & EDM Anthems",
    "category": "Pop / EDM",
    "difficulty": "EASY",
    "description": "The masters of melodic pop & festival anthems: Avicii, ABBA, Zara Larsson and Swedish House Mafia.",
    "spotifyPlaylistName": "Top Hits Sweden",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Top%20Hits%20Sweden",
    "isOfficialSpotify": true,
    "countryCode": "SE",
    "songIds": [
      "se-avicii-wakemeup",
      "se-abba-dancingqueen",
      "se-zara-lushlife",
      "se-shm-dontyouworry",
      "se-avicii-levels",
      "se-abba-gimme",
      "se-yunglean-ginseng"
    ],
    "tags": [
      "Sweden",
      "Avicii",
      "ABBA",
      "Zara Larsson",
      "Swedish House Mafia"
    ]
  },
  {
    "id": "col-spotify-reggae-jamaica",
    "title": "Reggae & Dancehall Anthems",
    "category": "Reggae / Dancehall",
    "difficulty": "EASY",
    "description": "Roots reggae royalty and dancehall superstars: Bob Marley, Sean Paul, Shenseea, Shaggy and Koffee.",
    "spotifyPlaylistName": "Dancehall Official",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Dancehall%20Official",
    "isOfficialSpotify": true,
    "countryCode": "JM",
    "songIds": [
      "jm-bobmarley-threelittlebirds",
      "jm-seanpaul-temperature",
      "jm-shaggy-itwasntme",
      "jm-bobmarley-couldyoubeloved",
      "jm-seanpaul-getbusy",
      "jm-koffee-toast",
      "jm-shenseea-blessed",
      "jm-popcaan-silence"
    ],
    "tags": [
      "Jamaica",
      "Reggae",
      "Dancehall",
      "Bob Marley",
      "Sean Paul"
    ]
  },
  {
    "id": "col-spotify-afrobeats-ghana",
    "title": "Asakaa Drill & Ghana Afrobeats",
    "category": "Afrobeats",
    "difficulty": "EASY",
    "description": "The unstoppable wave of Ghanaian music: Black Sherif, Stonebwoy, Sarkodie, King Promise and Camidoh.",
    "spotifyPlaylistName": "Ghana Bounce",
    "spotifyPlaylistUrl": "https://open.spotify.com/search/Ghana%20Bounce",
    "isOfficialSpotify": true,
    "countryCode": "GH",
    "songIds": [
      "gh-blacksherif-kwaku",
      "gh-kingpromise-terminator",
      "gh-camidoh-sugarcane",
      "gh-sarkodie-adonai",
      "gh-kidi-touchit",
      "gh-stonebwoy-gidigba",
      "gh-blacksherif-secondsermon",
      "gh-kuami-angela"
    ],
    "tags": [
      "Ghana",
      "Black Sherif",
      "Afrobeats",
      "King Promise",
      "Sarkodie"
    ]
  }
];

interface GeneratedCollectionTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: QuizCollection['difficulty'];
  startYear?: number;
  endYear?: number;
  genreKeywords?: string[];
}

const GENERATED_COLLECTION_TEMPLATES: GeneratedCollectionTemplate[] = [
  {
    id: '70s-classics',
    title: '70s Classics',
    description: 'Older classics and foundational radio hits from the 1970s and nearby legacy eras.',
    category: '1970s',
    tags: ['70s', 'Classic', 'Old Songs'],
    difficulty: 'MEDIUM',
    startYear: 1970,
    endYear: 1979
  },
  {
    id: '80s-icons',
    title: '80s Icons',
    description: 'Recognizable 1980s tracks, nostalgic pop hooks, and timeless old-school anthems.',
    category: '1980s',
    tags: ['80s', 'Retro', 'Classic'],
    difficulty: 'MEDIUM',
    startYear: 1980,
    endYear: 1989
  },
  {
    id: '90s-throwbacks',
    title: '90s Throwbacks',
    description: 'Big 1990s singalongs, crossover hits, and regional throwback favorites.',
    category: '1990s',
    tags: ['90s', 'Throwback', 'Classic'],
    difficulty: 'MEDIUM',
    startYear: 1990,
    endYear: 1999
  },
  {
    id: '2000s-hits',
    title: '2000s Hits',
    description: 'Chart songs and club staples from the 2000s era.',
    category: '2000s',
    tags: ['2000s', 'Hits', 'Radio'],
    difficulty: 'EASY',
    startYear: 2000,
    endYear: 2009
  },
  {
    id: '2010s-streaming',
    title: '2010s Streaming Era',
    description: 'Streaming-age favorites and viral tracks from 2010 through 2019.',
    category: '2010s',
    tags: ['2010s', 'Streaming', 'Viral'],
    difficulty: 'EASY',
    startYear: 2010,
    endYear: 2019
  },
  {
    id: '2020s-new-wave',
    title: '2020s New Wave',
    description: 'Fresh 2020s releases, TikTok-era hooks, and current country favorites.',
    category: '2020s',
    tags: ['2020s', 'New Songs', 'Viral'],
    difficulty: 'EASY',
    startYear: 2020,
    endYear: 2029
  },
  {
    id: 'pop-essentials',
    title: 'Pop Essentials',
    description: 'Catchy pop singles, melodic choruses, and mainstream favorites.',
    category: 'Pop',
    tags: ['Pop', 'Mainstream', 'Hits'],
    difficulty: 'EASY',
    genreKeywords: ['pop', 'k-pop', 'j-pop', 'afropop', 'latin pop', 'nederpop']
  },
  {
    id: 'rap-hip-hop',
    title: 'Rap & Hip-Hop',
    description: 'Rap, trap, drill, and hip-hop tracks from the country catalog.',
    category: 'Hip-Hop',
    tags: ['Rap', 'Hip-Hop', 'Trap'],
    difficulty: 'HARD',
    genreKeywords: ['rap', 'hip-hop', 'trap', 'drill', 'grime']
  },
  {
    id: 'dance-club',
    title: 'Dance & Club',
    description: 'Dancefloor tracks, electronic hits, and party-ready rhythms.',
    category: 'Dance',
    tags: ['Dance', 'Club', 'EDM'],
    difficulty: 'EASY',
    genreKeywords: ['dance', 'edm', 'electronic', 'house', 'techno', 'club', 'funk']
  },
  {
    id: 'rock-alt',
    title: 'Rock & Alternative',
    description: 'Rock, indie, alternative, and guitar-led favorites.',
    category: 'Rock',
    tags: ['Rock', 'Alternative', 'Indie'],
    difficulty: 'MEDIUM',
    genreKeywords: ['rock', 'alternative', 'indie', 'britpop', 'j-rock']
  },
  {
    id: 'rnb-soul',
    title: 'R&B & Soul',
    description: 'Smooth R&B, soul, and late-night vocal tracks.',
    category: 'R&B',
    tags: ['R&B', 'Soul', 'Vocals'],
    difficulty: 'MEDIUM',
    genreKeywords: ['r&b', 'soul', 'tarab', 'ballad']
  },
  {
    id: 'regional-roots',
    title: 'Regional Roots',
    description: 'Traditional, regional, and culturally specific sounds from the country catalog.',
    category: 'Regional',
    tags: ['Regional', 'Roots', 'Culture'],
    difficulty: 'HARD',
    genreKeywords: [
      'rai',
      'chaabi',
      'gnawa',
      'amazigh',
      'flamenco',
      'corridos',
      'sertanejo',
      'highlife',
      'khaleeji',
      'reggae',
      'dancehall',
      'bollywood',
      'punjabi'
    ]
  },
  {
    id: 'party-anthems',
    title: 'Party Anthems',
    description: 'Fast-recognition tracks built for parties, festivals, and group play.',
    category: 'Party',
    tags: ['Party', 'Festival', 'Anthems'],
    difficulty: 'EASY',
    genreKeywords: ['party', 'club', 'dance', 'funk', 'reggaeton', 'afrobeats', 'edm']
  },
  {
    id: 'old-to-new',
    title: 'Old to New Mix',
    description: 'A balanced path from older hits to modern favorites.',
    category: 'Mixed Era',
    tags: ['Old Songs', 'New Songs', 'Mixed'],
    difficulty: 'MEDIUM'
  },
  {
    id: 'hard-mode',
    title: 'Hard Mode Deep Cuts',
    description: 'A tougher country playlist for players who know more than the biggest hits.',
    category: 'Hard Mode',
    tags: ['Hard', 'Deep Cuts', 'Challenge'],
    difficulty: 'HARD'
  }
];

const GENERATED_COVER_IMAGES = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80'
];

type CollectionVariantSort = 'mixed' | 'newest' | 'oldest' | 'hardest' | 'easiest';

interface CollectionVariant {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: QuizCollection['difficulty'];
  sort: CollectionVariantSort;
}

const ARTIST_PROFILE_VARIANTS: CollectionVariant[] = [
  {
    id: 'artist-profile',
    title: 'Discography & Singles',
    description: 'Artist catalog first, including singles, core releases, and featured tracks available in this app.',
    category: 'Artist Discography',
    tags: ['Artist', 'Discography', 'Singles'],
    difficulty: 'MEDIUM',
    sort: 'mixed'
  },
  {
    id: 'artist-hits',
    title: 'Hits Challenge',
    description: 'Recognizable songs and high-speed guessing rounds for artist fans.',
    category: 'Artist Hits',
    tags: ['Artist', 'Hits', 'Challenge'],
    difficulty: 'EASY',
    sort: 'easiest'
  },
  {
    id: 'artist-deep-cuts',
    title: 'Deep Cuts',
    description: 'A tougher artist game with less obvious tracks and related catalog picks.',
    category: 'Artist Deep Cuts',
    tags: ['Artist', 'Deep Cuts', 'Hard'],
    difficulty: 'HARD',
    sort: 'hardest'
  },
  {
    id: 'artist-new-wave',
    title: 'New Wave',
    description: 'Newer releases and modern-era artist clues.',
    category: 'Artist Era',
    tags: ['Artist', 'New Songs', '2020s'],
    difficulty: 'MEDIUM',
    sort: 'newest'
  },
  {
    id: 'artist-roots',
    title: 'Roots & Classics',
    description: 'Older songs, classic references, and origin-era artist clues.',
    category: 'Artist Era',
    tags: ['Artist', 'Classics', 'Old Songs'],
    difficulty: 'MEDIUM',
    sort: 'oldest'
  },
  {
    id: 'artist-speedrun',
    title: 'Speedrun Mix',
    description: 'Fast-recognition artist snippets for repeat play.',
    category: 'Artist Speedrun',
    tags: ['Artist', 'Speedrun', 'Practice'],
    difficulty: 'EXPERT',
    sort: 'mixed'
  },
  {
    id: 'artist-fan-test',
    title: 'Fan Test',
    description: 'A balanced fan challenge built from artist tracks and scene-adjacent songs.',
    category: 'Artist Fan Test',
    tags: ['Artist', 'Fan Test', 'Trivia'],
    difficulty: 'HARD',
    sort: 'hardest'
  },
  {
    id: 'artist-radio-mix',
    title: 'Radio Mix',
    description: 'Accessible artist-led picks for casual group play.',
    category: 'Artist Radio',
    tags: ['Artist', 'Radio', 'Pop'],
    difficulty: 'EASY',
    sort: 'easiest'
  }
];

const GENRE_MATRIX_VARIANTS: CollectionVariant[] = [
  {
    id: 'starter-pack',
    title: 'Starter Pack',
    description: 'Accessible tracks for learning the sound of this genre.',
    category: 'Genre Starter',
    tags: ['Genre', 'Starter', 'Easy'],
    difficulty: 'EASY',
    sort: 'easiest'
  },
  {
    id: 'new-school',
    title: 'New School',
    description: 'Modern and streaming-era tracks from this genre.',
    category: 'Genre New School',
    tags: ['Genre', 'New Songs', 'Streaming'],
    difficulty: 'MEDIUM',
    sort: 'newest'
  },
  {
    id: 'old-school',
    title: 'Old School',
    description: 'Older hits, throwbacks, and legacy records from this genre.',
    category: 'Genre Old School',
    tags: ['Genre', 'Old Songs', 'Classics'],
    difficulty: 'MEDIUM',
    sort: 'oldest'
  },
  {
    id: 'expert-run',
    title: 'Expert Run',
    description: 'Harder snippets for players who know the genre deeply.',
    category: 'Genre Expert',
    tags: ['Genre', 'Hard', 'Expert'],
    difficulty: 'HARD',
    sort: 'hardest'
  },
  {
    id: 'party-set',
    title: 'Party Set',
    description: 'High-recognition songs for quick rounds and group play.',
    category: 'Genre Party',
    tags: ['Genre', 'Party', 'Hits'],
    difficulty: 'EASY',
    sort: 'mixed'
  },
  {
    id: 'radio-hits',
    title: 'Radio Hits',
    description: 'Radio-friendly tracks and familiar hooks from this genre.',
    category: 'Genre Radio',
    tags: ['Genre', 'Radio', 'Hits'],
    difficulty: 'EASY',
    sort: 'easiest'
  },
  {
    id: 'chart-run',
    title: 'Chart Run',
    description: 'Popular chart-facing songs from this genre and scene.',
    category: 'Genre Charts',
    tags: ['Genre', 'Charts', 'Popular'],
    difficulty: 'MEDIUM',
    sort: 'mixed'
  },
  {
    id: 'classics-test',
    title: 'Classics Test',
    description: 'Older and legacy-facing picks for genre history rounds.',
    category: 'Genre Classics',
    tags: ['Genre', 'Classics', 'Old Songs'],
    difficulty: 'MEDIUM',
    sort: 'oldest'
  },
  {
    id: 'deep-library',
    title: 'Deep Library',
    description: 'A wider genre pack that uses more of the available catalog.',
    category: 'Genre Library',
    tags: ['Genre', 'Deep Cuts', 'Catalog'],
    difficulty: 'HARD',
    sort: 'hardest'
  },
  {
    id: 'speed-round',
    title: 'Speed Round',
    description: 'Fast-recognition genre snippets with a refreshed song order.',
    category: 'Genre Speedrun',
    tags: ['Genre', 'Speedrun', 'Practice'],
    difficulty: 'EXPERT',
    sort: 'mixed'
  }
];

function countrySeed(countryCode: string, templateIndex: number): number {
  return countryCode
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), templateIndex * 17);
}

function stableSeed(value: string): number {
  return value.split('').reduce((sum, char) => ((sum << 5) - sum + char.charCodeAt(0)) >>> 0, 2166136261);
}

function splitArtistName(artist: string): string[] {
  return artist
    .split(/\s+(?:&|and|feat\.?|ft\.?|x)\s+|,\s*/i)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function rotateSongs(songs: Song[], seed: number): Song[] {
  if (songs.length === 0) return [];
  const offset = seed % songs.length;
  return [...songs.slice(offset), ...songs.slice(0, offset)];
}

function difficultyRank(song: Song): number {
  return ['EASY', 'MEDIUM', 'HARD', 'EXPERT', 'IMPOSSIBLE'].indexOf(song.difficulty);
}

function sortSongsForVariant(songs: Song[], variant: CollectionVariant): Song[] {
  const ranked = [...songs];
  if (variant.sort === 'newest') {
    return ranked.sort((left, right) => (right.releaseYear || 0) - (left.releaseYear || 0));
  }
  if (variant.sort === 'oldest') {
    return ranked.sort((left, right) => (left.releaseYear || 9999) - (right.releaseYear || 9999));
  }
  if (variant.sort === 'hardest') {
    return ranked.sort((left, right) => difficultyRank(right) - difficultyRank(left));
  }
  if (variant.sort === 'easiest') {
    return ranked.sort((left, right) => difficultyRank(left) - difficultyRank(right));
  }
  return ranked;
}

function uniqueSongList(songs: Song[]): Song[] {
  const seen = new Set<string>();
  return songs.filter((song) => {
    if (seen.has(song.id)) return false;
    seen.add(song.id);
    return true;
  });
}

function completePlayablePack(baseSongs: Song[], fallbackSongs: Song[], seed: number, count = 24): Song[] {
  const base = uniqueSongList(baseSongs);
  const fillers = rotateSongs(uniqueSongList(fallbackSongs), seed).filter(
    (song) => !base.some((item) => item.id === song.id)
  );
  return [...base, ...fillers].slice(0, count);
}

function primaryCountryCode(songs: Song[]): string {
  const counts = new Map<string, number>();
  songs.forEach((song) => counts.set(song.countryCode, (counts.get(song.countryCode) || 0) + 1));
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || 'GLOBAL';
}

function genreMatchesSong(song: Song, keywords: string[], genreSlug?: string): boolean {
  const isUsOrGlobal = song.countryCode === 'US' || song.countryCode === 'GLOBAL';
  if (genreSlug === '80s') return isUsOrGlobal && typeof song.releaseYear === 'number' && song.releaseYear >= 1980 && song.releaseYear <= 1989;
  if (genreSlug === '90s') return isUsOrGlobal && typeof song.releaseYear === 'number' && song.releaseYear >= 1990 && song.releaseYear <= 1999;
  if (genreSlug === '2000s') return isUsOrGlobal && typeof song.releaseYear === 'number' && song.releaseYear >= 2000 && song.releaseYear <= 2009;
  if (genreSlug === '2010s') return isUsOrGlobal && typeof song.releaseYear === 'number' && song.releaseYear >= 2010 && song.releaseYear <= 2019;
  if (genreSlug === '2020s') return isUsOrGlobal && typeof song.releaseYear === 'number' && song.releaseYear >= 2020 && song.releaseYear <= 2029;

  const haystack = `${song.genre} ${song.artist} ${song.title}`.toLowerCase();
  if (genreSlug === 'american-rap') {
    return song.countryCode === 'US' && keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  }
  if (genreSlug === 'country') {
    return song.genre.toLowerCase().includes('country');
  }
  if (genreSlug === 'bollywood') {
    return song.countryCode === 'IN' && keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  }
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function selectGeneratedSongs(
  countryCode: string,
  template: GeneratedCollectionTemplate,
  templateIndex: number
): Song[] {
  const countryPool = countryCode === 'GLOBAL'
    ? ALL_SONGS
    : ALL_SONGS.filter((song) => song.countryCode === countryCode);
  const fallbackPool = countryPool.length >= 5 ? countryPool : ALL_SONGS;
  const seed = countrySeed(countryCode, templateIndex);

  const matches = countryPool.filter((song) => {
    const yearMatch =
      template.startYear === undefined ||
      (typeof song.releaseYear === 'number' &&
        song.releaseYear >= template.startYear &&
        song.releaseYear <= (template.endYear || template.startYear));
    const genreMatch =
      !template.genreKeywords ||
      template.genreKeywords.some((keyword) => song.genre.toLowerCase().includes(keyword));
    return yearMatch && genreMatch;
  });

  const selected = rotateSongs(matches, seed);
  const fillers = rotateSongs(fallbackPool, seed + selected.length).filter(
    (song) => !selected.some((item) => item.id === song.id)
  );

  const targetCount =
    countryCode === 'GLOBAL'
      ? Math.min(80, Math.max(24, selected.length || fallbackPool.length))
      : Math.min(40, Math.max(12, selected.length || countryPool.length || fallbackPool.length));

  return [...selected, ...fillers].slice(0, targetCount);
}

function buildGeneratedCollection(countryCode: string, template: GeneratedCollectionTemplate, templateIndex: number): QuizCollection | null {
  const country = COUNTRIES.find((item) => item.code === countryCode);
  if (!country) return null;

  const songs = selectGeneratedSongs(countryCode, template, templateIndex);
  if (songs.length === 0) return null;

  const countryName = country.code === 'GLOBAL' ? 'Global' : country.code === 'US' ? 'USA' : country.name;
  const displayCountryName = country.code === 'GLOBAL' && template.id === '70s-classics' ? 'Morocco' : countryName;
  return {
    id: `auto-${country.code.toLowerCase()}-${template.id}`,
    title: `${displayCountryName} ${template.title}`,
    description: `${template.description} Built from the ${displayCountryName} song catalog.`,
    category: template.category,
    countryCode: country.code,
    coverImage: GENERATED_COVER_IMAGES[templateIndex % GENERATED_COVER_IMAGES.length],
    difficulty: template.difficulty,
    songsCount: songs.length,
    songIds: songs.map((song) => song.id),
    isHot: templateIndex <= 5,
    spotifyPlaylistName: `${displayCountryName} ${template.title}`,
    spotifyPlaylistUrl: `https://open.spotify.com/search/${encodeURIComponent(`${displayCountryName} ${template.title}`)}`,
    tags: [displayCountryName, ...template.tags]
  };
}

function buildArtistCollections(): QuizCollection[] {
  const artistGroups = new Map<string, { name: string; songs: Song[] }>();

  ALL_SONGS.forEach((song) => {
    splitArtistName(song.artist).forEach((name) => {
      const slug = slugifyChallenge(name);
      if (!slug) return;
      const group = artistGroups.get(slug) || { name, songs: [] };
      group.songs.push(song);
      artistGroups.set(slug, group);
    });
  });

  return Array.from(artistGroups.entries()).flatMap(([slug, group]) => {
    const countryCode = primaryCountryCode(group.songs);
    const countryPool = ALL_SONGS.filter((song) => song.countryCode === countryCode);
    const fallbackPool = countryPool.length >= 8 ? countryPool : ALL_SONGS;
    const baseSeed = stableSeed(slug);

    return ARTIST_PROFILE_VARIANTS.map((variant, index) => {
      const artistSongs = rotateSongs(sortSongsForVariant(group.songs, variant), baseSeed + index);
      const targetCount = Math.min(32, Math.max(12, group.songs.length));
      const packSongs = variant.id === 'artist-profile'
        ? uniqueSongList(artistSongs)
        : completePlayablePack(artistSongs, fallbackPool, baseSeed + index * 13, targetCount);

      return {
        id: `artist-${slug}-${variant.id}`,
        title: `${group.name} ${variant.title}`,
        description: `${variant.description} Built around ${group.name}.`,
        category: variant.category,
        countryCode,
        coverImage: packSongs[0]?.artworkUrl || GENERATED_COVER_IMAGES[index % GENERATED_COVER_IMAGES.length],
        difficulty: variant.difficulty,
        songsCount: packSongs.length,
        songIds: packSongs.map((song) => song.id),
        isHot: group.songs.length >= 3 && index < 2,
        spotifyPlaylistName: `${group.name} ${variant.title}`,
        spotifyPlaylistUrl: `https://open.spotify.com/search/${encodeURIComponent(`${group.name} ${variant.title}`)}`,
        tags: [group.name, countryCode, ...variant.tags]
      };
    });
  });
}

function buildGenreMatrixCollections(): QuizCollection[] {
  return COUNTRIES.flatMap((country) => {
    const countryPool = country.code === 'GLOBAL'
      ? ALL_SONGS
      : ALL_SONGS.filter((song) => song.countryCode === country.code);
    const fallbackPool = countryPool.length >= 8 ? countryPool : ALL_SONGS;
    const countryName = country.code === 'GLOBAL' ? 'Global' : country.name;

    return GENRE_DEFINITIONS.flatMap((genre, genreIndex) => {
      const matches = countryPool.filter((song) => genreMatchesSong(song, genre.keywords, genre.slug));
      if (matches.length === 0 && country.code !== 'GLOBAL') {
        return [];
      }
      const basePool = matches.length > 0 ? matches : fallbackPool;

      return GENRE_MATRIX_VARIANTS.map((variant, variantIndex) => {
        const seed = stableSeed(`${country.code}-${genre.slug}-${variant.id}`);
        const sorted = sortSongsForVariant(basePool, variant);
        const targetCount = Math.min(40, Math.max(12, basePool.length));
        const packSongs = completePlayablePack(rotateSongs(sorted, seed), fallbackPool, seed + 31, targetCount);

        return {
          id: `genre-${country.code.toLowerCase()}-${genre.slug}-${variant.id}`,
          title: `${countryName} ${genre.name} ${variant.title}`,
          description: `${variant.description} Curated for ${countryName} ${genre.name} rounds.`,
          category: genre.name,
          countryCode: country.code,
          coverImage: packSongs[0]?.artworkUrl || GENERATED_COVER_IMAGES[(genreIndex + variantIndex) % GENERATED_COVER_IMAGES.length],
          difficulty: variant.difficulty,
          songsCount: packSongs.length,
          songIds: packSongs.map((song) => song.id),
          isHot: country.code === 'GLOBAL' && variantIndex === 0,
          spotifyPlaylistName: `${countryName} ${genre.name} ${variant.title}`,
          spotifyPlaylistUrl: `https://open.spotify.com/search/${encodeURIComponent(`${countryName} ${genre.name} ${variant.title}`)}`,
          tags: [countryName, genre.name, ...genre.keywords, ...variant.tags]
        };
      });
    });
  });
}

function expandCuratedCollection(collection: QuizCollection): QuizCollection {
  const isRapCaviar = collection.id === 'spotify-rapcaviar';
  const isRapSong = (song: Song) => /hip-hop|rap|trap/i.test(`${song.genre} ${song.artist} ${song.title}`);
  const rawBaseSongs = ALL_SONGS.filter((song) => collection.songIds.includes(song.id));
  const baseSongs = isRapCaviar ? rawBaseSongs.filter(isRapSong) : rawBaseSongs;
  const countryPool = collection.countryCode === 'GLOBAL'
    ? ALL_SONGS
    : ALL_SONGS.filter((song) => song.countryCode === collection.countryCode);
  const fallbackPool = countryPool.length >= 8 ? countryPool : ALL_SONGS;
  const keywords = [
    collection.category,
    ...(collection.tags || [])
  ]
    .map((keyword) => keyword.toLowerCase())
    .filter((keyword) => keyword.length > 2 && !['top 50', 'hits', 'official spotify'].includes(keyword));
  const relatedSongs = countryPool.filter((song) => {
    const haystack = `${song.genre} ${song.artist} ${song.title}`.toLowerCase();
    return isRapCaviar ? isRapSong(song) : keywords.some((keyword) => haystack.includes(keyword));
  });
  const strictFallbackPool = isRapCaviar && relatedSongs.length > 0 ? relatedSongs : fallbackPool;
  const targetCount = collection.countryCode === 'GLOBAL'
    ? Math.min(60, Math.max(24, baseSongs.length, relatedSongs.length))
    : Math.min(32, Math.max(12, baseSongs.length, relatedSongs.length, isRapCaviar ? 0 : countryPool.length));
  const packSongs = completePlayablePack([...baseSongs, ...relatedSongs], strictFallbackPool, stableSeed(collection.id), targetCount);

  return {
    ...collection,
    coverImage: collection.coverImage || packSongs[0]?.artworkUrl,
    songsCount: packSongs.length,
    songIds: packSongs.map((song) => song.id)
  };
}

function buildExpandedQuizCollections(curatedCollections: QuizCollection[]): QuizCollection[] {
  const collections = curatedCollections.map(expandCuratedCollection);
  const existingIds = new Set(collections.map((collection) => collection.id));

  for (const country of COUNTRIES) {
    const existingCount = collections.filter((collection) => collection.countryCode === country.code).length;
    const needed = Math.max(0, 15 - existingCount);

    GENERATED_COLLECTION_TEMPLATES.slice(0, needed).forEach((template, index) => {
      const generated = buildGeneratedCollection(country.code, template, index);
      if (!generated || existingIds.has(generated.id)) return;
      collections.push(generated);
      existingIds.add(generated.id);
    });
  }

  for (const generated of buildArtistCollections()) {
    if (existingIds.has(generated.id)) continue;
    collections.push(generated);
    existingIds.add(generated.id);
  }

  for (const generated of buildGenreMatrixCollections()) {
    if (existingIds.has(generated.id)) continue;
    collections.push(generated);
    existingIds.add(generated.id);
  }

  return collections;
}

export const QUIZ_COLLECTIONS: QuizCollection[] = buildExpandedQuizCollections(CURATED_QUIZ_COLLECTIONS);

export function getCollectionsForCountry(countryCode?: string): QuizCollection[] {
  if (!countryCode || countryCode === 'GLOBAL') {
    return QUIZ_COLLECTIONS;
  }
  return QUIZ_COLLECTIONS.filter(c => c.countryCode === countryCode);
}

export function getDefaultCollectionForCountry(countryCode?: string): QuizCollection {
  if (!countryCode || countryCode === 'GLOBAL') {
    return QUIZ_COLLECTIONS.find(c => c.id === 'spotify-todays-top-hits') || QUIZ_COLLECTIONS[0];
  }
  
  // Find official spotify / top hits collection for this country first
  const countryCols = QUIZ_COLLECTIONS.filter(c => c.countryCode === countryCode);
  if (countryCols.length > 0) {
    const flagship = countryCols.find(c => c.isOfficialSpotify || c.category === 'Top 50' || c.category === 'Global Hits') || countryCols[0];
    return flagship;
  }
  
  return QUIZ_COLLECTIONS.find(c => c.id === 'spotify-todays-top-hits') || QUIZ_COLLECTIONS[0];
}
