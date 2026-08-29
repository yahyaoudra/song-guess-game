import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Song, Difficulty, GameMode, GameResult, QuizCollection, UserSettings, TitleDisplayMode, StreakData } from './types';
import { ALL_SONGS, getSongsForCountry, SNIPPET_TIERS } from './data/moroccanSongs';
import { QUIZ_COLLECTIONS, getDefaultCollectionForCountry } from './data/quizCollections';
import { COUNTRIES } from './data/countries';
import { StageLighting } from './components/StageLighting';
import { HeaderNav } from './components/HeaderNav';
import { AudioSnippetPlayer } from './components/AudioSnippetPlayer';
import { GuessAutocomplete } from './components/GuessAutocomplete';
import { RoundReveal } from './components/RoundReveal';
import { GameCompleteModal } from './components/GameCompleteModal';
import { SidebarControls } from './components/SidebarControls';
import { QuizCollectionModal } from './components/QuizCollectionModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { FAQModal } from './components/FAQModal';
import { CountrySelectorModal } from './components/CountrySelectorModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ShareCardModal } from './components/ShareCardModal';
import { AdminBackOfficeModal } from './components/AdminBackOfficeModal';
import { LegalPage, LegalSectionKey } from './components/LegalPage';
import { AdBannerDisplay } from './components/AdBannerDisplay';
import { GoogleIntegrations } from './components/GoogleIntegrations';
import { ArtistBrowserPage } from './components/ArtistBrowserPage';
import { GenreBrowserPage } from './components/GenreBrowserPage';
import { CountryBrowserPage } from './components/CountryBrowserPage';
import { AdInterstitialModal } from './components/AdInterstitialModal';
import { AuthModal } from './components/AuthModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { PaywallModal } from './components/PaywallModal';
import { HomePage } from './components/HomePage';
import { ContactPage } from './components/ContactPage';
import {
  getStoredSettings,
  saveStoredSettings,
  getSavedDailyResult,
  saveDailyResult,
  getTodayDateString,
  getDailyStreak
} from './utils/storage';
import { audioEngine } from './utils/audioPlayer';
import { cacheSongsMetadata, preCacheGameAudioSnippets } from './utils/offlineCache';
import { recordActivity } from './utils/adminApi';
import { getArchivePageHref, parseArchivePage } from './utils/archivePagination';
import { getPublicHost, getShareUrl } from './utils/domain';
import {
  fetchPublicRuntimeConfig,
  getCountryCodeFromPath,
  getCountryPath,
  getArtistPath,
  getGenrePath,
  getRouteConfig,
  getInitialPublicRuntimeConfig,
  getLegalPath,
  getLegalSectionFromPath
} from './utils/runtimeConfig';
import {
  getArtistChallenge,
  getGenreChallenge,
  getSongsByArtistSlug,
  getSongsByGenreSlug
} from './utils/challengeCatalog';
import { AdminConfigState, AdminPageConfig, AuthSessionResponse, RequestedArtist } from './adminTypes';
import { claimFreePlay, createCheckout, fetchRequestedArtists, getAccessStatus, getAuthSession, requestArtist } from './utils/authApi';

const HAS_SEEN_ONBOARDING_KEY = 'songspot_has_seen_onboarding_v2';
const FREE_PLAY_DATE_KEY = 'song_guess_free_play_date_v1';
const FREE_PLAY_SESSION_KEY = 'song_guess_free_play_session_v1';
const SPOTIFY_ARTIST_SUFFIX_PATTERN = /-[a-z0-9]{8}$/;

function baseArtistSlug(slug: string): string {
  return slug.replace(SPOTIFY_ARTIST_SUFFIX_PATTERN, '');
}

type ActiveView = 'home' | 'game' | 'legal' | 'artists' | 'genres' | 'countries' | 'contact';
type ActiveChallenge =
  | { type: 'artist'; slug: string; title: string; songIds?: string[]; songs?: Song[] }
  | { type: 'genre'; slug: string; title: string }
  | null;
type StartGameOptions = {
  clearChallenge?: boolean;
};

export default function App() {
  const [publicConfig, setPublicConfig] = useState(getInitialPublicRuntimeConfig());
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings());
  const [streakData, setStreakData] = useState<StreakData>(() => getDailyStreak());
  const [gameMode, setGameMode] = useState<GameMode>('daily');
  const [activeCollection, setActiveCollection] = useState<QuizCollection | null>(() =>
    getDefaultCollectionForCountry(getStoredSettings().selectedCountry)
  );

  // Active view navigation
  const [activeView, setActiveView] = useState<ActiveView>('game');
  const [legalSection, setLegalSection] = useState<LegalSectionKey>('privacy');
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge>(null);
  const [isInterstitialOpen, setIsInterstitialOpen] = useState(false);
  const lastInterstitialPathRef = useRef('');

  // Modals state
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCountrySelectorOpen, setIsCountrySelectorOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    try {
      return !localStorage.getItem(HAS_SEEN_ONBOARDING_KEY);
    } catch {
      return false;
    }
  });
  const [shareCardResult, setShareCardResult] = useState<GameResult | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('register');
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSessionResponse>({
    authenticated: false,
    entitlement: { active: false },
    databaseConfigured: false,
    stripeConfigured: false
  });
  const [accessNotice, setAccessNotice] = useState<string | null>(null);
  const [requestedArtists, setRequestedArtists] = useState<RequestedArtist[]>([]);
  const [requestedArtistsLoaded, setRequestedArtistsLoaded] = useState(false);
  const [secretAdminClicks, setSecretAdminClicks] = useState(0);

  // Active Game State
  const [roundIndex, setRoundIndex] = useState(0); // 0 to 4 (5 rounds)
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0 to 5 (0.1s to 7s)
  const [isRevealed, setIsRevealed] = useState(false);
  const [roundHistory, setRoundHistory] = useState<
    {
      song: Song;
      isCorrect: boolean;
      pointsEarned: number;
      stepIndex: number;
    }[]
  >([]);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  const [savedResult, setSavedResult] = useState<GameResult | null>(null);

  // Feedback banner state for incorrect guesses
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);

  const [gameSessionKey, setGameSessionKey] = useState<number>(() => Date.now());

  // Fisher-Yates array shuffler helper
  const shuffleArray = useCallback(<T,>(items: readonly T[] | T[]): T[] => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  // Generate freshly randomized songs for Daily (5), Collection (shuffled pack), or Practice (10)
  const gameSongs = useMemo(() => {
    const countryCode = settings.selectedCountry || 'GLOBAL';
    const challengePool =
      activeChallenge?.type === 'artist'
        ? activeChallenge.songs?.length
          ? activeChallenge.songs
          : activeChallenge.songIds
          ? ALL_SONGS.filter((song) => activeChallenge.songIds?.includes(song.id))
          : getSongsByArtistSlug(activeChallenge.slug)
        : activeChallenge?.type === 'genre'
        ? getSongsByGenreSlug(activeChallenge.slug)
        : [];
    const countrySongPool = activeChallenge ? challengePool : getSongsForCountry(countryCode);

    let result: Song[] = [];

    if (activeChallenge) {
      const roundLimit = gameMode === 'daily' ? 5 : 10;
      result = shuffleArray(countrySongPool).slice(0, roundLimit);
    } else if (gameMode === 'collection' && activeCollection) {
      const selected = ALL_SONGS.filter((s) => activeCollection.songIds.includes(s.id));
      if (selected.length > 0) {
        result = shuffleArray(selected);
      } else {
        const categoryMatches = ALL_SONGS.filter(
          (s) =>
            s.genre.toLowerCase().includes(activeCollection.category.toLowerCase()) ||
            activeCollection.title.toLowerCase().includes(s.artist.toLowerCase())
        );
        if (categoryMatches.length > 0) {
          result = shuffleArray(categoryMatches);
        } else {
          result = shuffleArray(countrySongPool).slice(0, 10);
        }
      }
    } else if (gameMode === 'daily') {
      result = shuffleArray(countrySongPool).slice(0, 5);
    } else {
      result = shuffleArray(countrySongPool).slice(0, 10);
    }

    // Persist to offline cache and pre-warm audio
    cacheSongsMetadata(result, countryCode, activeCollection?.id);
    preCacheGameAudioSnippets(result);

    return result;
  }, [activeChallenge, gameMode, activeCollection, settings.selectedCountry, gameSessionKey, shuffleArray]);

  const totalRounds = gameSongs.length;
  const currentSong = gameSongs[roundIndex] || ALL_SONGS[0];

  // Dynamic round difficulties
  const roundDifficulties: Difficulty[] = ['EASY', 'MEDIUM', 'HARD', 'EXPERT', 'IMPOSSIBLE'];
  const currentDifficulty: Difficulty =
    currentSong?.difficulty || roundDifficulties[roundIndex % roundDifficulties.length] || 'EASY';

  // Calculate Running Points
  const totalPoints = roundHistory.reduce((sum, r) => sum + r.pointsEarned, 0);
  const maxPossiblePoints = totalRounds * 1000;

  // Load public runtime config from the server. Production HTML injects an initial copy.
  useEffect(() => {
    let alive = true;
    fetchPublicRuntimeConfig()
      .then((config) => {
        if (alive) setPublicConfig(config);
      })
      .catch((error) => {
        console.debug('Using bundled public config fallback', error);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    audioEngine.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    getAuthSession()
      .then(setAuthSession)
      .catch((error) => {
        console.debug('Player auth session unavailable', error);
      });
    fetchRequestedArtists()
      .then(setRequestedArtists)
      .catch((error) => {
        console.debug('Requested artists unavailable', error);
      })
      .finally(() => setRequestedArtistsLoaded(true));
  }, []);

  // URL routing for legal pages, country routes, and hidden admin entry.
  useEffect(() => {
    const applyRoute = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        const pathname = window.location.pathname;

        if (
          publicConfig.adminEntryRequested ||
          urlParams.get('admin') === '1' ||
          urlParams.get('admin') === 'true' ||
          urlParams.get('secret') === 'admin' ||
          urlParams.get('backoffice') === '1' ||
          hash === '#admin'
        ) {
          setIsAdminOpen(true);
        }

        const authAction = urlParams.get('auth');
        if (authAction === 'verified' || authAction === 'login') {
          setAuthInitialMode('login');
          setIsAuthOpen(true);
          urlParams.delete('auth');
          const nextQuery = urlParams.toString();
          window.history.replaceState({}, document.title, `${pathname}${nextQuery ? `?${nextQuery}` : ''}${hash}`);
        }

        const legacyPage = urlParams.get('page');
        const legalFromPath = getLegalSectionFromPath(pathname);
        const legalFromQuery =
          legacyPage === 'privacy' ||
          legacyPage === 'gdpr' ||
          legacyPage === 'california' ||
          legacyPage === 'terms' ||
          legacyPage === 'cookies'
            ? legacyPage
            : null;
        const legalSectionFromRoute = (legalFromQuery || legalFromPath) as LegalSectionKey | null;

        if (legalSectionFromRoute) {
          setLegalSection(legalSectionFromRoute);
          setActiveView('legal');
          if (legalFromQuery) {
            window.history.replaceState({}, document.title, getLegalPath(legalSectionFromRoute));
          }
          return;
        }

        const segments = pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment).toLowerCase());
        const clearCountrySelectionForChallenge = () => {
          if (settings.selectedCountry && settings.selectedCountry !== 'GLOBAL') {
            const updated = { ...getStoredSettings(), selectedCountry: 'GLOBAL' };
            setSettings(updated);
            saveStoredSettings(updated);
          }
        };

        if (pathname === '/') {
          audioEngine.stop();
          setActiveChallenge(null);
          setActiveView('home');
          return;
        }

        if (segments[0] === 'contact') {
          audioEngine.stop();
          setActiveChallenge(null);
          setActiveView('contact');
          return;
        }

        if (segments[0] === 'artist' && !segments[1]) {
          audioEngine.stop();
          clearCountrySelectionForChallenge();
          setActiveChallenge(null);
          setActiveView('artists');
          return;
        }

        if (segments[0] === 'artist' && segments[1]) {
          clearCountrySelectionForChallenge();
          const artist = getArtistChallenge(segments[1]);
          const requestedArtist = requestedArtists.find((item) => item.slug === segments[1])
            || requestedArtists.find((item) =>
              item.status === 'ready'
              && item.songsCount > 0
              && baseArtistSlug(item.slug) === segments[1]
            );
          if (!artist && !requestedArtist && !requestedArtistsLoaded) {
            return;
          }
          if (!artist && !requestedArtist) {
            audioEngine.stop();
            setActiveChallenge(null);
            setActiveView('artists');
            window.history.replaceState({}, document.title, '/artist');
            return;
          }
          const nextArtist = requestedArtist
            ? { slug: requestedArtist.slug, name: requestedArtist.name, songIds: requestedArtist.songIds, songs: requestedArtist.songs }
            : artist
            ? { slug: artist.slug, name: artist.name, songIds: undefined as string[] | undefined }
            : null;
          if (
            requestedArtist &&
            (requestedArtist.status !== 'ready' || !requestedArtist.songs || requestedArtist.songs.length === 0)
          ) {
            audioEngine.stop();
            setActiveChallenge(null);
            setActiveView('artists');
            window.history.replaceState({}, document.title, '/artist');
            return;
          }
          if (nextArtist && (activeChallenge?.type !== 'artist' || activeChallenge.slug !== nextArtist.slug)) {
            audioEngine.stop();
            setActiveChallenge({ type: 'artist', slug: nextArtist.slug, title: nextArtist.name, songIds: nextArtist.songIds, songs: nextArtist.songs });
            setGameMode('practice');
            setActiveCollection(null);
            setRoundIndex(0);
            setCurrentStepIndex(0);
            setIsRevealed(false);
            setRoundHistory([]);
            setGameStartTime(Date.now());
            setIsCompleteModalOpen(false);
            setSavedResult(null);
            setWrongFeedback(null);
            setGameSessionKey(Date.now());
          }
          setActiveView('game');
          return;
        }

        if (segments[0] === 'play' && segments[1] === 'country' && !segments[2]) {
          audioEngine.stop();
          setActiveChallenge(null);
          setActiveView('countries');
          return;
        }

        if (segments[0] === 'play' && segments[1] === 'genre' && !segments[2]) {
          audioEngine.stop();
          clearCountrySelectionForChallenge();
          setActiveChallenge(null);
          setActiveView('genres');
          return;
        }

        if (segments[0] === 'play' && segments[1] === 'genre' && segments[2]) {
          clearCountrySelectionForChallenge();
          const genre = getGenreChallenge(segments[2]);
          if (!genre) {
            audioEngine.stop();
            setActiveChallenge(null);
            setActiveView('genres');
            window.history.replaceState({}, document.title, '/play/genre');
            return;
          }
          if (genre && (activeChallenge?.type !== 'genre' || activeChallenge.slug !== genre.slug)) {
            audioEngine.stop();
            setActiveChallenge({ type: 'genre', slug: genre.slug, title: genre.name });
            setGameMode('practice');
            setActiveCollection(null);
            setRoundIndex(0);
            setCurrentStepIndex(0);
            setIsRevealed(false);
            setRoundHistory([]);
            setGameStartTime(Date.now());
            setIsCompleteModalOpen(false);
            setSavedResult(null);
            setWrongFeedback(null);
            setGameSessionKey(Date.now());
          }
          setActiveView('game');
          return;
        }

        setActiveView('game');
        if (activeChallenge) {
          setActiveChallenge(null);
          setActiveCollection(getDefaultCollectionForCountry(settings.selectedCountry || 'GLOBAL'));
          setRoundIndex(0);
          setCurrentStepIndex(0);
          setIsRevealed(false);
          setRoundHistory([]);
          setGameStartTime(Date.now());
          setIsCompleteModalOpen(false);
          setSavedResult(null);
          setWrongFeedback(null);
          setGameSessionKey(Date.now());
          audioEngine.stop();
        }

        const countryParam = urlParams.get('country');
        const routeCountryCode = getCountryCodeFromPath(pathname, publicConfig);
        const matchedCountry =
          (countryParam && COUNTRIES.find((c) => c.code.toLowerCase() === countryParam.toLowerCase())) ||
          (routeCountryCode ? COUNTRIES.find((c) => c.code === routeCountryCode) : null) ||
          (pathname === '/play' ? COUNTRIES.find((c) => c.code === 'GLOBAL') : null);

        if (matchedCountry && matchedCountry.code !== settings.selectedCountry) {
          handleSelectCountry(matchedCountry.code, false);
        }

        if (matchedCountry && countryParam) {
          window.history.replaceState({}, document.title, getCountryPath(matchedCountry.code, publicConfig));
        }
      } catch {
        // Keep the game playable even if a malformed URL is opened.
      }
    };

    applyRoute();
    window.addEventListener('popstate', applyRoute);

    return () => {
      window.removeEventListener('popstate', applyRoute);
    };
  }, [activeChallenge, publicConfig, requestedArtists, requestedArtistsLoaded, settings.selectedCountry]);

  useEffect(() => {
    // Global keyboard shortcut for Admin: Ctrl+Shift+A or Cmd+Shift+A
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Check if daily already completed today
  useEffect(() => {
    if (gameMode !== 'daily' || activeChallenge) return;
    const existing = getSavedDailyResult();
    if (existing && existing.countryCode === settings.selectedCountry) {
      setSavedResult(existing);
      setRoundHistory(existing.rounds);
      setIsCompleteModalOpen(true);
    }
  }, [activeChallenge, gameMode, settings.selectedCountry]);

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false);
    try {
      localStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true');
    } catch {}
  };

  const startNewGame = useCallback((mode: GameMode, collection?: QuizCollection | null, options: StartGameOptions = {}) => {
    setGameMode(mode);
    setActiveCollection(collection || null);
    if (options.clearChallenge) {
      setActiveChallenge(null);
    }
    setGameSessionKey(Date.now());
    setRoundIndex(0);
    setCurrentStepIndex(0);
    setIsRevealed(false);
    setRoundHistory([]);
    setGameStartTime(Date.now());
    setIsCompleteModalOpen(false);
    setSavedResult(null);
    setWrongFeedback(null);
    audioEngine.stop();
  }, []);

  const refreshAccessState = useCallback(async () => {
    try {
      const [session] = await Promise.all([
        getAuthSession(),
        getAccessStatus().catch(() => null)
      ]);
      setAuthSession(session);
      return session;
    } catch (error) {
      console.debug('Access refresh skipped', error);
      return authSession;
    }
  }, [authSession]);

  const getCurrentScope = useCallback(() => {
    if (activeChallenge) return { type: activeChallenge.type, slug: activeChallenge.slug };
    if (activeCollection) return { type: 'collection', slug: activeCollection.id };
    return { type: 'country', slug: settings.selectedCountry || 'GLOBAL' };
  }, [activeChallenge, activeCollection, settings.selectedCountry]);

  const ensurePlayAccess = useCallback(async () => {
    if (authSession.entitlement.active) return true;

    const today = getTodayDateString();
    if (!authSession.authenticated) {
      try {
        const usedDate = localStorage.getItem(FREE_PLAY_DATE_KEY);
        const usedSession = Number(localStorage.getItem(FREE_PLAY_SESSION_KEY) || '0');
        if (usedDate === today && usedSession === gameSessionKey) return true;
        if (usedDate === today) {
          setAccessNotice('Your free Daily 5 is used for today. Unlock a 7-day pass for unlimited play and no ads.');
          setIsPaywallOpen(true);
          return false;
        }
      } catch {}
    }

    try {
      const scope = getCurrentScope();
      const state = await claimFreePlay(scope.type, scope.slug);
      if (!state.allowed && !state.unlimited) {
        setAccessNotice(state.reason || 'Unlock a 7-day pass for unlimited play and no ads.');
        if (authSession.authenticated) {
          setIsPaywallOpen(true);
        } else {
          setIsAuthOpen(true);
        }
        return false;
      }
      if (!authSession.authenticated) {
        try {
          localStorage.setItem(FREE_PLAY_DATE_KEY, today);
          localStorage.setItem(FREE_PLAY_SESSION_KEY, String(gameSessionKey));
        } catch {}
      }
      return true;
    } catch (error) {
      setAccessNotice(error instanceof Error ? error.message : 'Access check failed');
      if (authSession.authenticated) {
        setIsPaywallOpen(true);
      } else {
        setIsAuthOpen(true);
      }
      return false;
    }
  }, [authSession.authenticated, authSession.entitlement.active, gameSessionKey, getCurrentScope]);

  const handleUnlock = useCallback(async () => {
    if (!authSession.authenticated) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const url = await createCheckout();
      window.location.href = url;
    } catch (error) {
      setAccessNotice(error instanceof Error ? error.message : 'Stripe checkout is not available yet');
      setIsAuthOpen(true);
    }
  }, [authSession.authenticated]);

  const handleUpdateVolume = (newVol: number) => {
    const updated = { ...getStoredSettings(), volume: newVol };
    setSettings(updated);
    saveStoredSettings(updated);
  };

  const handleUpdateTitleMode = (newMode: TitleDisplayMode) => {
    const updated = { ...getStoredSettings(), titleDisplayPreference: newMode };
    setSettings(updated);
    saveStoredSettings(updated);
  };

  const handleSelectCountry = (countryCode: string, updateRoute = true) => {
    const updated = { ...getStoredSettings(), selectedCountry: countryCode };
    setSettings(updated);
    saveStoredSettings(updated);
    setActiveView('game');
    setActiveChallenge(null);
    if (updateRoute && typeof window !== 'undefined') {
      const nextPath = getCountryPath(countryCode, publicConfig);
      window.history.pushState({}, document.title, nextPath);
    }
    const defaultCol = getDefaultCollectionForCountry(countryCode);
    startNewGame(
      gameMode === 'collection' ? 'collection' : gameMode,
      gameMode === 'collection' ? defaultCol : null,
      { clearChallenge: true }
    );
  };

  // Skip handler (unlock next snippet tier)
  const handleSkip = () => {
    if (settings.enableSfx) audioEngine.playSfx('skip');

    if (currentStepIndex < SNIPPET_TIERS.length - 1) {
      const nextStep = currentStepIndex + 1;
      setCurrentStepIndex(nextStep);
      setWrongFeedback(`Revealed longer clip (${SNIPPET_TIERS[nextStep].label})`);
      setTimeout(() => setWrongFeedback(null), 1800);
    } else {
      // Out of skips - Fail round
      completeRound(false, 0);
    }
  };

  // Guess submission handler
  const handleGuess = (guessedSong: Song) => {
    const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g, '');
    const cleanGuessedTitle = cleanStr(guessedSong.title);
    const cleanTargetTitle = cleanStr(currentSong.title);
    const cleanGuessedArtist = cleanStr(guessedSong.artist);
    const cleanTargetArtist = cleanStr(currentSong.artist);

    const isIdMatch = guessedSong.id === currentSong.id;
    const isTitleMatch =
      cleanGuessedTitle === cleanTargetTitle ||
      (currentSong.titleArabic && cleanGuessedTitle === cleanStr(currentSong.titleArabic)) ||
      (currentSong.nativeTitle && cleanGuessedTitle === cleanStr(currentSong.nativeTitle));
    
    const isArtistMatch =
      !cleanGuessedArtist ||
      !cleanTargetArtist ||
      cleanGuessedArtist.includes(cleanTargetArtist) ||
      cleanTargetArtist.includes(cleanGuessedArtist);

    const isCorrect = isIdMatch || (isTitleMatch && isArtistMatch);

    if (isCorrect) {
      const earned = SNIPPET_TIERS[currentStepIndex]?.points || 250;
      if (settings.enableSfx) audioEngine.playSfx('correct');
      completeRound(true, earned);
    } else {
      if (settings.enableSfx) audioEngine.playSfx('wrong');

      if (currentStepIndex < SNIPPET_TIERS.length - 1) {
        const nextStep = currentStepIndex + 1;
        setCurrentStepIndex(nextStep);
        setWrongFeedback(`Not "${guessedSong.title}" — Revealed ${SNIPPET_TIERS[nextStep].label}`);
        setTimeout(() => setWrongFeedback(null), 2200);
      } else {
        completeRound(false, 0);
      }
    }
  };

  const completeRound = (isCorrect: boolean, points: number) => {
    audioEngine.stop();
    const newHistoryItem = {
      song: currentSong,
      isCorrect,
      pointsEarned: points,
      stepIndex: currentStepIndex
    };

    setRoundHistory((prev) => [...prev, newHistoryItem]);
    setIsRevealed(true);
  };

  // Next Round / Game Complete
  const handleNextRound = () => {
    audioEngine.stop();

    if (roundIndex < totalRounds - 1) {
      setRoundIndex((prev) => prev + 1);
      setCurrentStepIndex(0);
      setIsRevealed(false);
      setWrongFeedback(null);
    } else {
      // All rounds complete!
      const totalElapsedSec = Math.max(15, Math.floor((Date.now() - gameStartTime) / 1000));
      const resultCountryCode = activeChallenge ? 'GLOBAL' : settings.selectedCountry || 'GLOBAL';
      const finalResult: GameResult = {
        id: `result-${Date.now()}`,
        date: getTodayDateString(),
        mode: gameMode,
        countryCode: resultCountryCode,
        collectionTitle: activeChallenge?.title || activeCollection?.title,
        challengeType: activeChallenge?.type,
        challengeSlug: activeChallenge?.slug,
        totalPoints: totalPoints,
        maxPoints: maxPossiblePoints,
        rounds: roundHistory,
        durationSeconds: totalElapsedSec,
        nickname: settings.nickname
      };

      if (gameMode === 'daily' && !activeChallenge) {
        saveDailyResult(finalResult);
        setStreakData(getDailyStreak());
      }

      void recordActivity({
        countryCode: resultCountryCode,
        mode: gameMode,
        collectionTitle: activeChallenge?.title || activeCollection?.title || 'Daily 5',
        points: totalPoints,
        correctCount: roundHistory.filter((r) => r.isCorrect).length,
        totalRounds: totalRounds,
        durationSeconds: totalElapsedSec,
        nickname: settings.nickname,
        path: pagePath
      });

      setSavedResult(finalResult);
      setIsCompleteModalOpen(true);
    }
  };

  const handleChallengeFriend = () => {
    const shareLink = getShareUrl(pagePath);
    const text = `🎵 Can you beat my Song Guess Game score of ${totalPoints} points? Play at ${shareLink}`;
    navigator.clipboard.writeText(text);
    setWrongFeedback('Challenge link copied to clipboard!');
    setTimeout(() => setWrongFeedback(null), 2500);
  };

  const activeCountry =
    COUNTRIES.find((c) => c.code === settings.selectedCountry) || COUNTRIES[0];

  const countrySeo = publicConfig.pageConfigs[settings.selectedCountry || 'GLOBAL'] || publicConfig.pageConfigs.GLOBAL;
  const challengeSeo = activeChallenge
    ? getRouteConfig(`${activeChallenge.type}:${activeChallenge.slug}`, publicConfig)
    : null;
  const directorySeo =
    activeView === 'artists'
      ? getRouteConfig('system:artist-index', publicConfig)
      : activeView === 'genres'
      ? getRouteConfig('system:genre-index', publicConfig)
      : activeView === 'countries'
      ? getRouteConfig('system:country-index', publicConfig)
      : null;
  const homeSeo = getRouteConfig('system:home', publicConfig);
  const contactSeo: AdminPageConfig = {
    ...homeSeo,
    pageTitle: 'Contact Song Guess Game',
    metaDescription: 'Contact Song Guess Game for support, artist requests, partnerships, advertising, and product feedback.',
    keywords: 'contact song guess game, song guess support, music quiz contact',
    canonicalUrl: `${publicConfig.appUrl}/contact`,
    customHeading: 'Contact Song Guess Game',
    socialTitle: 'Contact Song Guess Game',
    socialDescription: 'Send a message to the Song Guess Game team.'
  };
  const playSeo =
    settings.selectedCountry === 'GLOBAL'
      ? getRouteConfig('system:play', publicConfig)
      : countrySeo;
  const activeSeo: AdminPageConfig =
    activeChallenge?.type === 'artist' && challengeSeo
      ? {
          ...challengeSeo,
          pageTitle: `${activeChallenge.title} Song Guess - Heardle`,
          metaDescription: `Play the ${activeChallenge.title} Heardle-style song guessing challenge. Guess songs by ${activeChallenge.title} from short audio snippets.`,
          keywords: `${activeChallenge.title} heardle, ${activeChallenge.title} song guess, ${activeChallenge.title} music quiz`,
          customHeading: `${activeChallenge.title} Song Guess - Heardle`,
          customIntroText: `Guess ${activeChallenge.title} songs from short audio snippets.`,
          socialTitle: `${activeChallenge.title} Song Guess - Heardle`,
          socialDescription: `Can you recognize ${activeChallenge.title} songs from tiny snippets?`
        }
      : challengeSeo || directorySeo || playSeo;
  const legalSeo = {
    privacy: {
      title: 'Privacy Policy - Song Guess Game',
      description: 'Privacy details for Song Guess Game, including local storage, analytics, ads, activity logs, and player rights.'
    },
    gdpr: {
      title: 'GDPR Privacy Rights - Song Guess Game',
      description: 'EU and UK GDPR rights for Song Guess Game players.'
    },
    california: {
      title: 'California Privacy Notice - Song Guess Game',
      description: 'California CCPA and CPRA notice for Song Guess Game players.'
    },
    terms: {
      title: 'Terms of Use - Song Guess Game',
      description: 'Terms of use and fair play rules for Song Guess Game.'
    },
    cookies: {
      title: 'Cookie and Advertising Policy - Song Guess Game',
      description: 'Cookie, analytics, Google AdSense, and manual advertising disclosures.'
    }
  } satisfies Record<LegalSectionKey, { title: string; description: string }>;
  const archivePagePath = (basePath: string) => {
    if (typeof window === 'undefined') return basePath;
    return getArchivePageHref(basePath, parseArchivePage(window.location.search));
  };
  const pagePath =
    activeView === 'home'
      ? '/'
      : activeView === 'contact'
      ? '/contact'
      : activeView === 'legal'
      ? getLegalPath(legalSection)
      : activeView === 'artists'
      ? archivePagePath('/artist')
      : activeView === 'countries'
      ? archivePagePath('/play/country')
      : activeView === 'genres'
      ? archivePagePath('/play/genre')
      : activeChallenge?.type === 'artist'
      ? getArtistPath(activeChallenge.slug)
      : activeChallenge?.type === 'genre'
      ? getGenrePath(activeChallenge.slug)
      : getCountryPath(settings.selectedCountry, publicConfig);
  const pageTitle = activeView === 'home' ? homeSeo.pageTitle : activeView === 'contact' ? contactSeo.pageTitle : activeView === 'legal' ? legalSeo[legalSection].title : activeSeo.pageTitle;
  const pageDescription = activeView === 'home' ? homeSeo.metaDescription : activeView === 'contact' ? contactSeo.metaDescription : activeView === 'legal' ? legalSeo[legalSection].description : activeSeo.metaDescription;
  const pageKeywords = activeView === 'home' ? homeSeo.keywords : activeView === 'contact' ? contactSeo.keywords : activeView === 'legal' ? 'song guess game privacy, music quiz terms' : activeSeo.keywords;
  const socialTitle = activeView === 'home' ? homeSeo.socialTitle : activeView === 'contact' ? contactSeo.socialTitle : activeView === 'legal' ? pageTitle : activeSeo.socialTitle || pageTitle;
  const socialDescription = activeView === 'home' ? homeSeo.socialDescription : activeView === 'contact' ? contactSeo.socialDescription : activeView === 'legal' ? pageDescription : activeSeo.socialDescription || pageDescription;
  const shouldShowAds = !authSession.entitlement.active;

  useEffect(() => {
    const setMeta = (selector: string, attribute: 'content' | 'href', value: string, createTag: () => HTMLElement) => {
      let element = document.head.querySelector(selector) as HTMLElement | null;
      if (!element) {
        element = createTag();
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };

    const canonicalUrl = `${publicConfig.appUrl}${pagePath === '/' ? '' : pagePath}`;
    document.title = pageTitle;
    setMeta('meta[name="description"]', 'content', pageDescription, () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      return meta;
    });
    setMeta('meta[name="keywords"]', 'content', pageKeywords, () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'keywords');
      return meta;
    });
    setMeta('link[rel="canonical"]', 'href', canonicalUrl, () => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      return link;
    });
    setMeta('meta[property="og:title"]', 'content', socialTitle, () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:title');
      return meta;
    });
    setMeta('meta[property="og:description"]', 'content', socialDescription, () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:description');
      return meta;
    });
    setMeta('meta[property="og:url"]', 'content', canonicalUrl, () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:url');
      return meta;
    });
  }, [
    pageDescription,
    pageKeywords,
    pagePath,
    pageTitle,
    publicConfig.appUrl,
    socialDescription,
    socialTitle
  ]);

  useEffect(() => {
    const hasPopupSlot = shouldShowAds && publicConfig.adSlots.some((slot) => slot.location === 'popup' && slot.enabled);
    if (!lastInterstitialPathRef.current) {
      lastInterstitialPathRef.current = pagePath;
      return;
    }

    if (!hasPopupSlot) {
      lastInterstitialPathRef.current = pagePath;
      return;
    }

    if (lastInterstitialPathRef.current !== pagePath) {
      setIsInterstitialOpen(true);
      lastInterstitialPathRef.current = pagePath;
    }
  }, [pagePath, publicConfig.adSlots, shouldShowAds]);

  const handleRuntimeConfigChanged = useCallback((config: AdminConfigState) => {
    setPublicConfig((current) => {
      const nextConfig = {
        ...current,
        appUrl: config.appUrl,
        host: (() => {
          try {
            return new URL(config.appUrl).host;
          } catch {
            return current.host;
          }
        })(),
        integrations: config.integrations,
        pageConfigs: config.pageConfigs,
        routeConfigs: config.routeConfigs,
        featuredArtistSlugs: config.featuredArtistSlugs,
        adSlots: config.adSlots,
        robotsTxt: config.robotsTxt
      };
      window.__SONG_GUESS_PUBLIC_CONFIG__ = nextConfig;
      return nextConfig;
    });
  }, []);

  const navigateToPage = useCallback((path: string, replace = false) => {
    const cleanPath = path.length > 1 ? path.replace(/\/+$/, '') : path;
    try {
      if (replace) {
        window.history.replaceState({}, document.title, cleanPath);
      } else if (window.location.pathname !== cleanPath) {
        window.history.pushState({}, document.title, cleanPath);
      }
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
  }, []);

  const handleHeaderModeSelect = (mode: GameMode) => {
    if (activeView !== 'game') {
      navigateToPage('/play');
    }
    startNewGame(mode);
  };

  const handleCollectionCountrySelect = (code: string) => {
    const updated = { ...getStoredSettings(), selectedCountry: code };
    setSettings(updated);
    saveStoredSettings(updated);
    setActiveView('game');
    setActiveChallenge(null);
    setSavedResult(null);
    audioEngine.stop();
    window.history.pushState({}, document.title, getCountryPath(code, publicConfig));
    const defaultCol = getDefaultCollectionForCountry(code);
    setActiveCollection(defaultCol);
    setRoundIndex(0);
    setCurrentStepIndex(0);
    setIsRevealed(false);
    setRoundHistory([]);
    setGameStartTime(Date.now());
    setIsCompleteModalOpen(false);
    setWrongFeedback(null);
    setGameSessionKey(Date.now());
  };

  const handleCollectionSelect = (col: QuizCollection) => {
    setActiveView('game');
    setActiveChallenge(null);
    const artistMatch = col.id.match(/^artist-(.+)-artist-profile$/);
    if (artistMatch?.[1]) {
      setIsCollectionsOpen(false);
      navigateToPage(getArtistPath(artistMatch[1]));
      return;
    }
    const genreMatch = col.id.match(/^genre-global-(.+)-deep-library$/);
    if (genreMatch?.[1]) {
      setIsCollectionsOpen(false);
      navigateToPage(getGenrePath(genreMatch[1]));
      return;
    }
    const latestSettings = getStoredSettings();
    if (col.countryCode && col.countryCode !== latestSettings.selectedCountry) {
      const updated = { ...latestSettings, selectedCountry: col.countryCode };
      setSettings(updated);
      saveStoredSettings(updated);
      window.history.pushState({}, document.title, getCountryPath(col.countryCode, publicConfig));
    }
    setIsCollectionsOpen(false);
    startNewGame('collection', col, { clearChallenge: true });
  };

  const handleRequestArtist = useCallback(async (artistName: string, spotifyArtistId?: string) => {
    const artist = await requestArtist(artistName, spotifyArtistId);
    setRequestedArtists((current) => {
      const filtered = current.filter((item) => item.slug !== artist.slug);
      return [artist, ...filtered];
    });
    if (artist.status === 'ready' && artist.songs && artist.songs.length > 0) {
      audioEngine.stop();
      setActiveChallenge({
        type: 'artist',
        slug: artist.slug,
        title: artist.name,
        songIds: artist.songIds,
        songs: artist.songs
      });
      setGameMode('practice');
      setActiveCollection(null);
      setActiveView('game');
      setRoundIndex(0);
      setCurrentStepIndex(0);
      setIsRevealed(false);
      setRoundHistory([]);
      setGameStartTime(Date.now());
      setIsCompleteModalOpen(false);
      setSavedResult(null);
      setWrongFeedback(null);
      setGameSessionKey(Date.now());
    }
    return artist;
  }, []);

  const renderAppHeader = () => (
    <div className="relative z-[45] w-full shrink-0">
      <HeaderNav
        mode={gameMode}
        onSelectMode={handleHeaderModeSelect}
        onOpenCollections={() => setIsCollectionsOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenFaq={() => setIsFaqOpen(true)}
        selectedCountryCode={settings.selectedCountry || 'GLOBAL'}
        volume={settings.volume}
        onVolumeChange={handleUpdateVolume}
        roundNumber={roundIndex + 1}
        totalRounds={totalRounds}
        difficulty={currentDifficulty}
        currentPoints={totalPoints}
        themeOverride={settings.accentColorOverride}
        collectionTitle={activeChallenge?.title || activeCollection?.title}
        streakData={streakData}
        featuredArtistSlugs={publicConfig.featuredArtistSlugs}
        requestedArtists={requestedArtists}
        activeChallengeType={activeChallenge?.type || null}
        activeChallengeSlug={activeChallenge?.slug || null}
        onSelectCountry={(code) => handleSelectCountry(code)}
        onOpenCountryArchive={() => navigateToPage('/play/country')}
        onOpenArtist={(slug) => navigateToPage(getArtistPath(slug))}
        onOpenArtists={() => navigateToPage('/artist')}
        onOpenGenre={(slug) => navigateToPage(getGenrePath(slug))}
        onOpenGenres={() => navigateToPage('/play/genre')}
        onOpenHome={() => navigateToPage('/')}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenPaywall={() => setIsPaywallOpen(true)}
        isUnlocked={authSession.entitlement.active}
        authSession={authSession}
        onAuthSessionChange={setAuthSession}
      />
    </div>
  );

  const renderNavigationModals = () => (
    <>
      {isCountrySelectorOpen && (
        <CountrySelectorModal
          selectedCountryCode={settings.selectedCountry || 'GLOBAL'}
          onSelectCountry={handleSelectCountry}
          onClose={() => setIsCountrySelectorOpen(false)}
        />
      )}

      {isCollectionsOpen && (
        <QuizCollectionModal
          selectedCountryCode={settings.selectedCountry || 'GLOBAL'}
          onSelectCountryCode={handleCollectionCountrySelect}
          onSelectCollection={handleCollectionSelect}
          onClose={() => setIsCollectionsOpen(false)}
        />
      )}

      {isLeaderboardOpen && (
        <LeaderboardModal onClose={() => setIsLeaderboardOpen(false)} />
      )}

      {isFaqOpen && <FAQModal onClose={() => setIsFaqOpen(false)} />}

      {isAdminOpen && (
        <AdminBackOfficeModal
          onClose={() => setIsAdminOpen(false)}
          onConfigChanged={handleRuntimeConfigChanged}
        />
      )}

      {isInterstitialOpen && shouldShowAds && (
        <AdInterstitialModal
          slots={publicConfig.adSlots}
          integrations={publicConfig.integrations}
          onClose={() => setIsInterstitialOpen(false)}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          initialMode={authInitialMode}
          onClose={() => setIsAuthOpen(false)}
          onAuthenticated={(session) => {
            setAuthSession(session);
            setAccessNotice(null);
            void refreshAccessState();
          }}
          databaseConfigured={authSession.databaseConfigured}
        />
      )}

      {isMultiplayerOpen && (
        <MultiplayerModal onClose={() => setIsMultiplayerOpen(false)} />
      )}

      {isPaywallOpen && (
        <PaywallModal
          onClose={() => setIsPaywallOpen(false)}
          onLogin={() => {
            setIsPaywallOpen(false);
            setIsAuthOpen(true);
          }}
          onCheckout={handleUnlock}
          isAuthenticated={authSession.authenticated}
          stripeConfigured={authSession.stripeConfigured}
          databaseConfigured={authSession.databaseConfigured}
        />
      )}
    </>
  );

  const openLegalSection = (section: LegalSectionKey) => {
    setLegalSection(section);
    setActiveView('legal');
    navigateToPage(getLegalPath(section));
  };

  if (activeView === 'home') {
    return (
      <div className="relative min-h-screen w-full bg-[#080c0a] text-white flex flex-col overflow-x-hidden font-sans selection:bg-[#00e676] selection:text-black">
        <GoogleIntegrations config={publicConfig} pageTitle={pageTitle} pagePath={pagePath} />
        <StageLighting
          difficulty={currentDifficulty}
          themeOverride={settings.accentColorOverride}
          isComplete={false}
        />
        {renderAppHeader()}
        <HomePage
          publicConfig={publicConfig}
          requestedArtists={requestedArtists}
          onNavigate={(path) => navigateToPage(path)}
        />
        <footer className="relative z-10 border-t border-white/10 px-4 py-8 text-sm text-white/50">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-bold">Song Guess Game</div>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => openLegalSection('privacy')} className="hover:text-white">Privacy</button>
              <button onClick={() => openLegalSection('terms')} className="hover:text-white">Terms</button>
              <button onClick={() => openLegalSection('cookies')} className="hover:text-white">Cookies</button>
              <button onClick={() => navigateToPage('/contact')} className="hover:text-white">Contact</button>
              <button onClick={() => navigateToPage('/play')} className="hover:text-white">Play</button>
            </div>
          </div>
        </footer>
        {renderNavigationModals()}
      </div>
    );
  }

  if (activeView === 'contact') {
    return (
      <div className="relative min-h-screen w-full bg-[#080c0a] text-white flex flex-col overflow-x-hidden font-sans selection:bg-[#00e676] selection:text-black">
        <GoogleIntegrations config={publicConfig} pageTitle={pageTitle} pagePath={pagePath} />
        <StageLighting
          difficulty={currentDifficulty}
          themeOverride={settings.accentColorOverride}
          isComplete={false}
        />
        {renderAppHeader()}
        <ContactPage onBack={() => navigateToPage('/')} />
        {renderNavigationModals()}
      </div>
    );
  }

  // If user opened the dedicated full-page Legal & Privacy page
  if (activeView === 'legal') {
    return (
      <>
        <GoogleIntegrations config={publicConfig} pageTitle={pageTitle} pagePath={pagePath} />
        <LegalPage
          initialSection={legalSection}
          onSectionChange={setLegalSection}
          onBackToGame={() => {
            setActiveView('game');
            navigateToPage(getCountryPath(settings.selectedCountry, publicConfig));
          }}
        />
        {isAdminOpen && (
          <AdminBackOfficeModal
            onClose={() => setIsAdminOpen(false)}
            onConfigChanged={handleRuntimeConfigChanged}
          />
        )}
        {isInterstitialOpen && shouldShowAds && (
          <AdInterstitialModal
            slots={publicConfig.adSlots}
            integrations={publicConfig.integrations}
            onClose={() => setIsInterstitialOpen(false)}
          />
        )}
      </>
    );
  }

  if (activeView === 'artists') {
    return (
      <div className="relative min-h-screen w-full bg-[#080c0a] text-white flex flex-col overflow-x-hidden font-sans selection:bg-[#00e676] selection:text-black">
        <GoogleIntegrations config={publicConfig} pageTitle={pageTitle} pagePath={pagePath} />
        <StageLighting
          difficulty={currentDifficulty}
          themeOverride={settings.accentColorOverride}
          isComplete={false}
        />
        {renderAppHeader()}
        <ArtistBrowserPage
          onOpenArtist={(slug) => navigateToPage(getArtistPath(slug))}
          requestedArtists={requestedArtists}
          onRequestArtist={handleRequestArtist}
        />
        {renderNavigationModals()}
      </div>
    );
  }

  if (activeView === 'countries') {
    return (
      <div className="relative min-h-screen w-full bg-[#080c0a] text-white flex flex-col overflow-x-hidden font-sans selection:bg-[#00e676] selection:text-black">
        <GoogleIntegrations config={publicConfig} pageTitle={pageTitle} pagePath={pagePath} />
        <StageLighting
          difficulty={currentDifficulty}
          themeOverride={settings.accentColorOverride}
          isComplete={false}
        />
        {renderAppHeader()}
        <CountryBrowserPage
          onOpenCountry={(code) => handleSelectCountry(code)}
        />
        {renderNavigationModals()}
      </div>
    );
  }

  if (activeView === 'genres') {
    return (
      <div className="relative min-h-screen w-full bg-[#080c0a] text-white flex flex-col overflow-x-hidden font-sans selection:bg-[#00e676] selection:text-black">
        <GoogleIntegrations config={publicConfig} pageTitle={pageTitle} pagePath={pagePath} />
        <StageLighting
          difficulty={currentDifficulty}
          themeOverride={settings.accentColorOverride}
          isComplete={false}
        />
        {renderAppHeader()}
        <GenreBrowserPage
          onOpenGenre={(slug) => navigateToPage(getGenrePath(slug))}
        />
        {renderNavigationModals()}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#080c0a] text-white flex flex-col justify-between overflow-x-hidden pb-14 font-sans selection:bg-[#00e676] selection:text-black">
      <GoogleIntegrations config={publicConfig} pageTitle={pageTitle} pagePath={pagePath} />
      {/* 1. Perspective Stage Lighting Background & Watermark */}
      <StageLighting
        difficulty={currentDifficulty}
        themeOverride={settings.accentColorOverride}
        isComplete={isCompleteModalOpen}
      />

      {/* 2. Top Header & Nav Bar with Volume Controller & Country Selector */}
      {renderAppHeader()}

      {shouldShowAds && (
        <>
          <aside className="hidden 2xl:block fixed left-5 top-28 bottom-24 z-20 w-40">
            <AdBannerDisplay
              location="left_rail"
              slots={publicConfig.adSlots}
              integrations={publicConfig.integrations}
              className="h-full"
            />
          </aside>

          <aside className="hidden 2xl:block fixed right-72 top-28 bottom-24 z-20 w-40">
            <AdBannerDisplay
              location="right_rail"
              slots={publicConfig.adSlots}
              integrations={publicConfig.integrations}
              className="h-full"
            />
          </aside>
        </>
      )}

      {/* 3. Main Center Stage Area */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 flex-1 flex flex-col justify-center items-center my-3">
        {/* Subtle Toast / Wrong guess feedback */}
        {wrongFeedback && (
          <div className="absolute top-0 z-30 px-4 py-1.5 bg-[#ef4444]/90 text-white font-bold text-xs rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            {wrongFeedback}
          </div>
        )}

        {accessNotice && (
          <div className="mb-3 max-w-lg rounded-lg border border-[#00e676]/25 bg-[#00e676]/10 px-3 py-2 text-center text-xs font-bold text-[#b8ffd7]">
            <div>{accessNotice}</div>
            <button
              onClick={() => setIsPaywallOpen(true)}
              className="mt-1 underline decoration-[#00e676] decoration-2 underline-offset-4 hover:text-white"
            >
              Unlock more
            </button>
          </div>
        )}

        {/* Dynamic SEO Heading if customized via Admin Back Office */}
        {activeSeo?.customHeading && !isRevealed && (
          <div className="text-center mb-1 animate-in fade-in">
            <h1 className="text-sm sm:text-base font-black text-white/90 tracking-tight">
              {activeSeo.customHeading}
            </h1>
            {activeSeo.customIntroText && (
              <p className="text-[11px] text-white/50">{activeSeo.customIntroText}</p>
            )}
          </div>
        )}

        {/* Top Header Banner Ad Slot */}
        {shouldShowAds && (
          <div className="w-full max-w-lg mb-1">
            <AdBannerDisplay
              location="header"
              slots={publicConfig.adSlots}
              integrations={publicConfig.integrations}
            />
          </div>
        )}

        {!isRevealed ? (
          /* Active Snippet Playing & Guessing View */
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            {/* Multi-Segment Snippet Ladder & Big Circular Play Button */}
            <AudioSnippetPlayer
              song={currentSong}
              currentStepIndex={currentStepIndex}
              difficulty={currentDifficulty}
              themeOverride={settings.accentColorOverride}
              onBeforePlay={ensurePlayAccess}
            />

            {/* Song Autocomplete Search Box & Skip / Give Up Button */}
            <GuessAutocomplete
              onGuess={handleGuess}
              onSkip={handleSkip}
              countryCode={activeChallenge ? 'GLOBAL' : settings.selectedCountry}
              showArabicTitles={settings.showArabicTitles}
              titleDisplayMode={settings.titleDisplayPreference || 'both'}
              isLastStep={currentStepIndex >= SNIPPET_TIERS.length - 1}
              nextStepLabel={currentStepIndex < SNIPPET_TIERS.length - 1 ? SNIPPET_TIERS[currentStepIndex + 1]?.label : undefined}
            />

            {/* In-Game Ad Slot */}
            {shouldShowAds && (
              <div className="w-full max-w-lg mt-3">
                <AdBannerDisplay
                  location="under_guess"
                  slots={publicConfig.adSlots}
                  integrations={publicConfig.integrations}
                />
              </div>
            )}
          </div>
        ) : (
          /* Round Reveal View (Album Art, Points Stamp, Track Info, Next Button, Social Card trigger) */
          <RoundReveal
            song={currentSong}
            roundNumber={roundIndex + 1}
            totalRounds={totalRounds}
            pointsEarned={roundHistory[roundIndex]?.pointsEarned || 0}
            totalPoints={totalPoints}
            maxPossiblePoints={maxPossiblePoints}
            isCorrect={roundHistory[roundIndex]?.isCorrect || false}
            difficulty={currentDifficulty}
            themeOverride={settings.accentColorOverride}
            onNextRound={handleNextRound}
            onChallengeFriend={handleChallengeFriend}
            showArabicTitles={settings.showArabicTitles}
            titleDisplayMode={settings.titleDisplayPreference || 'both'}
            playedStepIndex={roundHistory[roundIndex]?.stepIndex ?? currentStepIndex}
            onOpenShareCard={() => {
              const res: GameResult = {
                id: `round-${Date.now()}`,
                date: getTodayDateString(),
                mode: gameMode,
                countryCode: settings.selectedCountry,
                collectionTitle: activeChallenge?.title || activeCollection?.title,
                totalPoints: totalPoints,
                maxPoints: maxPossiblePoints,
                rounds: roundHistory,
                durationSeconds: Math.floor((Date.now() - gameStartTime) / 1000),
                nickname: settings.nickname
              };
              setShareCardResult(res);
            }}
          />
        )}
      </main>

      {/* 4. Right Sidebar Controls */}
      <SidebarControls
        difficulty={currentDifficulty}
        onOpenCountrySelector={() => setIsCountrySelectorOpen(true)}
        selectedCountryCode={settings.selectedCountry || 'GLOBAL'}
        onNewRandomGame={() => startNewGame(gameMode, activeCollection || undefined)}
        volume={settings.volume}
        onVolumeChange={handleUpdateVolume}
        streakData={streakData}
        titleDisplayMode={settings.titleDisplayPreference || 'both'}
        onTitleDisplayModeChange={handleUpdateTitleMode}
        themeOverride={settings.accentColorOverride}
        activeChallengeType={activeChallenge?.type || null}
        activeChallengeTitle={activeChallenge?.title}
        isUnlocked={authSession.entitlement.active}
        accessUntil={authSession.entitlement.accessUntil}
        isAuthenticated={authSession.authenticated}
        stripeConfigured={authSession.stripeConfigured}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenPaywall={() => setIsPaywallOpen(true)}
        onUnlock={handleUnlock}
        onOpenMultiplayer={() => setIsMultiplayerOpen(true)}
      />

      {/* 5. Minimal Production Footer with Compliance & Secret Admin Trigger */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 w-full py-2.5 px-6 flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/30 border-t border-white/5 select-none bg-[#080c0a]/80 backdrop-blur-sm">
        <div
          className="flex items-center gap-2 cursor-default"
          onClick={() => {
            setSecretAdminClicks((prev) => {
              const next = prev + 1;
              if (next >= 5) {
                setIsAdminOpen(true);
                return 0;
              }
              return next;
            });
          }}
          title={getPublicHost()}
        >
          <span className="text-sm">{activeCountry.flag}</span>
          <span className="font-semibold text-white/50">{activeCountry.name} Music Scene</span>
          <span>•</span>
          <span>Song Guess Game</span>
        </div>

        <div className="flex items-center gap-4 text-white/40">
          <button
            onClick={() => openLegalSection('privacy')}
            className="hover:text-white/80 transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <button
            onClick={() => openLegalSection('gdpr')}
            className="hover:text-white/80 transition-colors cursor-pointer"
          >
            GDPR
          </button>
          <button
            onClick={() => openLegalSection('california')}
            className="hover:text-white/80 transition-colors cursor-pointer"
          >
            California CCPA
          </button>
          <button
            onClick={() => openLegalSection('terms')}
            className="hover:text-white/80 transition-colors cursor-pointer"
          >
            Terms
          </button>
          <button
            onClick={() => openLegalSection('cookies')}
            className="hover:text-white/80 transition-colors cursor-pointer"
          >
            Cookies
          </button>
          <button
            onClick={() => setIsFaqOpen(true)}
            className="hover:text-white/80 transition-colors cursor-pointer"
          >
            FAQ & Rules
          </button>
        </div>
      </footer>

      {/* --- MODALS --- */}
      {/* 1. Onboarding Modal for First Time Users */}
      {isOnboardingOpen && (
        <OnboardingModal
          onClose={handleCloseOnboarding}
          selectedCountryCode={settings.selectedCountry || 'GLOBAL'}
        />
      )}

      {/* 2. Country & Music Scene Selector Modal */}
      {isCountrySelectorOpen && (
        <CountrySelectorModal
          selectedCountryCode={settings.selectedCountry || 'GLOBAL'}
          onSelectCountry={handleSelectCountry}
          onClose={() => setIsCountrySelectorOpen(false)}
        />
      )}

      {/* 3. Global & Country Quiz Collections Modal */}
      {isCollectionsOpen && (
        <QuizCollectionModal
          selectedCountryCode={settings.selectedCountry || 'GLOBAL'}
          onSelectCountryCode={handleCollectionCountrySelect}
          onSelectCollection={handleCollectionSelect}
          onClose={() => setIsCollectionsOpen(false)}
        />
      )}

      {/* 4. Leaderboard Modal */}
      {isLeaderboardOpen && (
        <LeaderboardModal onClose={() => setIsLeaderboardOpen(false)} />
      )}

      {/* 5. FAQ & Rules Modal */}
      {isFaqOpen && <FAQModal onClose={() => setIsFaqOpen(false)} />}

      {/* 6. Administrator Back Office Modal (Protected & Secret) */}
      {isAdminOpen && (
        <AdminBackOfficeModal
          onClose={() => setIsAdminOpen(false)}
          onConfigChanged={handleRuntimeConfigChanged}
        />
      )}

      {/* 7. Share Card Snapshot Modal */}
      {shareCardResult && (
        <ShareCardModal
          result={shareCardResult}
          onClose={() => setShareCardResult(null)}
        />
      )}

      {isInterstitialOpen && shouldShowAds && (
        <AdInterstitialModal
          slots={publicConfig.adSlots}
          integrations={publicConfig.integrations}
          onClose={() => setIsInterstitialOpen(false)}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          initialMode={authInitialMode}
          onClose={() => setIsAuthOpen(false)}
          onAuthenticated={(session) => {
            setAuthSession(session);
            setAccessNotice(null);
            void refreshAccessState();
          }}
          databaseConfigured={authSession.databaseConfigured}
        />
      )}

      {isMultiplayerOpen && (
        <MultiplayerModal onClose={() => setIsMultiplayerOpen(false)} />
      )}

      {isPaywallOpen && (
        <PaywallModal
          onClose={() => setIsPaywallOpen(false)}
          onLogin={() => {
            setIsPaywallOpen(false);
            setIsAuthOpen(true);
          }}
          onCheckout={handleUnlock}
          isAuthenticated={authSession.authenticated}
          stripeConfigured={authSession.stripeConfigured}
          databaseConfigured={authSession.databaseConfigured}
        />
      )}

      {/* 9. Game Complete Modal (Daily 5 / Quiz completion) */}
      {isCompleteModalOpen && (
        <GameCompleteModal
          result={
            savedResult || {
              id: `result-${Date.now()}`,
              date: getTodayDateString(),
              mode: gameMode,
              countryCode: activeChallenge ? 'GLOBAL' : settings.selectedCountry,
              collectionTitle: activeChallenge?.title || activeCollection?.title,
              challengeType: activeChallenge?.type,
              challengeSlug: activeChallenge?.slug,
              totalPoints,
              maxPoints: maxPossiblePoints,
              rounds: roundHistory,
              durationSeconds: Math.floor((Date.now() - gameStartTime) / 1000),
              nickname: settings.nickname
            }
          }
          onPlayAgain={() => startNewGame('practice')}
          onOpenLeaderboard={() => {
            setIsCompleteModalOpen(false);
            setIsLeaderboardOpen(true);
          }}
          onOpenShareCard={(res) => {
            setShareCardResult(res);
          }}
          onSettingsChanged={setSettings}
          onClose={() => setIsCompleteModalOpen(false)}
        />
      )}
    </div>
  );
}
