import { COUNTRIES, Country } from '../data/countries';
import { QUIZ_COLLECTIONS } from '../data/quizCollections';
import { ALL_SONGS } from '../data/moroccanSongs';
import { AdminCustomPack, PublicRuntimeConfig } from '../adminTypes';
import { QuizCollection, Song } from '../types';
import { getInitialPublicRuntimeConfig } from './runtimeConfig';

export function getRuntimeCountries(config: PublicRuntimeConfig = getInitialPublicRuntimeConfig()): Country[] {
  const custom = Array.isArray(config.customCountries) ? config.customCountries : [];
  const byCode = new Map<string, Country>();
  [...COUNTRIES, ...custom].forEach((country) => {
    if (!country.code || !country.name) return;
    byCode.set(country.code, country);
  });
  return Array.from(byCode.values());
}

export function getRuntimeCustomPacks(config: PublicRuntimeConfig = getInitialPublicRuntimeConfig()): AdminCustomPack[] {
  return Array.isArray(config.customPacks) ? config.customPacks : [];
}

export function getRuntimeCollections(config: PublicRuntimeConfig = getInitialPublicRuntimeConfig()): QuizCollection[] {
  const custom = getRuntimeCustomPacks(config);
  const customIds = new Set(custom.map((pack) => pack.id));
  return [...custom, ...QUIZ_COLLECTIONS.filter((collection) => !customIds.has(collection.id))];
}

export function getCollectionSongs(collection: QuizCollection): Song[] {
  if (collection.songs?.length) return collection.songs;
  const songById = new Map(ALL_SONGS.map((song) => [song.id, song]));
  return collection.songIds
    .map((songId) => songById.get(songId))
    .filter((song): song is Song => Boolean(song));
}

export function getSongsForRuntimeCountry(countryCode: string, config: PublicRuntimeConfig = getInitialPublicRuntimeConfig()): Song[] {
  const customSongs = getRuntimeCustomPacks(config)
    .filter((pack) => pack.packType === 'country' && pack.countryCode === countryCode)
    .flatMap((pack) => pack.songs || []);
  const staticSongs = ALL_SONGS.filter((song) => countryCode === 'GLOBAL' || song.countryCode === countryCode);
  const byId = new Map<string, Song>();
  [...customSongs, ...staticSongs].forEach((song) => byId.set(song.id, song));
  return Array.from(byId.values());
}

export function getSongsForRuntimeGenre(slug: string, config: PublicRuntimeConfig = getInitialPublicRuntimeConfig()): Song[] {
  return getRuntimeCustomPacks(config)
    .filter((pack) => pack.packType === 'genre' && pack.genreSlug === slug)
    .flatMap((pack) => pack.songs || []);
}
