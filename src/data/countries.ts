export interface Country {
  code: string;
  name: string;
  nativeName?: string;
  flag: string;
  region: 'Africa' | 'Americas' | 'Europe' | 'Asia' | 'Middle East' | 'Global';
  popularGenres: string[];
  description: string;
}

export const COUNTRIES: Country[] = [
  {
    code: 'GLOBAL',
    name: 'Global / Worldwide',
    nativeName: 'Worldwide Hits',
    flag: '🌍',
    region: 'Global',
    popularGenres: ['Pop', 'Hip-Hop', 'Dance', 'R&B', 'Rock'],
    description: 'Worldwide chart-toppers, viral TikTok bangers, and legendary global anthems.'
  },
  {
    code: 'MA',
    name: 'Morocco',
    nativeName: 'المغرب',
    flag: '🇲🇦',
    region: 'Africa',
    popularGenres: ['Moroccan Rap', 'Pop', 'Chaabi', 'Rai', 'Gnawa', 'Amazigh'],
    description: 'Moroccan rap kings, catchy Maghreb pop, Chaabi wedding anthems, and timeless classics.'
  },
  {
    code: 'US',
    name: 'United States',
    nativeName: 'USA',
    flag: '🇺🇸',
    region: 'Americas',
    popularGenres: ['Hip-Hop/Rap', 'Pop', 'R&B', 'Rock', 'Country'],
    description: 'Billboard Hot 100 icons, modern rap royalty, legendary pop hits, and classic rock.'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    nativeName: 'UK',
    flag: '🇬🇧',
    region: 'Europe',
    popularGenres: ['UK Drill & Grime', 'Britpop', 'Pop', 'Indie Rock', 'Electronic'],
    description: 'UK Drill, British pop sensations, iconic bands, and electronic festival hits.'
  },
  {
    code: 'FR',
    name: 'France',
    nativeName: 'France',
    flag: '🇫🇷',
    region: 'Europe',
    popularGenres: ['Rap Français', 'Pop Urbaine', 'Variété Française', 'Afrotrap'],
    description: 'French rap titans, modern urban pop, French touch electro, and timeless chansons.'
  },
  {
    code: 'ES',
    name: 'Spain & Latin',
    nativeName: 'España',
    flag: '🇪🇸',
    region: 'Europe',
    popularGenres: ['Reggaeton', 'Latin Pop', 'Flamenco Urbano', 'Trap Latino'],
    description: 'Global Latin sensations, high-energy Reggaeton, Flamenco fusion, and Spanish chart toppers.'
  },
  {
    code: 'EG',
    name: 'Egypt',
    nativeName: 'مصر',
    flag: '🇪🇬',
    region: 'Middle East',
    popularGenres: ['Mahraganat', 'Egyptian Pop', 'Tarab', 'Egyptian Trap'],
    description: 'Street Mahraganat bangers, Amr Diab pop anthems, Egyptian trap, and legendary Tarab.'
  },
  {
    code: 'DZ',
    name: 'Algeria',
    nativeName: 'الجزائر',
    flag: '🇩🇿',
    region: 'Africa',
    popularGenres: ['Rai', 'Algerian Rap', 'Staifi', 'Chaabi'],
    description: 'Kings of Rai, hard-hitting Algerian rap, and modern North African fusion.'
  },
  {
    code: 'BR',
    name: 'Brazil',
    nativeName: 'Brasil',
    flag: '🇧🇷',
    region: 'Americas',
    popularGenres: ['Funk Carioca', 'Sertanejo', 'Brazilian Pop', 'Trap BR', 'MPB'],
    description: 'Explosive Funk Carioca, Sertanejo hits, Brazilian trap, and iconic Samba/MPB.'
  },
  {
    code: 'KR',
    name: 'South Korea',
    nativeName: '대한민국',
    flag: '🇰🇷',
    region: 'Asia',
    popularGenres: ['K-Pop', 'K-Hip-Hop', 'K-R&B', 'K-Drama OST'],
    description: 'Global K-Pop megastars, addictive choreo tracks, Korean hip-hop, and emotive OSTs.'
  },
  {
    code: 'JP',
    name: 'Japan',
    nativeName: '日本',
    flag: '🇯🇵',
    region: 'Asia',
    popularGenres: ['J-Pop', 'Anime Openings', 'J-Rock', 'City Pop'],
    description: 'Anime theme songs, J-Pop anthems, nostalgic 80s City Pop, and J-Rock classics.'
  },
  {
    code: 'DE',
    name: 'Germany',
    nativeName: 'Deutschland',
    flag: '🇩🇪',
    region: 'Europe',
    popularGenres: ['Deutschrap', 'German Pop', 'Electronic/Techno', 'Schlager'],
    description: 'Hard-hitting Deutschrap, club techno beats, and German pop radio hits.'
  },
  {
    code: 'IT',
    name: 'Italy',
    nativeName: 'Italia',
    flag: '🇮🇹',
    region: 'Europe',
    popularGenres: ['Italian Trap', 'Sanremo Pop', 'Italo Disco', 'Canzone d’Autore'],
    description: 'Sanremo festival winners, modern Italian trap, and golden Italo classics.'
  },
  {
    code: 'NG',
    name: 'Nigeria & Afrobeats',
    nativeName: 'Naija',
    flag: '🇳🇬',
    region: 'Africa',
    popularGenres: ['Afrobeats', 'Afropop', 'Street Pop', 'Alté'],
    description: 'Afrobeats conquering the globe: Burna Boy, Wizkid, Rema, Asake, and Davido.'
  },
  {
    code: 'MX',
    name: 'Mexico',
    nativeName: 'México',
    flag: '🇲🇽',
    region: 'Americas',
    popularGenres: ['Corridos Tumbados', 'Regional Mexicano', 'Latin Rock', 'Mex Pop'],
    description: 'Peso Pluma & Corridos Tumbados, Regional Mexican legends, and Latin pop.'
  },
  {
    code: 'CA',
    name: 'Canada',
    nativeName: 'Canada',
    flag: '🇨🇦',
    region: 'Americas',
    popularGenres: ['Pop', 'R&B/Hip-Hop', 'Indie Pop', 'Alternative'],
    description: 'The Weeknd, Drake, Justin Bieber, Tate McRae, and global Canadian icons.'
  },
  {
    code: 'IN',
    name: 'India',
    nativeName: 'भारत',
    flag: '🇮🇳',
    region: 'Asia',
    popularGenres: ['Bollywood Pop', 'Punjabi Pop', 'Indian Hip-Hop', 'Desi Trap'],
    description: 'Arijit Singh ballads, AP Dhillon & Diljit Punjabi anthems, and Desi Hip-Hop.'
  },
  {
    code: 'CO',
    name: 'Colombia',
    nativeName: 'Colombia',
    flag: '🇨🇴',
    region: 'Americas',
    popularGenres: ['Reggaeton', 'Latin Pop', 'Cumbia', 'Vallenato Urbano'],
    description: 'Karol G, Shakira, J Balvin, Maluma, and vibrant Colombian hits.'
  },
  {
    code: 'PR',
    name: 'Puerto Rico',
    nativeName: 'Puerto Rico',
    flag: '🇵🇷',
    region: 'Americas',
    popularGenres: ['Reggaeton', 'Trap Latino', 'Dembow', 'Salsa'],
    description: 'Bad Bunny, Daddy Yankee, Rauw Alejandro, and legendary Reggaeton pioneers.'
  },
  {
    code: 'AR',
    name: 'Argentina',
    nativeName: 'Argentina',
    flag: '🇦🇷',
    region: 'Americas',
    popularGenres: ['Trap Argentino', 'Bzrp Sessions', 'Cumbia 420', 'Rock Nacional'],
    description: 'Bizarrap Sessions, Duki, Nicki Nicole, Maria Becerra, and Argentino trap.'
  },
  {
    code: 'TR',
    name: 'Turkey',
    nativeName: 'Türkiye',
    flag: '🇹🇷',
    region: 'Middle East',
    popularGenres: ['Turkish Trap', 'Türkçe Pop', 'Anatolian Rock', 'Drill'],
    description: 'Ezhel, Murda, Sefo, Tarkan, and modern Turkish urban sounds.'
  },
  {
    code: 'SA',
    name: 'Saudi Arabia & Gulf',
    nativeName: 'السعودية والخليج',
    flag: '🇸🇦',
    region: 'Middle East',
    popularGenres: ['Khaleeji Pop', 'Sheilat', 'Tarab', 'Saudi Hip-Hop'],
    description: 'Abdul Majeed Abdullah, Mohammed Abdu, Ayed, Assala, and modern Gulf hits.'
  },
  {
    code: 'TN',
    name: 'Tunisia',
    nativeName: 'تونس',
    flag: '🇹🇳',
    region: 'Africa',
    popularGenres: ['Rap Tunisien', 'Mezoued', 'Tunisian Pop', 'Trap'],
    description: 'Balti, Samara, Sanfara, Nordo, and North African street rap anthems.'
  },
  {
    code: 'NL',
    name: 'Netherlands',
    nativeName: 'Nederland',
    flag: '🇳🇱',
    region: 'Europe',
    popularGenres: ['EDM / House', 'Dutch Hip-Hop', 'Nederpop', 'Hardstyle'],
    description: 'Martin Garrix, Tiësto, Armin van Buuren, Joost, and Dutch festival bangers.'
  },
  {
    code: 'SE',
    name: 'Sweden',
    nativeName: 'Sverige',
    flag: '🇸🇪',
    region: 'Europe',
    popularGenres: ['Euro Pop', 'Swedish House', 'Cloud Rap', 'Melodic Pop'],
    description: 'Avicii, ABBA, Zara Larsson, Swedish House Mafia, and Swedish pop perfection.'
  },
  {
    code: 'JM',
    name: 'Jamaica',
    nativeName: 'Jamaica',
    flag: '🇯🇲',
    region: 'Americas',
    popularGenres: ['Dancehall', 'Reggae', 'Roots Reggae', 'Dub'],
    description: 'Bob Marley, Sean Paul, Shenseea, Koffee, and world-shaking Jamaican riddims.'
  },
  {
    code: 'GH',
    name: 'Ghana',
    nativeName: 'Ghana',
    flag: '🇬🇭',
    region: 'Africa',
    popularGenres: ['Afrobeats', 'Highlife', 'Asakaa Drill', 'Afropop'],
    description: 'Black Sherif, Stonebwoy, Sarkodie, King Promise, and Ghanaian vibes.'
  }
];

export const DEFAULT_COUNTRY_CODE = 'GLOBAL';
