import { Song } from '../types';

export function shuffleItems<T>(items: readonly T[] | T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function shuffleSongsAcrossAlbums(songs: readonly Song[] | Song[]): Song[] {
  const albumGroups = new Map<string, Song[]>();
  songs.forEach((song) => {
    const albumKey = `${song.album || 'unknown'}::${song.albumType || 'track'}`;
    albumGroups.set(albumKey, [...(albumGroups.get(albumKey) || []), song]);
  });

  const queues = shuffleItems(Array.from(albumGroups.values()).map((group) => shuffleItems(group)));
  const result: Song[] = [];
  let hasSongs = true;

  while (hasSongs) {
    hasSongs = false;
    for (const queue of shuffleItems(queues)) {
      const next = queue.shift();
      if (next) {
        result.push(next);
        hasSongs = true;
      }
    }
  }

  return result;
}
