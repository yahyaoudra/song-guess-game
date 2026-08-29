import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, Crown, MapPin, Mic2, Play, Tags, Trophy } from 'lucide-react';
import { Difficulty, GameMode, StreakData, ThemeColor } from '../types';
import { AuthSessionResponse, RequestedArtist } from '../adminTypes';
import { DIFFICULTY_COLORS } from '../data/moroccanSongs';
import { QUIZ_COLLECTIONS } from '../data/quizCollections';
import { COUNTRIES } from '../data/countries';
import { getArtistChallenges, getGenreChallenges, orderArtistsByFeaturedPriority } from '../utils/challengeCatalog';
import { getArtistPath, getCountryPath, getGenrePath } from '../utils/runtimeConfig';
import { AccountMenu } from './AccountMenu';

interface HeaderNavProps {
  mode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onOpenCollections: () => void;
  onOpenLeaderboard: () => void;
  onOpenFaq: () => void;
  selectedCountryCode: string;
  volume: number;
  onVolumeChange: (newVol: number) => void;
  roundNumber: number;
  totalRounds: number;
  difficulty: Difficulty;
  currentPoints: number;
  themeOverride?: ThemeColor | 'auto';
  collectionTitle?: string;
  streakData?: StreakData;
  featuredArtistSlugs?: string[];
  requestedArtists?: RequestedArtist[];
  activeChallengeType?: 'artist' | 'genre' | null;
  activeChallengeSlug?: string | null;
  onSelectCountry?: (countryCode: string) => void;
  onOpenCountryArchive?: () => void;
  onOpenArtist?: (slug: string) => void;
  onOpenArtists?: () => void;
  onOpenGenre?: (slug: string) => void;
  onOpenGenres?: () => void;
  onOpenHome?: () => void;
  onOpenAuth?: () => void;
  onOpenPaywall?: () => void;
  isUnlocked?: boolean;
  authSession: AuthSessionResponse;
  onAuthSessionChange: (session: AuthSessionResponse) => void;
}

const spotifySuffixPattern = /-[a-z0-9]{8}$/;

function baseArtistSlug(slug: string): string {
  return slug.replace(spotifySuffixPattern, '');
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  mode,
  onSelectMode,
  onOpenCollections,
  onOpenLeaderboard,
  onOpenFaq,
  selectedCountryCode,
  volume,
  onVolumeChange,
  roundNumber,
  totalRounds,
  difficulty,
  currentPoints,
  themeOverride = 'auto',
  collectionTitle,
  streakData,
  featuredArtistSlugs,
  requestedArtists = [],
  activeChallengeType = null,
  activeChallengeSlug = null,
  onSelectCountry,
  onOpenCountryArchive,
  onOpenArtist,
  onOpenArtists,
  onOpenGenre,
  onOpenGenres,
  onOpenHome,
  onOpenAuth,
  onOpenPaywall,
  isUnlocked = false,
  authSession,
  onAuthSessionChange
}) => {
  const [timeRemaining, setTimeRemaining] = useState('21:15:33');

  const activeCountry = COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];
  const featuredCountries = useMemo(() => {
    const featuredCodes = ['GLOBAL', 'MA', 'US', 'GB', 'FR', 'KR', 'IN', 'BR', 'NG', 'JP'];
    return featuredCodes.flatMap((code) => {
      const country = COUNTRIES.find((item) => item.code === code);
      return country ? [country] : [];
    });
  }, []);
  const allArtistChallenges = useMemo(() => getArtistChallenges(), []);
  const allArtists = useMemo(() => {
    const requestedReady = requestedArtists
      .filter((artist) => artist.status === 'ready' && artist.songsCount > 0)
      .map((artist) => ({
        slug: artist.slug,
        name: artist.name,
        songsCount: artist.songsCount,
        countryCodes: ['GLOBAL'],
        coverImage: artist.coverImage
      }));
    const requestedSlugs = new Set(requestedReady.map((artist) => artist.slug));
    const rebuiltBaseSlugs = new Set(requestedReady.map((artist) => baseArtistSlug(artist.slug)));
    return orderArtistsByFeaturedPriority([
      ...requestedReady,
      ...allArtistChallenges.filter((artist) => !requestedSlugs.has(artist.slug) && !rebuiltBaseSlugs.has(artist.slug))
    ]);
  }, [allArtistChallenges, requestedArtists]);
  const featuredArtists = useMemo(() => {
    const bySlug = new Map(allArtists.map((artist) => [artist.slug, artist]));
    allArtists.forEach((artist) => {
      const baseSlug = baseArtistSlug(artist.slug);
      if (!bySlug.has(baseSlug)) bySlug.set(baseSlug, artist);
    });
    const configured = (featuredArtistSlugs || []).flatMap((slug) => {
      const artist = bySlug.get(slug) || bySlug.get(baseArtistSlug(slug));
      return artist ? [artist] : [];
    });
    const selected = configured.length > 0 ? configured : allArtists.slice(0, 24);
    return selected.slice(0, 24);
  }, [allArtists, featuredArtistSlugs]);
  const featuredGenres = useMemo(() => getGenreChallenges(), []);

  const activeColor =
    themeOverride !== 'auto' && themeOverride
      ? themeOverride === 'green'
        ? '#00e676'
        : themeOverride === 'yellow'
        ? '#ffd600'
        : themeOverride === 'orange'
        ? '#ff9100'
        : themeOverride === 'red'
        ? '#ff5252'
        : themeOverride === 'purple'
        ? '#c084fc'
        : '#00e5ff'
      : DIFFICULTY_COLORS[difficulty]?.accent || '#00e676';

  // Calculate countdown until midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      const diffMs = tomorrow.getTime() - now.getTime();

      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
      const seconds = Math.floor((diffMs / 1000) % 60);

      setTimeRemaining(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const availablePlaylistsCount =
    selectedCountryCode === 'GLOBAL'
      ? QUIZ_COLLECTIONS.length
      : QUIZ_COLLECTIONS.filter((c) => c.countryCode === selectedCountryCode || c.countryCode === 'GLOBAL').length;
  const menuButtonClass =
    'flex h-11 w-full items-center gap-2 rounded-lg border border-white/10 bg-[#121815]/85 px-3 text-xs text-white/70 hover:border-white/20 hover:bg-[#18201c] cursor-pointer transition-colors list-none [&::-webkit-details-marker]:hidden';
  const menuPanelClass =
    'absolute left-0 right-0 top-full mt-2 z-[90] max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-[#101612] p-1.5 shadow-2xl';
  const menuLinkClass =
    'flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-bold text-white/75 hover:bg-white/10 hover:text-white transition-colors';
  const countryMenuLabel = activeChallengeType ? 'Featured countries' : activeCountry.name;
  const artistMenuLabel =
    activeChallengeType === 'artist' && collectionTitle ? collectionTitle : 'Featured artists';
  const genreMenuLabel =
    activeChallengeType === 'genre' && collectionTitle ? collectionTitle : 'Featured genres';
  const browsePillIcon =
    activeChallengeType === 'artist' ? (
      <Mic2 className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
    ) : activeChallengeType === 'genre' ? (
      <Tags className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
    ) : (
      <span className="text-base leading-none">{activeCountry.flag}</span>
    );
  const browsePillMeta =
    activeChallengeType === 'artist'
      ? 'artist game'
      : activeChallengeType === 'genre'
      ? 'genre game'
      : `${availablePlaylistsCount} packs`;

  const closeMenu = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const details = event.currentTarget.closest('details');
    if (details) {
      details.open = false;
    }
  };

  return (
    <header className="relative z-[80] w-full max-w-5xl mx-auto pt-4 sm:pt-6 px-3 sm:px-4 flex flex-col items-center select-none gap-3">
      {/* Top Brand, Challenge Menus & Utility Bar */}
      <div className="w-full grid grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pb-2 border-b border-white/10">
        <div className="flex items-center justify-between gap-2 sm:gap-3 xl:justify-start">
          {/* Logo / App Name */}
          <a
            href="/"
            onClick={(event) => {
              if (!onOpenHome) return;
              event.preventDefault();
              onOpenHome();
            }}
            className="flex items-center gap-1.5 font-black text-sm sm:text-base tracking-tight text-white hover:text-[#00e676] transition-colors"
            aria-label="Song Guess Game home"
          >
            <img src="/favicon.png" alt="" className="h-7 w-7 rounded-full object-cover" />
            <span className="hidden xs:inline">Song Guess Game</span>
            <span className="xs:hidden">Song Guess</span>
          </a>
          <div className="flex items-center gap-1.5 xl:hidden">
            <AccountMenu
              session={authSession}
              onOpenAuth={onOpenAuth || (() => undefined)}
              onSessionChange={onAuthSessionChange}
            />
            {!isUnlocked && (
              <button
                onClick={onOpenPaywall}
                className="flex h-9 items-center gap-1 rounded-full bg-[#00e676] px-2.5 text-[11px] font-black text-black shadow-[0_10px_28px_rgba(0,230,118,0.18)] transition-colors hover:bg-[#1fe682]"
              >
                <Crown className="h-3.5 w-3.5" />
                <span>Unlock</span>
              </button>
            )}
          </div>
        </div>

        <nav
          id="seo-challenge-menu"
          aria-label="Music challenge menus"
          className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 order-3 xl:order-none"
        >
          <details className="group/menu relative">
            <summary className={menuButtonClass} title="Featured countries">
              <MapPin className="w-4 h-4 text-[#00e676] shrink-0" />
              <span className="min-w-0 flex-1 truncate font-bold text-white">
                {countryMenuLabel}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 transition-transform group-open/menu:rotate-180" />
            </summary>
            <div className={menuPanelClass}>
              {featuredCountries.map((country) => (
                <a
                  key={country.code}
                  href={getCountryPath(country.code)}
                  aria-current={!activeChallengeType && selectedCountryCode === country.code ? 'page' : undefined}
                  onClick={(event) => {
                    if (!onSelectCountry) return;
                    event.preventDefault();
                    closeMenu(event);
                    onSelectCountry(country.code);
                  }}
                  className={menuLinkClass}
                >
                  <span className="text-base leading-none">{country.flag}</span>
                  <span className="truncate">{country.name}</span>
                </a>
              ))}
              <a
                href="/play/country"
                onClick={(event) => {
                  if (!onOpenCountryArchive) return;
                  event.preventDefault();
                  closeMenu(event);
                  onOpenCountryArchive();
                }}
                className={`${menuLinkClass} border-t border-white/10 text-[#00e676]`}
              >
                Browse all countries
              </a>
            </div>
          </details>

          <details className="group/menu relative">
            <summary className={menuButtonClass} title="Featured artists">
              <Mic2 className="w-4 h-4 text-yellow-300 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-bold text-white">
                {artistMenuLabel}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 transition-transform group-open/menu:rotate-180" />
            </summary>
            <div className={menuPanelClass}>
              {featuredArtists.map((artist) => (
                <a
                  key={artist.slug}
                  href={getArtistPath(artist.slug)}
                  aria-current={activeChallengeType === 'artist' && activeChallengeSlug === artist.slug ? 'page' : undefined}
                  onClick={(event) => {
                    if (!onOpenArtist) return;
                    event.preventDefault();
                    closeMenu(event);
                    onOpenArtist(artist.slug);
                  }}
                  className={menuLinkClass}
                >
                  <span className="truncate">{artist.name}</span>
                </a>
              ))}
              <a
                href="/artist"
                onClick={(event) => {
                  if (!onOpenArtists) return;
                  event.preventDefault();
                  closeMenu(event);
                  onOpenArtists();
                }}
                className={`${menuLinkClass} border-t border-white/10 text-yellow-200`}
              >
                Browse all artists
              </a>
            </div>
          </details>

          <details className="group/menu relative">
            <summary className={menuButtonClass} title="Featured genres">
              <Tags className="w-4 h-4 text-cyan-300 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-bold text-white">
                {genreMenuLabel}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 transition-transform group-open/menu:rotate-180" />
            </summary>
            <div className={menuPanelClass}>
              {featuredGenres.map((genre) => (
                <a
                  key={genre.slug}
                  href={getGenrePath(genre.slug)}
                  aria-current={activeChallengeType === 'genre' && activeChallengeSlug === genre.slug ? 'page' : undefined}
                  onClick={(event) => {
                    if (!onOpenGenre) return;
                    event.preventDefault();
                    closeMenu(event);
                    onOpenGenre(genre.slug);
                  }}
                  className={menuLinkClass}
                >
                  <span className="truncate">{genre.name}</span>
                </a>
              ))}
              <a
                href="/play/genre"
                onClick={(event) => {
                  if (!onOpenGenres) return;
                  event.preventDefault();
                  closeMenu(event);
                  onOpenGenres();
                }}
                className={`${menuLinkClass} border-t border-white/10 text-cyan-200`}
              >
                Browse all genres
              </a>
            </div>
          </details>
        </nav>

        {/* Account & Unlock */}
        <div className="hidden items-center gap-2 justify-end order-2 xl:order-none xl:flex">
          <AccountMenu
            session={authSession}
            onOpenAuth={onOpenAuth || (() => undefined)}
            onSessionChange={onAuthSessionChange}
          />
          {!isUnlocked && (
            <button
              onClick={onOpenPaywall}
              className="flex h-9 items-center gap-1.5 rounded-full bg-[#00e676] px-3 text-xs font-black text-black shadow-[0_10px_28px_rgba(0,230,118,0.18)] transition-colors hover:bg-[#1fe682]"
            >
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Unlock unlimited</span>
              <span className="sm:hidden">Unlock</span>
            </button>
          )}
          {isUnlocked && authSession.entitlement.accessUntil && (
            <span className="flex h-9 items-center rounded-full border border-[#00e676]/30 bg-[#00e676]/10 px-3 text-xs font-black text-[#00e676]">
              {Math.max(0, Math.ceil((new Date(authSession.entitlement.accessUntil).getTime() - Date.now()) / 86400000))} days left
            </span>
          )}
        </div>
      </div>

      {/* Center 3-Pill Navigation */}
      <div
        id="top-nav-pills"
        className="flex items-center bg-[#141a17]/90 border border-white/10 rounded-full p-1 shadow-lg backdrop-blur-md"
      >
        <button
          id="nav-daily-btn"
          onClick={() => onSelectMode('daily')}
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer ${
            mode === 'daily'
              ? 'text-black shadow-md'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
          style={{
            backgroundColor: mode === 'daily' ? activeColor : 'transparent',
          }}
        >
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">Daily 5</span>
        </button>

        <button
          id="nav-practice-btn"
          onClick={() => onSelectMode('practice')}
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer ${
            mode === 'practice'
              ? 'text-black shadow-md'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
          style={{
            backgroundColor: mode === 'practice' ? activeColor : 'transparent',
          }}
        >
          <Play className="h-4 w-4" />
          <span className="hidden sm:inline">Practice</span>
        </button>

        <button
          id="nav-leaderboard-btn"
          onClick={onOpenLeaderboard}
          className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-1.5 rounded-full text-xs md:text-sm font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer"
        >
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Leaderboard</span>
        </button>
      </div>

      {/* Browse Music Quizzes & Country Playlists Button */}
      <div>
        <button
          id="browse-quizzes-btn"
          onClick={onOpenCollections}
          className="group flex items-center gap-2 px-4 py-1 rounded-full border border-white/15 bg-[#121815]/80 hover:bg-[#1a231f] transition-colors text-xs font-semibold backdrop-blur-sm cursor-pointer shadow-sm"
        >
          {browsePillIcon}
          <span
            className="font-bold transition-colors"
            style={{ color: activeColor }}
          >
            {collectionTitle ? collectionTitle : `${activeCountry.name} Playlists & Quizzes`}
          </span>
          <span className="text-white/40">•</span>
          <span className="text-white/60 group-hover:text-white/90">
            {browsePillMeta}
          </span>
        </button>
      </div>

      {/* Round & Info Bar */}
      <div
        id="round-info-bar"
        className="w-full max-w-lg mt-2 flex items-center justify-between text-xs tracking-wider font-mono font-bold text-white/70 px-2"
      >
        {/* Left: Round & Difficulty */}
        <div className="flex items-center gap-2 uppercase">
          <span>ROUND {roundNumber} / {totalRounds}</span>
          <span className="text-white/30">•</span>
          <span
            className="font-black"
            style={{ color: activeColor }}
          >
            {difficulty}
          </span>
        </div>

        {/* Center: Live Points */}
        <div
          id="live-points-counter"
          className="text-sm font-mono font-black transition-all transform hover:scale-105"
          style={{ color: activeColor }}
        >
          {currentPoints} PTS
        </div>

        {/* Right: Countdown to next daily */}
        <div className="flex items-center gap-1.5 text-white/50 font-mono">
          <span title="Countdown to next Daily 5">{timeRemaining}</span>
        </div>
      </div>
    </header>
  );
};
