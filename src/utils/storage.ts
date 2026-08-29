import { GameResult, LeaderboardEntry, StreakData, UserSettings } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'song_guess_game_settings',
  DAILY_STATE: 'song_guess_game_daily_',
  GAME_HISTORY: 'song_guess_game_history',
  LEADERBOARD: 'song_guess_game_leaderboard',
  STATS: 'song_guess_game_stats',
  DAILY_STREAK: 'song_guess_game_daily_streak'
};

const DEFAULT_SETTINGS: UserSettings = {
  volume: 0.85,
  selectedCountry: 'GLOBAL',
  accentColorOverride: 'auto',
  showArabicTitles: true,
  titleDisplayPreference: 'both',
  autoPlayOnSkip: false,
  enableSfx: true,
  nickname: ''
};

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
  totalDaysCompleted: 0
};

const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', nickname: 'BeatMaster', countryCode: 'GLOBAL', points: 4950, correctCount: 5, totalRounds: 5, timeFormatted: '0:38', date: 'Today', badge: '🏆 Global Legend' },
  { id: '2', nickname: 'CasaRapKing', countryCode: 'MA', points: 4850, correctCount: 5, totalRounds: 5, timeFormatted: '0:42', date: 'Today', badge: '🔥 Sniper' },
  { id: '3', nickname: 'LondonRhythm', countryCode: 'GB', points: 4700, correctCount: 5, totalRounds: 5, timeFormatted: '0:51', date: 'Today', badge: '⚡ Prodigy' },
  { id: '4', nickname: 'ParisGroove', countryCode: 'FR', points: 4600, correctCount: 5, totalRounds: 5, timeFormatted: '0:58', date: 'Today', badge: '🎧 Pro' },
  { id: '5', nickname: 'TokyoWave', countryCode: 'JP', points: 4300, correctCount: 5, totalRounds: 5, timeFormatted: '1:12', date: 'Today' },
  { id: '6', nickname: 'CairoMelody', countryCode: 'EG', points: 3950, correctCount: 5, totalRounds: 5, timeFormatted: '1:35', date: 'Today' },
  { id: '7', nickname: 'RioVibes', countryCode: 'BR', points: 3700, correctCount: 4, totalRounds: 5, timeFormatted: '1:48', date: 'Today' },
  { id: '8', nickname: 'SeoulBeats', countryCode: 'KR', points: 3450, correctCount: 4, totalRounds: 5, timeFormatted: '2:10', date: 'Today' }
];

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to read settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDailyStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_STREAK);
    if (!raw) return DEFAULT_STREAK;
    const data: StreakData = JSON.parse(raw);
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();
    const normalized: StreakData = {
      currentStreak: Math.max(0, data.currentStreak || 0),
      bestStreak: Math.max(0, data.bestStreak || 0),
      lastCompletedDate: data.lastCompletedDate || null,
      totalDaysCompleted: Math.max(0, data.totalDaysCompleted || 0)
    };

    if (!normalized.lastCompletedDate) {
      return { ...normalized, currentStreak: 0 };
    }

    // If last completed date was before yesterday, the active streak is broken
    if (normalized.lastCompletedDate !== today && normalized.lastCompletedDate !== yesterday) {
      return {
        ...normalized,
        currentStreak: 0
      };
    }
    return normalized;
  } catch (e) {
    console.error('Failed to read daily streak', e);
  }
  return DEFAULT_STREAK;
}

export function recordDailyQuizCompletion(dateStr = getTodayDateString()): StreakData {
  try {
    const streak = getDailyStreak();
    const yesterday = getYesterdayDateString();

    // If already recorded for this date, return current streak
    if (streak.lastCompletedDate === dateStr) {
      return streak;
    }

    let newCurrent = 1;
    if (streak.lastCompletedDate === yesterday) {
      newCurrent = (streak.currentStreak || 0) + 1;
    }

    const updated: StreakData = {
      currentStreak: newCurrent,
      bestStreak: Math.max(streak.bestStreak || 0, newCurrent),
      lastCompletedDate: dateStr,
      totalDaysCompleted: (streak.totalDaysCompleted || 0) + 1
    };

    localStorage.setItem(STORAGE_KEYS.DAILY_STREAK, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to record daily streak', e);
  }
  return DEFAULT_STREAK;
}

export function getSavedDailyResult(dateStr = getTodayDateString()): GameResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_STATE + dateStr);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read daily state', e);
  }
  return null;
}

export function saveDailyResult(result: GameResult): void {
  try {
    const dateStr = result.date || getTodayDateString();
    localStorage.setItem(STORAGE_KEYS.DAILY_STATE + dateStr, JSON.stringify(result));
    
    // Automatically record daily streak on completion of daily quiz
    if (result.mode === 'daily') {
      recordDailyQuizCompletion(dateStr);
    }

    // Also add to history
    const history = getGameHistory();
    history.unshift(result);
    localStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(history.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save daily result', e);
  }
}

export function getGameHistory(): GameResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read history', e);
  }
  return [];
}

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read leaderboard', e);
  }
  return INITIAL_LEADERBOARD;
}

export function isNicknameTaken(nickname: string, currentUserId?: string): boolean {
  const trimmed = nickname.trim().toLowerCase();
  if (!trimmed) return false;
  const board = getLeaderboard();
  return board.some((entry) => entry.nickname.toLowerCase() === trimmed && entry.id !== currentUserId);
}

export function addLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const current = getLeaderboard();
  const entryNickname = entry.nickname.trim().toLowerCase();
  const filtered = current.filter(
    item => item.id !== entry.id && item.nickname.trim().toLowerCase() !== entryNickname
  );
  const updated = [...filtered, entry].sort((a, b) => b.points - a.points || a.timeFormatted.localeCompare(b.timeFormatted));
  
  try {
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(updated.slice(0, 30)));
  } catch (e) {
    console.error('Failed to save leaderboard', e);
  }
  return updated;
}
