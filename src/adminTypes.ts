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
  adSlots: AdminAdSlot[];
  robotsTxt: string;
  updatedAt: string;
}

export interface PublicRuntimeConfig {
  appUrl: string;
  host: string;
  integrations: IntegrationSettings;
  pageConfigs: Record<string, AdminPageConfig>;
  routeConfigs: Record<string, AdminPageConfig>;
  featuredArtistSlugs: string[];
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

export interface RequestedArtist {
  slug: string;
  name: string;
  spotifyArtistId?: string;
  spotifyUrl?: string;
  songIds: string[];
  songs?: Song[];
  songsCount: number;
  coverImage: string;
  status: 'ready' | 'pending';
  createdAt: string;
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

export interface AdminSessionResponse {
  authenticated: boolean;
  configured: boolean;
  csrfToken?: string;
  username?: string;
  accessPathConfigured?: boolean;
}
import type { Song } from './types';
