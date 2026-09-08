import { Song } from '../types';

export function normalizeSearchText(value: string | undefined | null): string {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tokenStartsWith(text: string, query: string): boolean {
  return text
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .some((token) => token.startsWith(query));
}

function includesAny(values: Array<string | undefined | null>, query: string): boolean {
  return values.some((value) => normalizeSearchText(value).includes(query));
}

export function getPackSearchRank({
  query,
  title,
  alternateTitles = [],
  metadata = [],
  songs = []
}: {
  query: string;
  title: string;
  alternateTitles?: Array<string | undefined | null>;
  metadata?: Array<string | undefined | null>;
  songs?: Song[];
}): number | null {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const normalizedTitle = normalizeSearchText(title);
  const normalizedAlternateTitles = alternateTitles.map(normalizeSearchText).filter(Boolean);
  const searchableTitles = [normalizedTitle, ...normalizedAlternateTitles];

  if (searchableTitles.some((value) => value === q)) return 1;
  if (searchableTitles.some((value) => value.startsWith(q))) return 2;
  if (searchableTitles.some((value) => tokenStartsWith(value, q))) return 3;
  if (searchableTitles.some((value) => value.includes(q))) return 4;

  if (includesAny(metadata, q)) return 10;
  if (songs.some((song) => includesAny([song.title, song.album, song.genre], q))) return 20;
  if (songs.some((song) => includesAny([song.artist, song.nativeArtist, song.artistArabic], q))) return 30;

  return null;
}
