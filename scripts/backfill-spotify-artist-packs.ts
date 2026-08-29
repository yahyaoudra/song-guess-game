import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getArtistChallenges, slugifyChallenge } from '../src/utils/challengeCatalog';
import { Song } from '../src/types';
import { RequestedArtist } from '../src/adminTypes';

const REQUESTS_PATH = process.env.ARTIST_REQUESTS_PATH || path.join(process.cwd(), 'data', 'artist-requests.json');
const MIN_SONGS = Number(process.env.SPOTIFY_BACKFILL_MIN_SONGS || getArgValue('--min') || 8);
const LIMIT = Number(process.env.SPOTIFY_BACKFILL_LIMIT || getArgValue('--limit') || 0);
const MAX_ALBUMS = Number(process.env.SPOTIFY_BACKFILL_MAX_ALBUMS || getArgValue('--max-albums') || 20);
const MARKET = process.env.SPOTIFY_MARKET || 'US';
const REQUEST_TIMEOUT_MS = Number(process.env.SPOTIFY_BACKFILL_TIMEOUT_MS || 15_000);

type SpotifyArtistApiItem = {
  id?: string;
  name?: string;
  external_urls?: { spotify?: string };
  images?: Array<{ url?: string }>;
};

type SpotifyAlbumSummary = {
  id?: string;
  name?: string;
  release_date?: string;
  images?: Array<{ url?: string }>;
  external_urls?: { spotify?: string };
};

function getArgValue(name: string): string {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || '' : '';
}

function safeText(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function safeHttpsUrl(value: unknown): string {
  const raw = safeText(value, 2048);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

let spotifyAccessToken = '';
let spotifyTokenExpiresAt = 0;

async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) {
    throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET.');
  }
  if (spotifyAccessToken && Date.now() < spotifyTokenExpiresAt - 30_000) {
    return spotifyAccessToken;
  }
  const response = await fetchWithTimeout('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  });
  if (!response.ok) {
    throw new Error(`Spotify token request failed with ${response.status}.`);
  }
  const body = await withTimeout(response.json() as Promise<{ access_token?: string; expires_in?: number }>, 'Spotify token JSON parse timed out.');
  spotifyAccessToken = safeText(body.access_token, 4096);
  spotifyTokenExpiresAt = Date.now() + Number(body.expires_in || 3600) * 1000;
  return spotifyAccessToken;
}

async function fetchSpotifyJson<T>(endpoint: string, attempt = 1): Promise<T> {
  const token = await getSpotifyAccessToken();
  const response = await fetchWithTimeout(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 429 && attempt <= 3) {
    const retryAfter = Number(response.headers.get('retry-after') || '2');
    await sleep(Math.max(1, retryAfter) * 1000);
    return fetchSpotifyJson<T>(endpoint, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`Spotify API returned ${response.status}.`);
  }
  return await withTimeout(response.json() as Promise<T>, 'Spotify JSON parse timed out.');
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetch(url, { ...init, signal: controller.signal }),
      new Promise<Response>((_resolve, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error(`Spotify request timed out after ${REQUEST_TIMEOUT_MS}ms.`));
        }, REQUEST_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), REQUEST_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function findArtistByName(name: string): Promise<SpotifyArtistApiItem | null> {
  const response = await fetchSpotifyJson<{ artists?: { items?: SpotifyArtistApiItem[] } }>(
    `/search?${new URLSearchParams({ q: name, type: 'artist', limit: '5' }).toString()}`
  );
  const normalized = name.toLowerCase();
  return response.artists?.items?.find((artist) => safeText(artist.name, 100).toLowerCase() === normalized)
    || response.artists?.items?.[0]
    || null;
}

async function buildArtistPack(name: string): Promise<RequestedArtist> {
  const spotifyArtist = await findArtistByName(name);
  if (!spotifyArtist?.id) {
    throw new Error(`No Spotify artist found for "${name}".`);
  }
  const slugBase = slugifyChallenge(spotifyArtist.name || name);
  const slug = `${slugBase}-${spotifyArtist.id.slice(0, 8).toLowerCase()}`;

  const albums: SpotifyAlbumSummary[] = [];
  for (let offset = 0; offset < MAX_ALBUMS; offset += 10) {
    const response = await fetchSpotifyJson<{ items?: SpotifyAlbumSummary[]; total?: number }>(
      `/artists/${encodeURIComponent(spotifyArtist.id)}/albums?${new URLSearchParams({
        include_groups: 'album,single',
        market: MARKET,
        limit: '10',
        offset: String(offset)
      }).toString()}`
    );
    albums.push(...(response.items || []));
    if (!response.items?.length || albums.length >= (response.total || albums.length)) break;
  }

  const seen = new Set<string>();
  const songs: Song[] = [];
  for (const album of albums) {
    if (!album.id) continue;
    const tracks = await fetchSpotifyJson<{ items?: Array<any> }>(
      `/albums/${encodeURIComponent(album.id)}/tracks?${new URLSearchParams({ market: MARKET, limit: '50' }).toString()}`
    );
    for (const track of tracks.items || []) {
      const title = safeText(track?.name, 160);
      const artist = Array.isArray(track?.artists) && track.artists.length > 0
        ? track.artists.map((item: any) => safeText(item.name, 120)).filter(Boolean).join(' & ')
        : safeText(spotifyArtist.name, 100) || name;
      const key = `${title}-${artist}`.toLowerCase();
      if (!title || seen.has(key)) continue;
      seen.add(key);
      const releaseYear = Number(String(album.release_date || '').slice(0, 4));
      const artworkUrl = safeHttpsUrl(album.images?.[0]?.url) || safeHttpsUrl(spotifyArtist.images?.[0]?.url);
      const directPreview = safeHttpsUrl(track.preview_url);
      const params = new URLSearchParams({ title, artist });
      if (directPreview) params.set('url', directPreview);
      songs.push({
        id: `requested-${slug}-${safeText(String(track.id || songs.length), 80)}`,
        title,
        artist,
        album: safeText(album.name, 160) || `${artist} Essentials`,
        genre: 'Spotify Artist Catalog',
        countryCode: 'GLOBAL',
        releaseYear: Number.isFinite(releaseYear) ? releaseYear : undefined,
        artworkUrl,
        previewUrl: `/api/music/preview?${params.toString()}`,
        spotifyTrackId: safeText(track.id, 80),
        spotifyUri: safeText(track.uri, 120),
        spotifyUrl: safeHttpsUrl(track.external_urls?.spotify || album.external_urls?.spotify),
        difficulty: songs.length < 5 ? 'EASY' : songs.length < 20 ? 'MEDIUM' : 'HARD'
      });
      if (songs.length >= 50) break;
    }
    if (songs.length >= 50) break;
  }

  if (songs.length === 0) {
    throw new Error(`No Spotify tracks returned for "${spotifyArtist.name || name}".`);
  }

  return {
    slug,
    name: safeText(spotifyArtist.name, 100) || name,
    spotifyArtistId: safeText(spotifyArtist.id, 80),
    spotifyUrl: safeHttpsUrl(spotifyArtist.external_urls?.spotify),
    songIds: songs.map((song) => song.id),
    songs,
    songsCount: songs.length,
    coverImage: safeHttpsUrl(spotifyArtist.images?.[0]?.url) || songs[0]?.artworkUrl || '',
    status: 'ready',
    createdAt: new Date().toISOString()
  };
}

async function main(): Promise<void> {
  const existing = await readJsonFile<RequestedArtist[]>(REQUESTS_PATH, []);
  const existingBaseSlugs = new Set(existing
    .filter((artist) => (artist.songsCount || 0) >= MIN_SONGS)
    .map((artist) => artist.slug.replace(/-[a-z0-9]{8}$/, '')));
  const targetArtists = getArtistChallenges()
    .filter((artist) => artist.songsCount < MIN_SONGS && !existingBaseSlugs.has(artist.slug))
    .slice(0, LIMIT > 0 ? LIMIT : undefined);

  console.log(`Backfilling ${targetArtists.length} artist packs with min ${MIN_SONGS} songs target.`);
  const rebuilt = [...existing];
  for (const artist of targetArtists) {
    try {
      console.log(`building ${artist.name}...`);
      const pack = await buildArtistPack(artist.name);
      const withoutOld = rebuilt.filter((item) => item.spotifyArtistId !== pack.spotifyArtistId && item.slug !== pack.slug);
      rebuilt.splice(0, rebuilt.length, pack, ...withoutOld);
      await writeJsonFile(REQUESTS_PATH, rebuilt);
      console.log(`ready ${pack.name}: ${pack.songsCount} songs`);
      await sleep(250);
    } catch (error) {
      console.warn(`skipped ${artist.name}: ${error instanceof Error ? error.message : error}`);
      await sleep(750);
    }
  }
  console.log(`Saved ${rebuilt.length} requested/rebuilt artist packs to ${REQUESTS_PATH}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
