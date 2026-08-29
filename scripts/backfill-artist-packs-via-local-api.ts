import { getArtistChallenges } from '../src/utils/challengeCatalog';
import { RequestedArtist, SpotifyArtistSuggestion } from '../src/adminTypes';

const BASE_URL = process.env.SONG_GUESS_BASE_URL || 'http://127.0.0.1:3000';
const MIN_SONGS = Number(process.env.SPOTIFY_BACKFILL_MIN_SONGS || getArgValue('--min') || 8);
const LIMIT = Number(process.env.SPOTIFY_BACKFILL_LIMIT || getArgValue('--limit') || 0);
const REQUEST_TIMEOUT_MS = Number(process.env.SPOTIFY_BACKFILL_TIMEOUT_MS || 45_000);
const ALLOW_FUZZY_MATCH = process.argv.includes('--allow-fuzzy');

function getArgValue(name: string): string {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || '' : '';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : `HTTP ${response.status}`;
      throw new Error(error);
    }
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

function baseArtistSlug(slug: string): string {
  return slug.replace(/-[a-z0-9]{8}$/, '');
}

function chooseSuggestion(name: string, suggestions: SpotifyArtistSuggestion[]): SpotifyArtistSuggestion | null {
  const normalized = name.toLowerCase();
  return suggestions.find((artist) => artist.name.toLowerCase() === normalized)
    || (ALLOW_FUZZY_MATCH
      ? suggestions.find((artist) => artist.name.toLowerCase().includes(normalized) || normalized.includes(artist.name.toLowerCase()))
      : undefined)
    || (ALLOW_FUZZY_MATCH ? suggestions[0] : undefined)
    || null;
}

async function main(): Promise<void> {
  const current = await fetchJson<{ artists: RequestedArtist[] }>(`${BASE_URL}/api/artist-requests`);
  const rebuiltBaseSlugs = new Set(current.artists
    .filter((artist) => (artist.songsCount || 0) >= MIN_SONGS)
    .map((artist) => baseArtistSlug(artist.slug)));
  const targets = getArtistChallenges()
    .filter((artist) => artist.songsCount < MIN_SONGS && !rebuiltBaseSlugs.has(artist.slug))
    .slice(0, LIMIT > 0 ? LIMIT : undefined);

  console.log(`Backfilling ${targets.length} artist packs through ${BASE_URL}.`);
  let consecutiveSpotifyRateLimits = 0;
  for (const artist of targets) {
    try {
      console.log(`searching ${artist.name}...`);
      const searchUrl = `${BASE_URL}/api/spotify/artists?${new URLSearchParams({ q: artist.name }).toString()}`;
      const search = await fetchJson<{ artists: SpotifyArtistSuggestion[] }>(searchUrl);
      const suggestion = chooseSuggestion(artist.name, search.artists);
      if (!suggestion) {
        console.warn(`skipped ${artist.name}: no Spotify suggestion`);
        continue;
      }
      console.log(`building ${artist.name} from ${suggestion.name} (${suggestion.id})...`);
      const result = await fetchJson<{ artist: RequestedArtist }>(`${BASE_URL}/api/artist-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName: suggestion.name, spotifyArtistId: suggestion.id })
      });
      console.log(`ready ${result.artist.name}: ${result.artist.songsCount} songs`);
      consecutiveSpotifyRateLimits = 0;
      await sleep(350);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`skipped ${artist.name}: ${message}`);
      if (message.includes('429')) {
        consecutiveSpotifyRateLimits += 1;
        if (consecutiveSpotifyRateLimits >= 5) {
          console.warn('Stopping early after 5 consecutive Spotify 429 responses. Resume after the Spotify quota cooldown.');
          break;
        }
      } else {
        consecutiveSpotifyRateLimits = 0;
      }
      await sleep(750);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
