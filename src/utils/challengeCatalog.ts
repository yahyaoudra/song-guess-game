import { Song } from '../types';
import { ALL_SONGS } from '../data/moroccanSongs';
import { COUNTRIES } from '../data/countries';

export interface ArtistChallenge {
  slug: string;
  name: string;
  songIds: string[];
  songsCount: number;
  countryCodes: string[];
  coverImage: string;
}

export interface GenreChallenge {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
  songIds: string[];
  songsCount: number;
  coverImage: string;
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';

export const TOP_US_FEATURED_ARTIST_NAMES = [
  'Taylor Swift',
  'Drake',
  'The Weeknd',
  'Billie Eilish',
  'Ariana Grande',
  'Sabrina Carpenter',
  'Justin Bieber',
  'Bruno Mars',
  'Post Malone',
  'Kendrick Lamar',
  'Dua Lipa',
  'Miley Cyrus'
];

export const TOP_US_FEATURED_ARTIST_SLUGS = TOP_US_FEATURED_ARTIST_NAMES.map(slugifyChallenge);

export function baseArtistSlug(slug: string): string {
  return slug.replace(/-[a-z0-9]{8}$/, '');
}

export function orderArtistsByFeaturedPriority<T extends { slug: string; songsCount?: number; name: string }>(artists: T[]): T[] {
  const priority = new Map(TOP_US_FEATURED_ARTIST_SLUGS.map((slug, index) => [slug, index]));
  return [...artists].sort((left, right) => {
    const leftPriority = priority.get(baseArtistSlug(left.slug));
    const rightPriority = priority.get(baseArtistSlug(right.slug));
    if (leftPriority !== undefined || rightPriority !== undefined) {
      return (leftPriority ?? Number.MAX_SAFE_INTEGER) - (rightPriority ?? Number.MAX_SAFE_INTEGER);
    }
    const leftCount = left.songsCount || 0;
    const rightCount = right.songsCount || 0;
    if (rightCount !== leftCount) return rightCount - leftCount;
    return left.name.localeCompare(right.name);
  });
}

export const GENRE_DEFINITIONS: Array<Omit<GenreChallenge, 'songIds' | 'songsCount' | 'coverImage'>> = [
  {
    slug: 'k-pop',
    name: 'K-Pop',
    description: 'Korean pop, idol groups, dance hooks, and global K-wave hits.',
    keywords: ['k-pop', 'kpop']
  },
  {
    slug: 'bollywood',
    name: 'Bollywood',
    description: 'Bollywood pop, Hindi soundtrack hits, and Desi chart favorites.',
    keywords: ['bollywood', 'hindi', 'desi']
  },
  {
    slug: 'american-rap',
    name: 'American Rap',
    description: 'US rap, trap, hip-hop classics, and modern chart hits.',
    keywords: ['hip-hop', 'rap', 'trap']
  },
  {
    slug: 'country',
    name: 'Country',
    description: 'Country radio staples, crossover hits, and acoustic storytelling.',
    keywords: ['country']
  },
  {
    slug: '80s',
    name: '80s',
    description: 'Eighties pop, rock, dance, and nostalgia-heavy classics.',
    keywords: ['80s'],
  },
  {
    slug: '90s',
    name: '90s',
    description: 'Nineties throwbacks, radio staples, and early global pop culture hits.',
    keywords: ['90s'],
  },
  {
    slug: '2000s',
    name: '2000s',
    description: 'Millennium-era pop, club tracks, R&B, and rap hits.',
    keywords: ['2000s'],
  },
  {
    slug: '2010s',
    name: '2010s',
    description: 'Streaming-era anthems from 2010 through 2019.',
    keywords: ['2010s'],
  },
  {
    slug: '2020s',
    name: '2020s',
    description: 'New songs, viral hooks, and modern global favorites.',
    keywords: ['2020s'],
  },
  {
    slug: 'afrobeats',
    name: 'Afrobeats',
    description: 'Afrobeats, Afropop, amapiano-adjacent rhythms, and African chart hits.',
    keywords: ['afrobeats', 'afropop', 'alte']
  },
  {
    slug: 'reggaeton',
    name: 'Reggaeton',
    description: 'Reggaeton, Latin trap, dembow, and Latin pop club tracks.',
    keywords: ['reggaeton', 'latin', 'dembow']
  },
  {
    slug: 'edm-dance',
    name: 'EDM & Dance',
    description: 'Electronic, house, festival, and dancefloor-ready songs.',
    keywords: ['edm', 'electronic', 'dance', 'house', 'techno']
  },
  {
    slug: 'rock',
    name: 'Rock',
    description: 'Rock, alternative, indie, Britpop, and guitar-led anthems.',
    keywords: ['rock', 'alternative', 'indie', 'britpop', 'j-rock']
  },
  {
    slug: 'rai-chaabi',
    name: 'Rai & Chaabi',
    description: 'Maghreb rai, chaabi, and North African classics.',
    keywords: ['rai', 'chaabi', 'gnawa', 'amazigh']
  },
  {
    slug: 'rnb-soul',
    name: 'R&B & Soul',
    description: 'R&B, soul, smooth vocals, and emotional late-night songs.',
    keywords: ['r&b', 'soul', 'ballad']
  }
];

export function slugifyChallenge(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function splitArtistName(artist: string): string[] {
  return artist
    .split(/\s+(?:&|and|feat\.?|ft\.?|x)\s+|,\s*/i)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function songMatchesGenre(song: Song, genre: GenreChallenge | Omit<GenreChallenge, 'songIds' | 'songsCount' | 'coverImage'>): boolean {
  const isUsOrGlobal = song.countryCode === 'US' || song.countryCode === 'GLOBAL';
  if (genre.slug === '80s') return isUsOrGlobal && typeof song.releaseYear === 'number' && song.releaseYear >= 1980 && song.releaseYear <= 1989;
  if (genre.slug === '90s') return isUsOrGlobal && typeof song.releaseYear === 'number' && song.releaseYear >= 1990 && song.releaseYear <= 1999;
  if (genre.slug === '2000s') return isUsOrGlobal && typeof song.releaseYear === 'number' && song.releaseYear >= 2000 && song.releaseYear <= 2009;
  if (genre.slug === '2010s') return isUsOrGlobal && typeof song.releaseYear === 'number' && song.releaseYear >= 2010 && song.releaseYear <= 2019;
  if (genre.slug === '2020s') return isUsOrGlobal && typeof song.releaseYear === 'number' && song.releaseYear >= 2020 && song.releaseYear <= 2029;

  const haystack = `${song.genre} ${song.artist} ${song.title}`.toLowerCase();
  if (genre.slug === 'american-rap') {
    return song.countryCode === 'US' && genre.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  }
  if (genre.slug === 'country') {
    return song.genre.toLowerCase().includes('country');
  }
  if (genre.slug === 'bollywood') {
    return song.countryCode === 'IN' && genre.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  }
  return genre.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

export function getArtistChallenges(): ArtistChallenge[] {
  const bySlug = new Map<string, ArtistChallenge>();

  ALL_SONGS.forEach((song) => {
    splitArtistName(song.artist).forEach((name) => {
      const slug = slugifyChallenge(name);
      if (!slug) return;
      const existing = bySlug.get(slug);

      if (existing) {
        if (!existing.songIds.includes(song.id)) existing.songIds.push(song.id);
        if (!existing.countryCodes.includes(song.countryCode)) existing.countryCodes.push(song.countryCode);
        if (!existing.coverImage && song.artworkUrl) existing.coverImage = song.artworkUrl;
        existing.songsCount = existing.songIds.length;
        return;
      }

      bySlug.set(slug, {
        slug,
        name,
        songIds: [song.id],
        songsCount: 1,
        countryCodes: [song.countryCode],
        coverImage: song.artworkUrl || DEFAULT_COVER
      });
    });
  });

  return orderArtistsByFeaturedPriority(Array.from(bySlug.values()));
}

export function getArtistChallenge(slug: string): ArtistChallenge | null {
  const cleanSlug = slugifyChallenge(slug);
  return getArtistChallenges().find((artist) => artist.slug === cleanSlug) || null;
}

export function getGenreChallenges(): GenreChallenge[] {
  return GENRE_DEFINITIONS.map((genre, index) => {
    const matches = ALL_SONGS.filter((song) => songMatchesGenre(song, genre));
    const fallback = matches.length > 0 ? matches : ALL_SONGS.slice(index, index + 8);

    return {
      ...genre,
      songIds: fallback.map((song) => song.id),
      songsCount: fallback.length,
      coverImage: fallback[0]?.artworkUrl || DEFAULT_COVER
    };
  });
}

export function getGenreChallenge(slug: string): GenreChallenge | null {
  const cleanSlug = slugifyChallenge(slug);
  return getGenreChallenges().find((genre) => genre.slug === cleanSlug) || null;
}

export function getSongsByArtistSlug(slug: string): Song[] {
  const artist = getArtistChallenge(slug);
  if (!artist) return [];
  return ALL_SONGS.filter((song) => artist.songIds.includes(song.id));
}

export function getSongsByGenreSlug(slug: string): Song[] {
  const genre = getGenreChallenge(slug);
  if (!genre) return [];
  return ALL_SONGS.filter((song) => genre.songIds.includes(song.id));
}

export function getCountryName(countryCode: string): string {
  return COUNTRIES.find((country) => country.code === countryCode)?.name || 'Global';
}
