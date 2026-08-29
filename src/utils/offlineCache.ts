import { Song } from '../types';

const SONG_CACHE_KEY = 'songspot_offline_catalog_v2';
const SNIPPET_CACHE_NAME = 'songspot-audio-snippets-v1';
const METADATA_TIMESTAMP_KEY = 'songspot_cache_timestamp';

export interface CachedSongMeta {
  songs: Song[];
  countryCode: string;
  collectionId?: string;
  cachedAt: number;
}

/**
 * Persist the current active country & playlist song metadata into localStorage
 */
export function cacheSongsMetadata(songs: Song[], countryCode = 'GLOBAL', collectionId?: string): void {
  try {
    if (!songs || songs.length === 0) return;
    const meta: CachedSongMeta = {
      songs,
      countryCode,
      collectionId,
      cachedAt: Date.now()
    };
    localStorage.setItem(SONG_CACHE_KEY, JSON.stringify(meta));
    localStorage.setItem(METADATA_TIMESTAMP_KEY, Date.now().toString());
  } catch (err) {
    console.debug('Failed to cache song metadata to localStorage', err);
  }
}

/**
 * Retrieve cached offline song metadata
 */
export function getCachedSongsMetadata(): CachedSongMeta | null {
  try {
    const raw = localStorage.getItem(SONG_CACHE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.debug('Failed to read cached song metadata', err);
  }
  return null;
}

/**
 * Cache audio snippet in browser CacheStorage so user can continue playing even if connection drops
 */
export async function cacheAudioSnippet(url: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window) || !url) {
    return false;
  }

  try {
    const cache = await caches.open(SNIPPET_CACHE_NAME);
    const existing = await cache.match(url);
    if (existing) return true;

    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      await cache.put(url, response.clone());
      return true;
    }
  } catch (e) {
    console.debug('Audio snippet offline cache attempt bypassed', e);
  }
  return false;
}

/**
 * Pre-cache all audio snippets for a game session in background
 */
export function preCacheGameAudioSnippets(songs: Song[]): void {
  if (!songs || songs.length === 0) return;
  
  // Use idle callback or timeout to prevent blocking main thread
  setTimeout(() => {
    songs.forEach(async (song) => {
      if (song.previewUrl) {
        try {
          await cacheAudioSnippet(song.previewUrl);
        } catch (_) {}
      }
    });
  }, 1000);
}
