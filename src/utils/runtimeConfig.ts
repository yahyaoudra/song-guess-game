import { COUNTRIES } from '../data/countries';
import { AdminPageConfig, PublicRuntimeConfig } from '../adminTypes';
import {
  getArtistChallenge,
  getCountryName,
  getGenreChallenge,
  slugifyChallenge
} from './challengeCatalog';

declare global {
  interface Window {
    __SONG_GUESS_PUBLIC_CONFIG__?: PublicRuntimeConfig;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
    adsbygoogle?: unknown[];
  }
}

const DEFAULT_APP_URL = 'https://songguessgame.online';
const LEGAL_PATHS = new Set(['privacy', 'gdpr', 'california-privacy', 'california', 'terms', 'cookies']);

export function normalizePublicAppUrl(rawUrl?: string): string {
  const raw = (rawUrl || '').trim();
  if (!raw) return DEFAULT_APP_URL;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.origin.replace(/\/+$/, '');
  } catch {
    return DEFAULT_APP_URL;
  }
}

export function slugifyRouteSegment(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function artistNameFromSlugFallback(slug: string): string {
  const parts = slug.split('-').filter(Boolean);
  const withoutSpotifySuffix =
    parts.length > 2 && /^[a-z0-9]{8}$/.test(parts[parts.length - 1])
      ? parts.slice(0, -1)
      : parts;
  return withoutSpotifySuffix
    .join(' ')
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

export function createDefaultPageConfig(countryCode: string, appUrl = DEFAULT_APP_URL): AdminPageConfig {
  const country = COUNTRIES.find((item) => item.code === countryCode) || COUNTRIES[0];
  const cleanAppUrl = normalizePublicAppUrl(appUrl);
  const slug = country.code === 'GLOBAL' ? '' : slugifyRouteSegment(country.name);
  const path = country.code === 'GLOBAL' ? '/play' : `/play/${slug}`;
  const countryName = country.code === 'GLOBAL' ? 'Global' : country.name;

  return {
    countryCode: country.code,
    slug,
    pageTitle:
      country.code === 'GLOBAL'
        ? 'Song Guess Game - Global Song Trivia & Daily Music Quiz'
        : `${countryName} Song Guess Game - Daily Music Trivia`,
    metaDescription: `Play the daily ${countryName} music quiz. Guess hit songs from short audio snippets, challenge friends, and explore country playlists by era and genre.`,
    keywords: `song guess game, music quiz, ${countryName} songs, audio trivia, daily song quiz`,
    canonicalUrl: `${cleanAppUrl}${path}`,
    customHeading: `${countryName} Song Guess - Heardle`,
    customIntroText: 'Listen to short snippets, guess the title, and share your score card.',
    socialTitle:
      country.code === 'GLOBAL' ? 'Song Guess Game' : `${countryName} Song Guess Game`,
    socialDescription: `Can you recognize ${countryName} hits from tiny audio snippets?`,
    socialImageUrl: '',
    updatedAt: new Date().toISOString()
  };
}

export function createDefaultPublicRuntimeConfig(): PublicRuntimeConfig {
  const appUrl = normalizePublicAppUrl(
    import.meta.env.VITE_APP_URL || import.meta.env.VITE_DOMAIN_NAME
  );
  const pageConfigs = Object.fromEntries(
    COUNTRIES.map((country) => [country.code, createDefaultPageConfig(country.code, appUrl)])
  );

  return {
    appUrl,
    host: new URL(appUrl).host,
    recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
    integrations: {
      analyticsEnabled: false,
      googleAnalyticsMeasurementId: '',
      clarityEnabled: false,
      microsoftClarityProjectId: '',
      adsenseEnabled: false,
      googleAdsenseClientId: '',
      searchConsoleVerification: ''
    },
    pageConfigs,
    routeConfigs: {},
    featuredArtistSlugs: [],
    adSlots: [],
    robotsTxt: '',
    generatedAt: new Date().toISOString(),
    adminEntryRequested: false
  };
}

export function createDefaultRouteConfig(routeKey: string, appUrl = DEFAULT_APP_URL): AdminPageConfig {
  const cleanAppUrl = normalizePublicAppUrl(appUrl);
  const now = new Date().toISOString();

  if (routeKey === 'system:home') {
    return {
      countryCode: 'GLOBAL',
      slug: '',
      pageTitle: 'Song Guess Game - Music Trivia by Artist, Genre & Country',
      metaDescription: 'Play Song Guess Game online. Guess songs from tiny snippets, explore artist discographies, country packs, genres, multiplayer modes, and unlimited play.',
      keywords: 'song guess game, heardle, music quiz, song trivia, artist heardle, genre heardle, country music quiz',
      canonicalUrl: `${cleanAppUrl}/`,
      customHeading: 'Guess the Song Game',
      customIntroText: 'Guess songs by artist, genre, country, and era.',
      socialTitle: 'Song Guess Game - Music Trivia by Artist, Genre & Country',
      socialDescription: 'A Heardle-style song guessing game with artists, genres, countries, multiplayer, and unlimited play.',
      socialImageUrl: '',
      updatedAt: now
    };
  }

  if (routeKey === 'system:contact') {
    return {
      countryCode: 'GLOBAL',
      slug: 'contact',
      pageTitle: 'Contact Song Guess Game',
      metaDescription: 'Contact Song Guess Game for support, artist requests, partnerships, advertising, and product feedback.',
      keywords: 'contact song guess game, song guess support, music quiz contact',
      canonicalUrl: `${cleanAppUrl}/contact`,
      customHeading: 'Contact Song Guess Game',
      customIntroText: 'Send a message to the Song Guess Game team.',
      socialTitle: 'Contact Song Guess Game',
      socialDescription: 'Send a message to the Song Guess Game team.',
      socialImageUrl: '',
      updatedAt: now
    };
  }

  if (routeKey === 'system:artist-index') {
    return {
      countryCode: 'GLOBAL',
      slug: 'artist',
      pageTitle: 'Browse Artist Heardle Challenges - Song Guess Game',
      metaDescription: 'Browse artist song guessing challenges and play Heardle-style games for your favorite singers, bands, and groups.',
      keywords: 'artist heardle, artist song guess, music quiz artists, song guessing game',
      canonicalUrl: `${cleanAppUrl}/artist`,
      customHeading: 'Browse Artist Song Guess Games',
      customIntroText: 'Search artists and start a focused Heardle challenge.',
      socialTitle: 'Browse Artist Heardle Challenges',
      socialDescription: 'Pick an artist and play a song guessing challenge.',
      socialImageUrl: '',
      updatedAt: now
    };
  }

  if (routeKey === 'system:genre-index') {
    return {
      countryCode: 'GLOBAL',
      slug: 'play/genre',
      pageTitle: 'Browse Genre Heardle Challenges - Song Guess Game',
      metaDescription: 'Browse K-Pop, Bollywood, American rap, country, 80s, 90s, and more genre song guessing games.',
      keywords: 'genre heardle, k-pop heardle, bollywood heardle, rap song guess, 80s music quiz, 90s music quiz',
      canonicalUrl: `${cleanAppUrl}/play/genre`,
      customHeading: 'Browse Genre Song Guess Games',
      customIntroText: 'Pick a genre or era and start a focused music challenge.',
      socialTitle: 'Browse Genre Heardle Challenges',
      socialDescription: 'Choose a genre or era and play Song Guess Game.',
      socialImageUrl: '',
      updatedAt: now
    };
  }

  if (routeKey === 'system:country-index') {
    return {
      countryCode: 'GLOBAL',
      slug: 'play/country',
      pageTitle: 'Browse Country Song Guess Games - Song Guess Game',
      metaDescription: 'Browse country music guessing games and play Heardle-style challenges for global, Moroccan, American, Korean, Indian, Brazilian, and more music scenes.',
      keywords: 'country heardle, country song guess, music quiz countries, global song guessing game',
      canonicalUrl: `${cleanAppUrl}/play/country`,
      customHeading: 'Browse Country Song Guess Games',
      customIntroText: 'Pick a country and start a focused music scene challenge.',
      socialTitle: 'Browse Country Song Guess Games',
      socialDescription: 'Choose a country and play Song Guess Game.',
      socialImageUrl: '',
      updatedAt: now
    };
  }

  if (routeKey.startsWith('artist:')) {
    const slug = slugifyChallenge(routeKey.slice('artist:'.length));
    const artist = getArtistChallenge(slug);
    const name = artist?.name || artistNameFromSlugFallback(slug);
    return {
      countryCode: 'GLOBAL',
      slug,
      pageTitle: `${name} Song Guess Quiz - Unofficial Fan Game`,
      metaDescription: `Play an unofficial fan-made ${name} song guessing quiz on Song Guess Game. Guess short music snippets. Not affiliated with ${name}, Spotify, or any record label.`,
      keywords: `${name} heardle, ${name} song guess, ${name} music quiz`,
      canonicalUrl: `${cleanAppUrl}/artist/${slug}`,
      customHeading: `${name} Song Guess Quiz`,
      customIntroText: `Unofficial fan-made music trivia. Not affiliated with ${name}, Spotify, or any record label.`,
      socialTitle: `${name} Song Guess Quiz - Unofficial Fan Game`,
      socialDescription: `Guess ${name} songs from tiny snippets in this unofficial fan-made Song Guess Game challenge. Not affiliated with ${name}, Spotify, or any record label.`,
      socialImageUrl: artist?.coverImage || '',
      updatedAt: now
    };
  }

  if (routeKey.startsWith('genre:')) {
    const slug = slugifyChallenge(routeKey.slice('genre:'.length));
    const genre = getGenreChallenge(slug);
    const name = genre?.name || slug.replace(/-/g, ' ');
    return {
      countryCode: 'GLOBAL',
      slug,
      pageTitle: `${name} Song Guess - Heardle`,
      metaDescription: `Play the ${name} song guessing challenge. Guess ${name} tracks from short audio snippets.`,
      keywords: `${name} heardle, ${name} song guess, ${name} music quiz`,
      canonicalUrl: `${cleanAppUrl}/play/genre/${slug}`,
      customHeading: `${name} Song Guess - Heardle`,
      customIntroText: genre?.description || `Play a focused ${name} music challenge.`,
      socialTitle: `${name} Song Guess - Heardle`,
      socialDescription: `Can you recognize ${name} songs from tiny snippets?`,
      socialImageUrl: genre?.coverImage || '',
      updatedAt: now
    };
  }

  return {
    countryCode: 'GLOBAL',
    slug: 'play',
    pageTitle: 'Song Guess Game - Global Heardle Music Quiz',
    metaDescription: 'Play the global Song Guess Game. Guess hit songs from short audio snippets and share your score.',
    keywords: 'song guess game, heardle, music quiz, guess the song',
    canonicalUrl: `${cleanAppUrl}/play`,
    customHeading: 'Global Song Guess - Heardle',
    customIntroText: 'Play the global playlist and guess each song from short snippets.',
    socialTitle: 'Song Guess Game - Global Heardle',
    socialDescription: 'Guess songs from tiny audio snippets and challenge friends.',
    socialImageUrl: '',
    updatedAt: now
  };
}

export function getInitialPublicRuntimeConfig(): PublicRuntimeConfig {
  if (typeof window !== 'undefined' && window.__SONG_GUESS_PUBLIC_CONFIG__) {
    return window.__SONG_GUESS_PUBLIC_CONFIG__;
  }
  return createDefaultPublicRuntimeConfig();
}

export async function fetchPublicRuntimeConfig(): Promise<PublicRuntimeConfig> {
  const response = await fetch('/api/public-config', {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Public config request failed with ${response.status}`);
  }

  const config = (await response.json()) as PublicRuntimeConfig;
  if (typeof window !== 'undefined') {
    window.__SONG_GUESS_PUBLIC_CONFIG__ = config;
  }
  return config;
}

export function getCountryPath(countryCode?: string, config = getInitialPublicRuntimeConfig()): string {
  if (!countryCode || countryCode === 'GLOBAL') return '/play';
  const slug = config.pageConfigs[countryCode]?.slug || slugifyRouteSegment(
    COUNTRIES.find((country) => country.code === countryCode)?.name || countryCode
  );
  return slug ? `/play/${slug}` : '/play';
}

export function getCountryCodeFromPath(pathname: string, config = getInitialPublicRuntimeConfig()): string | null {
  const segments = pathname.split('/').filter(Boolean).map((segment) => segment.toLowerCase());
  const segment = segments[0] || '';
  if (!segment || LEGAL_PATHS.has(segment) || segment === 'artist') return null;

  if (segment === 'play') {
    if (!segments[1]) return 'GLOBAL';
    if (segments[1] === 'genre') return null;
    const playSlug = segments[1];
    const playBySlug = Object.values(config.pageConfigs).find(
      (page) => page.slug.toLowerCase() === playSlug
    );
    if (playBySlug) return playBySlug.countryCode;
    const playByCode = COUNTRIES.find((country) => country.code.toLowerCase() === playSlug);
    return playByCode?.code || null;
  }

  const bySlug = Object.values(config.pageConfigs).find(
    (page) => page.slug.toLowerCase() === segment
  );
  if (bySlug) return bySlug.countryCode;

  const byCode = COUNTRIES.find((country) => country.code.toLowerCase() === segment);
  return byCode?.code || null;
}

export function getArtistPath(slug: string): string {
  return `/artist/${slugifyChallenge(slug)}`;
}

export function getGenrePath(slug: string): string {
  return `/play/genre/${slugifyChallenge(slug)}`;
}

export function getRouteConfig(routeKey: string, config = getInitialPublicRuntimeConfig()): AdminPageConfig {
  const fallback = createDefaultRouteConfig(routeKey, config.appUrl);
  const configured = config.routeConfigs?.[routeKey];
  if (!routeKey.startsWith('artist:')) return configured || fallback;

  return {
    ...(configured || fallback),
    pageTitle: fallback.pageTitle,
    metaDescription: fallback.metaDescription,
    customHeading: fallback.customHeading,
    customIntroText: fallback.customIntroText,
    socialTitle: fallback.socialTitle,
    socialDescription: fallback.socialDescription,
    canonicalUrl: fallback.canonicalUrl,
    socialImageUrl: configured?.socialImageUrl || fallback.socialImageUrl
  };
}

export function getRouteDisplayName(routeKey: string): string {
  if (routeKey.startsWith('artist:')) {
    return getArtistChallenge(routeKey.slice('artist:'.length))?.name || routeKey.slice('artist:'.length);
  }
  if (routeKey.startsWith('genre:')) {
    return getGenreChallenge(routeKey.slice('genre:'.length))?.name || routeKey.slice('genre:'.length);
  }
  if (routeKey.startsWith('country:')) {
    return getCountryName(routeKey.slice('country:'.length));
  }
  return routeKey;
}

export function getLegalPath(section: string): string {
  return section === 'california' ? '/california-privacy' : `/${section}`;
}

export function getLegalSectionFromPath(pathname: string): string | null {
  const segment = pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
  if (!segment) return null;
  if (segment === 'california-privacy' || segment === 'california') return 'california';
  if (segment === 'privacy' || segment === 'gdpr' || segment === 'terms' || segment === 'cookies') {
    return segment;
  }
  return null;
}
