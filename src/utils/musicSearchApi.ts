import { ALL_SONGS } from '../data/moroccanSongs';
import { Song } from '../types';

interface DeezerTrackItem {
  id: number;
  title: string;
  title_short?: string;
  artist: {
    id: number;
    name: string;
    picture_medium?: string;
  };
  album?: {
    id: number;
    title: string;
    cover_medium?: string;
    cover_big?: string;
  };
  preview: string;
  link?: string;
}

const searchCache = new Map<string, Song[]>();

function cleanText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af]/g, '');
}

/**
 * Searches global and country-specific songs with instant local fuzzy match across English,
 * Arabic, Korean, Japanese, and Latin titles & artists, and falls back to proxy endpoint.
 */
export async function searchGlobalSongs(query: string, countryCode?: string): Promise<Song[]> {
  const rawQuery = query.trim();
  if (!rawQuery) return [];

  const lowerQuery = rawQuery.toLowerCase();
  const cleanedQuery = cleanText(rawQuery);
  const cacheKey = `${countryCode || 'ALL'}::${lowerQuery}`;

  // Check in-memory cache first
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  // 1. Search local curated catalog
  const pool = ALL_SONGS;

  const localMatches = pool.filter((song) => {
    const titleClean = cleanText(song.title);
    const artistClean = cleanText(song.artist);
    const arabicTitleClean = cleanText(song.titleArabic || song.nativeTitle || '');
    const arabicArtistClean = cleanText(song.artistArabic || song.nativeArtist || '');

    const directMatch =
      song.title.toLowerCase().includes(lowerQuery) ||
      song.artist.toLowerCase().includes(lowerQuery) ||
      (song.titleArabic && song.titleArabic.toLowerCase().includes(lowerQuery)) ||
      (song.artistArabic && song.artistArabic.toLowerCase().includes(lowerQuery)) ||
      (song.nativeTitle && song.nativeTitle.toLowerCase().includes(lowerQuery)) ||
      (song.nativeArtist && song.nativeArtist.toLowerCase().includes(lowerQuery));

    const fuzzyMatch =
      cleanedQuery.length >= 2 &&
      (titleClean.includes(cleanedQuery) ||
        cleanedQuery.includes(titleClean) ||
        artistClean.includes(cleanedQuery) ||
        cleanedQuery.includes(artistClean) ||
        arabicTitleClean.includes(cleanedQuery) ||
        arabicArtistClean.includes(cleanedQuery));

    return Boolean(directMatch || fuzzyMatch);
  });

  // Prioritize songs from the currently active country if set
  if (countryCode && countryCode !== 'GLOBAL') {
    localMatches.sort((a, b) => {
      if (a.countryCode === countryCode && b.countryCode !== countryCode) return -1;
      if (a.countryCode !== countryCode && b.countryCode === countryCode) return 1;
      return 0;
    });
  }

  // If we have local matches, return them or supplement
  if (localMatches.length >= 5) {
    searchCache.set(cacheKey, localMatches);
    return localMatches;
  }

  // 2. Fetch from Deezer proxy endpoint for vast global catalog coverage
  try {
    const res = await fetch(`/api/music/search?q=${encodeURIComponent(rawQuery)}&limit=12`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        const remoteSongs: Song[] = data.data
          .filter((item: DeezerTrackItem) => item.title && item.artist?.name && item.preview)
          .map((item: DeezerTrackItem) => {
            const trackTitle = item.title_short || item.title;
            const artistName = item.artist.name;
            return {
              id: `search-${item.id}`,
              title: trackTitle,
              artist: artistName,
              album: item.album?.title || trackTitle,
              genre: 'Pop / Global',
              countryCode: countryCode || 'GLOBAL',
              releaseYear: 2023,
              artworkUrl:
                item.album?.cover_big ||
                item.album?.cover_medium ||
                item.artist.picture_medium ||
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
              previewUrl: item.preview,
              spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(trackTitle + ' ' + artistName)}`,
              difficulty: 'MEDIUM'
            };
          });

        // Merge unique by title & artist
        const mergedMap = new Map<string, Song>();
        for (const song of [...localMatches, ...remoteSongs]) {
          const key = `${cleanText(song.title)}---${cleanText(song.artist)}`;
          if (!mergedMap.has(key)) {
            mergedMap.set(key, song);
          }
        }

        const combined = Array.from(mergedMap.values());
        searchCache.set(cacheKey, combined);
        return combined;
      }
    }
  } catch (err) {
    console.debug('Music search fallback note:', err);
  }

  searchCache.set(cacheKey, localMatches);
  return localMatches;
}

// Backward compatibility alias
export const searchMoroccanSongs = searchGlobalSongs;
