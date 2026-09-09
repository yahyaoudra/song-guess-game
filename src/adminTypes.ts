export type AdPlacementLocation =
  | 'header'
  | 'left_rail'
  | 'right_rail'
  | 'under_guess'
  | 'reveal_modal'
  | 'popup';

export type AdSlotType = 'adsense' | 'manual_banner';

export interface AdminPageConfig {
  countryCode: string;
  slug: string;
  pageTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
  customHeading?: string;
  customIntroText?: string;
  socialTitle?: string;
  socialDescription?: string;
  socialImageUrl?: string;
  updatedAt: string;
}

export interface AdminAdSlot {
  id: string;
  name: string;
  location: AdPlacementLocation;
  type: AdSlotType;
  enabled: boolean;
  adsenseSlot?: string;
  bannerImageUrl?: string;
  bannerLinkUrl?: string;
  bannerAltText?: string;
}

export interface IntegrationSettings {
  analyticsEnabled: boolean;
  googleAnalyticsMeasurementId: string;
  clarityEnabled: boolean;
  microsoftClarityProjectId: string;
  adsenseEnabled: boolean;
  googleAdsenseClientId: string;
  searchConsoleVerification: string;
}

export interface AdminConfigState {
  version: number;
  appUrl: string;
  integrations: IntegrationSettings;
  pageConfigs: Record<string, AdminPageConfig>;
  routeConfigs: Record<string, AdminPageConfig>;
  featuredArtistSlugs: string[];
  customCountries: AdminCustomCountry[];
  customPacks: AdminCustomPack[];
  adSlots: AdminAdSlot[];
  robotsTxt: string;
  updatedAt: string;
}

export interface PublicRuntimeConfig {
  appUrl: string;
  host: string;
  recaptchaSiteKey?: string;
  integrations: IntegrationSettings;
  pageConfigs: Record<string, AdminPageConfig>;
  routeConfigs: Record<string, AdminPageConfig>;
  featuredArtistSlugs: string[];
  customCountries: AdminCustomCountry[];
  customPacks: AdminCustomPack[];
  adSlots: AdminAdSlot[];
  robotsTxt?: string;
  generatedAt: string;
  adminEntryRequested?: boolean;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  countryCode: string;
  mode: string;
  collectionTitle?: string;
  points: number;
  correctCount: number;
  totalRounds: number;
  durationSeconds: number;
  nickname?: string;
  path?: string;
  referrer?: string;
  userAgent?: string;
  ipHash?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  countryCode?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AccessEntitlement {
  active: boolean;
  accessUntil?: string;
  source?: string;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user?: PublicUser;
  entitlement: AccessEntitlement;
  databaseConfigured: boolean;
  stripeConfigured: boolean;
}

export interface DailyAccessState {
  allowed: boolean;
  unlimited: boolean;
  freePlayUsed: boolean;
  freePlayLimit?: number;
  freePlaysUsed?: number;
  freePlaysRemaining?: number;
  accessUntil?: string;
  reason?: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  email: string;
  amountCents: number;
  currency: string;
  status: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  refundedAt?: string;
  receiptUrl?: string;
  failureReason?: string;
  createdAt: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  accessUntil?: string;
  createdAt: string;
  lastSeenAt?: string;
}

export interface AdminEmailEvent {
  id: string;
  userId?: string;
  email: string;
  name?: string;
  subject: string;
  category: string;
  status: 'sent' | 'failed' | 'retrying';
  providerMessageId?: string;
  error?: string;
  textBody?: string;
  htmlBody?: string;
  createdAt: string;
  sentAt?: string;
}

export interface AdminUserJourneyEvent {
  id: string;
  userId?: string;
  email?: string;
  eventType: string;
  status: 'completed' | 'failed' | 'pending';
  detail?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminQueuedArtistRequest {
  id: string;
  spotifyArtistId?: string;
  artistSlug: string;
  artistName: string;
  artistImageUrl?: string;
  email: string;
  name?: string;
  status: string;
  createdAt: string;
  readyAt?: string;
  notifiedAt?: string;
}

export interface AdminUserProfile {
  user: AdminUserRecord;
  segments: string[];
  payments: PaymentRecord[];
  journey: AdminUserJourneyEvent[];
  emails: AdminEmailEvent[];
  queuedRequests: AdminQueuedArtistRequest[];
  feedback?: Array<{
    id: string;
    overallRating: number;
    rewardDays: number;
    rewardAccessUntil?: string;
    createdAt: string;
  }>;
}

export interface AdminUserSegments {
  purchasers: number;
  activeUnlimited: number;
  freeAccounts: number;
  topPlayers: number;
  returningPlayers: number;
  queuedRequesters: number;
  feedbackRewards: number;
  unverified: number;
}

export interface AdminFeatureUsage {
  feature: string;
  count: number;
  uniqueUsers: number;
  lastUsedAt?: string;
}

export interface AdminFeatureEvent {
  id: string;
  feature: string;
  status: 'completed' | 'failed' | 'pending';
  detail?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  userId?: string;
  userName?: string;
  email?: string;
}

export interface AdminRoomHistory {
  code: string;
  hostUserId?: string;
  hostEmail?: string;
  hostName: string;
  challengeType?: string;
  challengeSlug?: string;
  challengeTitle?: string;
  turnsPerPlayer: number;
  countdownSeconds: number;
  hostHasUnlimited: boolean;
  status: 'lobby' | 'playing' | 'finished' | string;
  playerCount: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
}

export interface AdminFeatureAnalytics {
  features: AdminFeatureUsage[];
  recentEvents: AdminFeatureEvent[];
  rooms: AdminRoomHistory[];
  roomStats: {
    totalCreated: number;
    activeNow: number;
    activePersisted: number;
    finished: number;
  };
  databaseConfigured: boolean;
}

export interface RequestedArtist {
  slug: string;
  name: string;
  spotifyArtistId?: string;
  spotifyUrl?: string;
  songIds: string[];
  songs?: Song[];
  songsCount: number;
  coverImage: string;
  status: 'ready' | 'pending' | 'queued';
  createdAt: string;
  updatedAt?: string;
  nextRefreshAt?: string;
  lastRefreshType?: 'manual' | 'automatic' | 'request';
  albumPacks?: Array<{
    id: string;
    title: string;
    type: 'album' | 'single' | 'compilation' | 'appears_on' | 'singles';
    coverImage?: string;
    songIds: string[];
    songsCount: number;
    releaseYear?: number;
  }>;
}

export interface ArtistRequestResponse {
  artist: RequestedArtist;
  queued?: boolean;
  queuePosition?: number;
  message?: string;
  requiresAuth?: boolean;
}

export interface SpotifyArtistSuggestion {
  id: string;
  name: string;
  imageUrl: string;
  spotifyUrl: string;
  followers?: number;
  popularity?: number;
  genres: string[];
}

export type AdminCustomPackType = 'country' | 'genre' | 'playlist';

export interface AdminCustomCountry extends Country {
  custom?: true;
}

export interface AdminCustomPack extends QuizCollection {
  custom?: true;
  packType: AdminCustomPackType;
  genreSlug?: string;
  genreName?: string;
  spotifyPlaylistId?: string;
  updatedAt?: string;
}

export interface SpotifyPlaylistSuggestion {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  spotifyUrl: string;
  ownerName?: string;
  tracksTotal: number;
}

export interface AdminSessionResponse {
  authenticated: boolean;
  configured: boolean;
  csrfToken?: string;
  username?: string;
  accessPathConfigured?: boolean;
}
import type { QuizCollection, Song } from './types';
import type { Country } from './data/countries';
