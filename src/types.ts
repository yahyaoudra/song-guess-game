export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT' | 'IMPOSSIBLE';

export type GameMode = 'daily' | 'practice' | 'collection';

export type ThemeColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'cyan';

export type TitleDisplayMode = 'both' | 'romanized' | 'original' | 'translated';

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  totalDaysCompleted: number;
}

export interface Song {
  id: string;
  title: string;
  titleArabic?: string;
  nativeTitle?: string;
  translatedTitle?: string;
  romanizedTitle?: string;
  artist: string;
  artistArabic?: string;
  nativeArtist?: string;
  album: string;
  genre: string;
  countryCode: string; // 'MA', 'US', 'GB', 'FR', 'ES', 'EG', 'DZ', 'BR', 'KR', 'JP', 'DE', 'IT', 'NG', 'MX', 'GLOBAL'
  releaseYear?: number;
  artworkUrl: string;
  previewUrl: string;
  spotifyTrackId?: string;
  spotifyUri?: string;
  spotifyUrl?: string;
  deezerUrl?: string;
  appleMusicUrl?: string;
  smartCueOffsetSec?: number;
  difficulty: Difficulty;
}

// Backward compatibility alias
export type MoroccanSong = Song;

export interface SnippetTier {
  step: number;
  durationSec: number;
  label: string;
  points: number;
  color?: string;
}

export interface RoundState {
  roundNumber: number; // 1 to 5
  totalRounds: number;
  song: Song;
  currentStepIndex: number; // 0 to 5
  isGuessed: boolean;
  isSkippedOut: boolean;
  pointsEarned: number;
  guesses: string[];
  startTime: number;
}

export interface GameResult {
  id: string;
  date: string;
  mode: GameMode;
  countryCode?: string;
  collectionTitle?: string;
  challengeType?: 'artist' | 'genre';
  challengeSlug?: string;
  totalPoints: number;
  maxPoints: number;
  rounds: {
    song: Song;
    isCorrect: boolean;
    pointsEarned: number;
    stepIndex: number;
  }[];
  durationSeconds: number;
  nickname?: string;
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  countryCode?: string;
  points: number;
  correctCount: number;
  totalRounds: number;
  timeFormatted: string;
  date: string;
  badge?: string;
  isCurrentUser?: boolean;
}

export interface MultiplayerPlayer {
  id: string;
  name: string;
  email?: string;
  score: number;
  correct: number;
  turnsPlayed: number;
  connected?: boolean;
}

export interface MultiplayerRound {
  playerId: string;
  song: Song;
}

export interface MultiplayerSession {
  id: string;
  mode: 'party' | 'online';
  roomCode?: string;
  socket?: WebSocket;
  onlinePlayerId?: string;
  isHost?: boolean;
  hostHasUnlimited?: boolean;
  challengeTitle: string;
  challengeType: 'country' | 'artist' | 'genre' | 'collection';
  turnsPerPlayer: number;
  players: MultiplayerPlayer[];
  rounds: MultiplayerRound[];
  activity: string;
  startedAt: number;
  completed?: boolean;
}

export interface QuizCollection {
  id: string;
  title: string;
  titleArabic?: string;
  nativeTitle?: string;
  description: string;
  category: string;
  countryCode: string; // 'GLOBAL', 'MA', 'US', 'GB', 'FR', 'ES', 'EG', 'DZ', 'BR', 'KR', 'JP', etc.
  coverImage?: string;
  difficulty: Difficulty;
  songsCount?: number;
  songIds: string[];
  songs?: Song[];
  isHot?: boolean;
  isOfficialSpotify?: boolean;
  spotifyPlaylistUrl?: string;
  spotifyPlaylistName?: string;
  tags?: string[];
}

export interface UserSettings {
  volume: number;
  selectedCountry: string; // e.g. 'GLOBAL', 'MA', 'US', 'GB', 'FR', 'ES', etc.
  accentColorOverride?: ThemeColor | 'auto';
  showArabicTitles?: boolean;
  titleDisplayPreference?: TitleDisplayMode;
  autoPlayOnSkip?: boolean;
  enableSfx?: boolean;
  nickname: string;
}
