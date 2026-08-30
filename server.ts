import 'dotenv/config';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import express, { type NextFunction, type Request, type RequestHandler, type Response as ExpressResponse } from 'express';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import http from 'http';
import net from 'net';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import Stripe from 'stripe';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import { COUNTRIES } from './src/data/countries';
import { ALL_SONGS } from './src/data/moroccanSongs';
import type { Song } from './src/types';
import {
  getArtistChallenge,
  getArtistChallenges,
  getGenreChallenge,
  getGenreChallenges,
  slugifyChallenge
} from './src/utils/challengeCatalog';
import type {
  ActivityLogEntry,
  AdminUserRecord,
  AdminAdSlot,
  AdminConfigState,
  AdminPageConfig,
  AdPlacementLocation,
  AdSlotType,
  AuthSessionResponse,
  DailyAccessState,
  IntegrationSettings,
  PaymentRecord,
  RequestedArtist,
  SpotifyArtistSuggestion,
  PublicUser,
  PublicRuntimeConfig
} from './src/adminTypes';

const DEFAULT_PORT = 3000;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_QUERY_LENGTH = 120;
const MAX_URL_LENGTH = 2048;
const UPSTREAM_TIMEOUT_MS = 12_000;
const API_RATE_LIMIT_WINDOW_MS = 60_000;
const API_RATE_LIMIT_MAX = 1200;
const ADMIN_LOGIN_RATE_LIMIT_MAX = 20;
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_ACTIVITY_LOGS = 500;
const CONFIG_VERSION = 4;
const SESSION_COOKIE_NAME = 'sg_admin_session';
const USER_SESSION_COOKIE_NAME = 'sg_user_session';
const ANON_COOKIE_NAME = 'sg_anon_id';
const GOOGLE_OAUTH_STATE_COOKIE_NAME = 'sg_google_oauth_state';
const MUSIC_USER_AGENT = 'Mozilla/5.0 (compatible; SongGuessGame/1.0)';
const FEATURED_ARTIST_LIMIT = 24;
const ARCHIVE_PAGE_SIZE = 12;
const USER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const WEEKLY_UNLOCK_DAYS = 7;
const WEEKLY_UNLOCK_AMOUNT_CENTS = 399;
const ARTIST_PACK_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const ARTIST_PACK_REFRESH_CHECK_MS = 60 * 60 * 1000;
const ARTIST_PACK_REFRESH_START_DELAY_MS = 15 * 60 * 1000;
const SPOTIFY_ARTIST_ALBUM_LIMIT = Math.max(10, Math.min(50, Number(process.env.SPOTIFY_ARTIST_ALBUM_LIMIT || '20') || 20));
const MAILERSEND_EMAIL_API_URL = 'https://api.mailersend.com/v1/email';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

const ALLOWED_AUDIO_HOST_PATTERNS = [
  /^cdns-preview(?:-[a-z0-9-]+)?\.dzcdn\.net$/i,
  /^e-cdns-preview(?:-[a-z0-9-]+)?\.dzcdn\.net$/i,
  /^audio-ssl\.itunes\.apple\.com$/i,
  /^aod\.itunes\.apple\.com$/i
];

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface AdminSession {
  username: string;
  csrfToken: string;
  createdAt: number;
  expiresAt: number;
}

interface UserSession {
  id: string;
  email: string;
  name: string;
  countryCode?: string;
  emailVerified: boolean;
}

interface MultiplayerRoom {
  code: string;
  hostName: string;
  players: Array<{
    id: string;
    name: string;
    email?: string;
    score: number;
    correct: number;
    turnsPlayed: number;
    connected: boolean;
  }>;
  createdAt: number;
  settings?: {
    challengeType?: string;
    challengeSlug?: string;
    challengeTitle?: string;
    turnsPerPlayer?: number;
  };
  activity?: string;
  status?: 'lobby' | 'playing' | 'finished';
}

interface UrlValidationSuccess {
  ok: true;
  url: string;
}

interface UrlValidationFailure {
  ok: false;
  status: number;
  error: string;
}

type UrlValidationResult = UrlValidationSuccess | UrlValidationFailure;

const adminSessions = new Map<string, AdminSession>();
const multiplayerRooms = new Map<string, MultiplayerRoom>();
let adminConfigCache: AdminConfigState | null = null;
let dbPool: Pool | null = null;
let dbUnavailableLogged = false;
let spotifyAccessTokenCache: { token: string; expiresAt: number } | null = null;

class SpotifyApiError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'SpotifyApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
let artistRefreshTimer: NodeJS.Timeout | null = null;

const AD_LOCATIONS = new Set<AdPlacementLocation>([
  'header',
  'left_rail',
  'right_rail',
  'under_guess',
  'reveal_modal',
  'popup'
]);
const AD_TYPES = new Set<AdSlotType>(['adsense', 'manual_banner']);

function getStringEnv(keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || '';
}

function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

function getDbPool(): Pool | null {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return null;
  if (!dbPool) {
    dbPool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
  }
  return dbPool;
}

async function queryDb<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const pool = getDbPool();
  if (!pool) return [];
  try {
    const result = await pool.query(text, params);
    return result.rows as T[];
  } catch (error) {
    if (!dbUnavailableLogged) {
      dbUnavailableLogged = true;
      console.warn('Postgres unavailable; user auth/payment features are disabled until DATABASE_URL works:', error);
    }
    throw error;
  }
}

async function ensureDatabaseSchema(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await queryDb(`
    CREATE TABLE IF NOT EXISTS sg_users (
      id uuid PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      name text NOT NULL DEFAULT '',
      country_code text,
      signup_bonus_claimed boolean NOT NULL DEFAULT false,
      email_verified boolean NOT NULL DEFAULT false,
      pending_email text,
      pending_email_verification_token_hash text,
      pending_email_verification_expires_at timestamptz,
      email_verification_token_hash text,
      email_verification_expires_at timestamptz,
      google_sub text UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz
    );

    CREATE TABLE IF NOT EXISTS sg_user_sessions (
      token_hash text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES sg_users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sg_entitlements (
      user_id uuid PRIMARY KEY REFERENCES sg_users(id) ON DELETE CASCADE,
      access_until timestamptz NOT NULL,
      source text NOT NULL DEFAULT 'stripe',
      stripe_customer_id text,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sg_daily_plays (
      daily_key text PRIMARY KEY,
      user_id uuid REFERENCES sg_users(id) ON DELETE CASCADE,
      anon_hash text,
      play_date date NOT NULL,
      scope_type text NOT NULL,
      scope_slug text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sg_payments (
      id uuid PRIMARY KEY,
      user_id uuid REFERENCES sg_users(id) ON DELETE SET NULL,
      email text NOT NULL,
      amount_cents integer NOT NULL,
      currency text NOT NULL DEFAULT 'usd',
      status text NOT NULL,
      stripe_session_id text UNIQUE,
      stripe_payment_intent_id text,
      refunded_at timestamptz,
      receipt_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await queryDb('ALTER TABLE sg_users ADD COLUMN IF NOT EXISTS country_code text');
  await queryDb('ALTER TABLE sg_users ADD COLUMN IF NOT EXISTS signup_bonus_claimed boolean NOT NULL DEFAULT false');
  await queryDb('ALTER TABLE sg_users ADD COLUMN IF NOT EXISTS pending_email text');
  await queryDb('ALTER TABLE sg_users ADD COLUMN IF NOT EXISTS pending_email_verification_token_hash text');
  await queryDb('ALTER TABLE sg_users ADD COLUMN IF NOT EXISTS pending_email_verification_expires_at timestamptz');
  await queryDb('ALTER TABLE sg_payments ADD COLUMN IF NOT EXISTS receipt_url text');
}

function hashToken(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function isMailerSendConfigured(): boolean {
  return Boolean(
    process.env.MAILERSEND_API_KEY?.trim() &&
    process.env.MAILERSEND_FROM_EMAIL?.trim()
  );
}

async function sendTransactionalEmail(toEmail: string, toName: string, subject: string, text: string, html: string): Promise<void> {
  const apiKey = process.env.MAILERSEND_API_KEY?.trim();
  const fromEmail = process.env.MAILERSEND_FROM_EMAIL?.trim();
  const fromName = process.env.MAILERSEND_FROM_NAME?.trim() || 'Song Guess Game';
  if (!apiKey || !fromEmail) return;

  const response = await fetch(MAILERSEND_EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`MailerSend returned ${response.status}: ${body.slice(0, 300)}`);
  }
}

async function sendVerificationEmail(email: string, name: string, verificationUrl: string, mode: 'new-account' | 'email-change'): Promise<boolean> {
  if (!isMailerSendConfigured()) return false;
  const title = mode === 'email-change' ? 'Verify your new Song Guess email' : 'Verify your Song Guess account';
  const intro = mode === 'email-change'
    ? 'Confirm this email address to finish updating your Song Guess account.'
    : 'Confirm your email address to finish setting up your Song Guess account.';
  await sendTransactionalEmail(
    email,
    name,
    title,
    `${intro}\n\n${verificationUrl}\n\nThis link expires in 24 hours.`,
    `<p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(verificationUrl)}">Verify email</a></p><p>This link expires in 24 hours.</p>`
  );
  return true;
}

async function sendContactEmail(name: string, email: string, message: string): Promise<boolean> {
  if (!isMailerSendConfigured()) return false;
  await sendTransactionalEmail(
    'info@songguessgame.online',
    'Song Guess Game',
    `Song Guess contact request from ${name}`,
    `Name: ${name}\nEmail: ${email}\n\n${message}`,
    [
      '<h2>Song Guess contact request</h2>',
      `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`,
      `<p><strong>Email:</strong> ${escapeHtml(email)}</p>`,
      `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
    ].join('')
  );
  return true;
}

function isSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID?.trim() && process.env.SPOTIFY_CLIENT_SECRET?.trim());
}

async function getSpotifyAccessToken(): Promise<string> {
  if (spotifyAccessTokenCache && spotifyAccessTokenCache.expiresAt > Date.now() + 30_000) {
    return spotifyAccessTokenCache.token;
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('Spotify Web API credentials are not configured');

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  });
  if (!response.ok) {
    throw new Error(`Spotify token request failed with ${response.status}`);
  }
  const body = await response.json() as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error('Spotify token response did not include an access token');
  spotifyAccessTokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + Math.max(60, Number(body.expires_in || 3600) - 60) * 1000
  };
  return spotifyAccessTokenCache.token;
}

async function fetchSpotifyJson<T>(pathOrUrl: string): Promise<T> {
  const token = await getSpotifyAccessToken();
  const url = pathOrUrl.startsWith('https://') ? pathOrUrl : `${SPOTIFY_API_URL}${pathOrUrl}`;
  const request = () => fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  let response = await request();
  const retryAfterSeconds = Number(response.headers.get('retry-after') || '');
  if (response.status === 429 && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 && retryAfterSeconds <= 3) {
    await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000));
    response = await request();
  }
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('retry-after') || '');
    const retryMessage = Number.isFinite(retryAfter) && retryAfter > 0 ? ` Retry after ${retryAfter} seconds.` : '';
    throw new SpotifyApiError(response.status, `Spotify API returned ${response.status}.${retryMessage}`, retryAfter);
  }
  return await response.json() as T;
}

function getGoogleOAuthConfig(req: Request): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: `${getEffectiveAppUrl(req)}/api/auth/google/callback`
  };
}

function getRequestOrigin(req?: Request): string {
  if (!req?.headers.host) return '';
  const forwardedProto = typeof req.headers['x-forwarded-proto'] === 'string'
    ? req.headers['x-forwarded-proto'].split(',')[0].trim()
    : '';
  const protocol = forwardedProto || (req.secure ? 'https' : 'http');
  return `${protocol}://${req.headers.host}`;
}

function normalizePublicAppUrl(rawUrl: string, fallback = 'https://songguess.example.com'): string {
  const raw = rawUrl.trim();
  const candidate = raw ? (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`) : fallback;

  try {
    const parsed = new URL(candidate);
    return parsed.origin.replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

function getEnvPublicAppUrl(req?: Request): string {
  const envUrl = getStringEnv(['APP_URL', 'VITE_APP_URL', 'VITE_DOMAIN_NAME']);
  const requestOrigin = getRequestOrigin(req);
  return normalizePublicAppUrl(envUrl || requestOrigin);
}

function getEffectiveAppUrl(req?: Request, config?: Pick<AdminConfigState, 'appUrl'>): string {
  const envUrl = getStringEnv(['APP_URL', 'VITE_APP_URL', 'VITE_DOMAIN_NAME']);
  const configuredUrl = config?.appUrl || '';
  const requestOrigin = getRequestOrigin(req);
  return normalizePublicAppUrl(envUrl || configuredUrl || requestOrigin);
}

function getEffectiveHost(appUrl: string): string {
  try {
    return new URL(appUrl).host;
  } catch {
    return appUrl.replace(/^https?:\/\//i, '').split('/')[0];
  }
}

function getRecaptchaSiteKey(): string {
  return safeText(process.env.VITE_RECAPTCHA_SITE_KEY || process.env.RECAPTCHA_SITE_KEY, 200);
}

function getRecaptchaSecretKey(): string {
  return safeText(process.env.RECAPTCHA_SECRET_KEY, 200);
}

function getRecaptchaMinScore(): number {
  const parsed = Number(process.env.RECAPTCHA_MIN_SCORE || '0.5');
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.min(1, Math.max(0, parsed));
}

function sendSpotifyError(res: ExpressResponse, error: unknown, fallback: string): void {
  if (error instanceof SpotifyApiError) {
    if (error.status === 429) {
      res.status(429).json({
        error: error.retryAfterSeconds
          ? `Spotify is rate-limiting artist updates. Try again in ${error.retryAfterSeconds} seconds.`
          : 'Spotify is rate-limiting artist updates. Try again later.',
        retryAfterSeconds: error.retryAfterSeconds
      });
      return;
    }
    if (error.status === 401 || error.status === 403) {
      res.status(502).json({ error: 'Spotify credentials are not allowed to access this catalog endpoint. Check the Spotify app credentials.' });
      return;
    }
  }

  res.status(isSpotifyConfigured() ? 502 : 503).json({
    error: error instanceof Error ? error.message : fallback
  });
}

async function verifyRecaptcha(req: Request, action: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = getRecaptchaSecretKey();
  if (!secret) return { ok: true };

  const token = safeText(req.body?.recaptchaToken, 5000);
  if (!token) {
    return { ok: false, error: 'Spam protection check is required. Please refresh and try again.' };
  }

  try {
    const params = new URLSearchParams({
      secret,
      response: token
    });
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const result = await response.json() as {
      success?: boolean;
      score?: number;
      action?: string;
    };
    const score = typeof result.score === 'number' ? result.score : 0;
    if (!result.success || result.action !== action || score < getRecaptchaMinScore()) {
      return { ok: false, error: 'Spam protection failed. Please try again.' };
    }
    return { ok: true };
  } catch (error) {
    console.warn('reCAPTCHA verification failed:', error instanceof Error ? error.message : error);
    return { ok: false, error: 'Spam protection is temporarily unavailable. Please try again.' };
  }
}

function slugifyRouteSegment(value: string): string {
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
  return withoutSpotifySuffix.join(' ');
}

function safeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function safeMultilineText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function safeHttpsUrl(value: unknown): string {
  const raw = safeText(value, 2048);
  if (!raw) return '';

  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function safePublicImageUrl(value: unknown): string {
  const raw = safeText(value, 2048);
  if (!raw) return '';
  if (/^\/uploads\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp|gif)$/i.test(raw)) {
    return raw;
  }
  return safeHttpsUrl(raw);
}

function safeHeading(value: unknown, fallback: string): string {
  const heading = safeText(value, 120);
  if (!heading || /song\s+trivia\s+challenge/i.test(heading)) return fallback;
  return heading;
}

function sanitizeGoogleAnalyticsId(value: unknown): string {
  const raw = safeText(value, 40).toUpperCase();
  return /^(G|GT|AW)-[A-Z0-9-]{4,32}$/.test(raw) ? raw : '';
}

function sanitizeAdsenseClientId(value: unknown): string {
  const raw = safeText(value, 40);
  return /^ca-pub-\d{12,24}$/.test(raw) ? raw : '';
}

function sanitizeSearchConsoleVerification(value: unknown): string {
  const raw = safeText(value, 320);
  const contentMatch = raw.match(/content=["']([^"']+)["']/i);
  const token = contentMatch?.[1] || raw;
  return /^[A-Za-z0-9_-]{8,160}$/.test(token) ? token : '';
}

function createDefaultPageConfig(countryCode: string, appUrl: string): AdminPageConfig {
  const country = COUNTRIES.find((item) => item.code === countryCode) || COUNTRIES[0];
  const countryName = country.code === 'GLOBAL' ? 'Global' : country.name;
  const slug = country.code === 'GLOBAL' ? '' : slugifyRouteSegment(country.name);
  const pathSegment = country.code === 'GLOBAL' ? '/play' : `/play/${slug}`;

  return {
    countryCode: country.code,
    slug,
    pageTitle:
      country.code === 'GLOBAL'
        ? 'Song Guess Game - Global Song Trivia & Daily Music Quiz'
        : `${countryName} Song Guess Game - Daily Music Trivia`,
    metaDescription: `Play the daily ${countryName} music quiz. Guess hit songs from short audio snippets, challenge friends, and explore country playlists by era and genre.`,
    keywords: `song guess game, music quiz, ${countryName} songs, audio trivia, daily song quiz`,
    canonicalUrl: `${appUrl}${pathSegment}`,
    customHeading: `${countryName} Song Guess - Heardle`,
    customIntroText: 'Listen to short snippets, guess the title, and share your score card.',
    socialTitle: country.code === 'GLOBAL' ? 'Song Guess Game' : `${countryName} Song Guess Game`,
    socialDescription: `Can you recognize ${countryName} hits from tiny audio snippets?`,
    socialImageUrl: '',
    updatedAt: new Date().toISOString()
  };
}

function createDefaultAdSlots(): AdminAdSlot[] {
  return [
    {
      id: 'slot-header-top',
      name: 'Top Header AdSense',
      location: 'header',
      type: 'adsense',
      enabled: false,
      adsenseSlot: ''
    },
    {
      id: 'slot-left-rail',
      name: 'Left Rail Placement',
      location: 'left_rail',
      type: 'adsense',
      enabled: false,
      adsenseSlot: ''
    },
    {
      id: 'slot-right-rail',
      name: 'Right Rail Placement',
      location: 'right_rail',
      type: 'adsense',
      enabled: false,
      adsenseSlot: ''
    },
    {
      id: 'slot-under-guess',
      name: 'Below Guess Banner',
      location: 'under_guess',
      type: 'manual_banner',
      enabled: false,
      bannerImageUrl: '',
      bannerLinkUrl: '',
      bannerAltText: 'Sponsored music banner'
    },
    {
      id: 'slot-reveal-modal',
      name: 'Reveal Modal Placement',
      location: 'reveal_modal',
      type: 'manual_banner',
      enabled: false,
      bannerImageUrl: '',
      bannerLinkUrl: '',
      bannerAltText: 'Sponsored music banner'
    },
    {
      id: 'slot-popup-interstitial',
      name: 'Page Change Interstitial',
      location: 'popup',
      type: 'manual_banner',
      enabled: false,
      bannerImageUrl: '',
      bannerLinkUrl: '',
      bannerAltText: 'Sponsored music banner'
    }
  ];
}

function sanitizeIntegrations(raw: unknown): IntegrationSettings {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const envGa = sanitizeGoogleAnalyticsId(process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID);
  const envAdsense = sanitizeAdsenseClientId(process.env.GOOGLE_ADSENSE_CLIENT);
  const envSearchConsole = sanitizeSearchConsoleVerification(process.env.GOOGLE_SEARCH_CONSOLE_VERIFICATION);
  const sourceGa = sanitizeGoogleAnalyticsId(source.googleAnalyticsMeasurementId);
  const sourceAdsense = sanitizeAdsenseClientId(source.googleAdsenseClientId);
  const sourceSearchConsole = sanitizeSearchConsoleVerification(source.searchConsoleVerification);

  const googleAnalyticsMeasurementId = sourceGa || envGa;
  const googleAdsenseClientId = sourceAdsense || envAdsense;
  const searchConsoleVerification = sourceSearchConsole || envSearchConsole;
  const analyticsEnabled =
    sourceGa
      ? (typeof source.analyticsEnabled === 'boolean' ? source.analyticsEnabled : true)
      : Boolean(envGa);
  const adsenseEnabled =
    sourceAdsense
      ? (typeof source.adsenseEnabled === 'boolean' ? source.adsenseEnabled : true)
      : Boolean(envAdsense);

  return {
    analyticsEnabled: Boolean(analyticsEnabled && googleAnalyticsMeasurementId),
    googleAnalyticsMeasurementId,
    adsenseEnabled: Boolean(adsenseEnabled && googleAdsenseClientId),
    googleAdsenseClientId,
    searchConsoleVerification
  };
}

function sanitizePageConfigs(raw: unknown, appUrl: string): Record<string, AdminPageConfig> {
  const source = raw && typeof raw === 'object' ? raw as Record<string, Record<string, unknown>> : {};
  const pageConfigs: Record<string, AdminPageConfig> = {};
  const usedSlugs = new Set<string>();

  for (const country of COUNTRIES) {
    const fallback = createDefaultPageConfig(country.code, appUrl);
    const incoming = source[country.code] || {};
    const baseSlug = safeText(incoming.slug, 90) || fallback.slug;
    let slug = country.code === 'GLOBAL' ? '' : slugifyRouteSegment(baseSlug || country.name);

    if (country.code !== 'GLOBAL') {
      if (!slug) slug = country.code.toLowerCase();
      if (usedSlugs.has(slug)) slug = `${slug}-${country.code.toLowerCase()}`;
      usedSlugs.add(slug);
    }

    const pathSegment = country.code === 'GLOBAL' ? '/play' : `/play/${slug}`;
    const socialImageUrl = safePublicImageUrl(incoming.socialImageUrl);

    pageConfigs[country.code] = {
      countryCode: country.code,
      slug,
      pageTitle: safeText(incoming.pageTitle, 120) || fallback.pageTitle,
      metaDescription: safeText(incoming.metaDescription, 220) || fallback.metaDescription,
      keywords: safeText(incoming.keywords, 260) || fallback.keywords,
      canonicalUrl: `${appUrl}${pathSegment}`,
      customHeading: safeHeading(incoming.customHeading, fallback.customHeading || ''),
      customIntroText: safeMultilineText(incoming.customIntroText, 260) || fallback.customIntroText,
      socialTitle: safeText(incoming.socialTitle, 120) || safeText(incoming.pageTitle, 120) || fallback.socialTitle,
      socialDescription:
        safeText(incoming.socialDescription, 220) ||
        safeText(incoming.metaDescription, 220) ||
        fallback.socialDescription,
      socialImageUrl,
      updatedAt: safeText(incoming.updatedAt, 40) || new Date().toISOString()
    };
  }

  return pageConfigs;
}

function createDefaultRouteConfig(routeKey: string, appUrl: string): AdminPageConfig {
  const now = new Date().toISOString();

  if (routeKey === 'system:home') {
    return {
      countryCode: 'GLOBAL',
      slug: '',
      pageTitle: 'Song Guess Game - Music Trivia by Artist, Genre & Country',
      metaDescription: 'Play Song Guess Game online. Guess songs from tiny snippets, explore artist discographies, country packs, genres, multiplayer modes, and unlimited play.',
      keywords: 'song guess game, heardle, music quiz, song trivia, artist heardle, genre heardle, country music quiz',
      canonicalUrl: `${appUrl}/`,
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
      canonicalUrl: `${appUrl}/contact`,
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
      canonicalUrl: `${appUrl}/artist`,
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
      canonicalUrl: `${appUrl}/play/genre`,
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
      canonicalUrl: `${appUrl}/play/country`,
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
      pageTitle: `${name} Song Guess - Heardle`,
      metaDescription: `Play the ${name} Heardle-style song guessing challenge. Guess songs by ${name} from short audio snippets.`,
      keywords: `${name} heardle, ${name} song guess, ${name} music quiz`,
      canonicalUrl: `${appUrl}/artist/${slug}`,
      customHeading: `${name} Song Guess - Heardle`,
      customIntroText: `Guess ${name} songs from short audio snippets.`,
      socialTitle: `${name} Song Guess - Heardle`,
      socialDescription: `Can you recognize ${name} songs from tiny snippets?`,
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
      canonicalUrl: `${appUrl}/play/genre/${slug}`,
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
    canonicalUrl: `${appUrl}/play`,
    customHeading: 'Global Song Guess - Heardle',
    customIntroText: 'Play the global playlist and guess each song from short snippets.',
    socialTitle: 'Song Guess Game - Global Heardle',
    socialDescription: 'Guess songs from tiny audio snippets and challenge friends.',
    socialImageUrl: '',
    updatedAt: now
  };
}

function sanitizeRouteConfigs(raw: unknown, appUrl: string): Record<string, AdminPageConfig> {
  const source = raw && typeof raw === 'object' ? raw as Record<string, Record<string, unknown>> : {};
  const routeConfigs: Record<string, AdminPageConfig> = {};
  const validRouteKey = /^(system:(home|play|contact|artist-index|genre-index|country-index)|artist:[a-z0-9-]{1,80}|genre:[a-z0-9-]{1,80})$/;

  for (const [routeKey, incoming] of Object.entries(source).slice(0, 400)) {
    if (!validRouteKey.test(routeKey)) continue;
    const fallback = createDefaultRouteConfig(routeKey, appUrl);
    const cleanSlug = safeText(incoming.slug, 100) || fallback.slug;

    routeConfigs[routeKey] = {
      countryCode: 'GLOBAL',
      slug: routeKey.startsWith('system:') ? fallback.slug : slugifyRouteSegment(cleanSlug),
      pageTitle: safeText(incoming.pageTitle, 120) || fallback.pageTitle,
      metaDescription: safeText(incoming.metaDescription, 220) || fallback.metaDescription,
      keywords: safeText(incoming.keywords, 260) || fallback.keywords,
      canonicalUrl: fallback.canonicalUrl,
      customHeading: safeHeading(incoming.customHeading, fallback.customHeading || ''),
      customIntroText: safeMultilineText(incoming.customIntroText, 260) || fallback.customIntroText,
      socialTitle: safeText(incoming.socialTitle, 120) || safeText(incoming.pageTitle, 120) || fallback.socialTitle,
      socialDescription:
        safeText(incoming.socialDescription, 220) ||
        safeText(incoming.metaDescription, 220) ||
        fallback.socialDescription,
      socialImageUrl: safePublicImageUrl(incoming.socialImageUrl) || fallback.socialImageUrl || '',
      updatedAt: safeText(incoming.updatedAt, 40) || new Date().toISOString()
    };
  }

  return routeConfigs;
}

function getDefaultFeaturedArtistSlugs(): string[] {
  return getArtistChallenges().slice(0, FEATURED_ARTIST_LIMIT).map((artist) => artist.slug);
}

function sanitizeFeaturedArtistSlugs(raw: unknown): string[] {
  const source = Array.isArray(raw) ? raw : [];
  const selected: string[] = [];

  for (const item of source) {
    const slug = slugifyChallenge(safeText(item, 100));
    if (!slug || selected.includes(slug)) continue;
    selected.push(slug);
    if (selected.length >= FEATURED_ARTIST_LIMIT) break;
  }

  return selected.length > 0 ? selected : getDefaultFeaturedArtistSlugs();
}

function sanitizeAdSlot(raw: unknown, fallback: AdminAdSlot): AdminAdSlot {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const location = AD_LOCATIONS.has(source.location as AdPlacementLocation)
    ? source.location as AdPlacementLocation
    : fallback.location;
  const type = AD_TYPES.has(source.type as AdSlotType) ? source.type as AdSlotType : fallback.type;

  return {
    id: safeText(source.id, 80) || fallback.id,
    name: safeText(source.name, 80) || fallback.name,
    location,
    type,
    enabled: Boolean(source.enabled),
    adsenseSlot: safeText(source.adsenseSlot, 32).replace(/[^0-9]/g, ''),
    bannerImageUrl: safePublicImageUrl(source.bannerImageUrl),
    bannerLinkUrl: safeHttpsUrl(source.bannerLinkUrl),
    bannerAltText: safeText(source.bannerAltText, 120) || fallback.bannerAltText || 'Sponsored music banner'
  };
}

function sanitizeAdSlots(raw: unknown): AdminAdSlot[] {
  const defaults = createDefaultAdSlots();
  const rawSlots = Array.isArray(raw) ? raw.slice(0, 12) : [];
  const rawById = new Map<string, unknown>();

  for (const slot of rawSlots) {
    if (slot && typeof slot === 'object') {
      const id = safeText((slot as Record<string, unknown>).id, 80);
      if (id) rawById.set(id, slot);
    }
  }

  const sanitized = defaults.map((fallback) => sanitizeAdSlot(rawById.get(fallback.id), fallback));
  const knownIds = new Set(sanitized.map((slot) => slot.id));

  for (const rawSlot of rawSlots) {
    const id = safeText((rawSlot as Record<string, unknown>)?.id, 80);
    if (!id || knownIds.has(id)) continue;
    const sanitizedSlot = sanitizeAdSlot(rawSlot, {
      id,
      name: 'Custom Placement',
      location: 'under_guess',
      type: 'manual_banner',
      enabled: false
    });
    sanitized.push(sanitizedSlot);
    knownIds.add(sanitizedSlot.id);
  }

  return sanitized;
}

function sanitizeAdminConfig(raw: unknown, req?: Request): AdminConfigState {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const appUrl = getEffectiveAppUrl(req, { appUrl: safeText(source.appUrl, 2048) || getEnvPublicAppUrl(req) });

  return {
    version: CONFIG_VERSION,
    appUrl,
    integrations: sanitizeIntegrations(source.integrations),
    pageConfigs: sanitizePageConfigs(source.pageConfigs, appUrl),
    routeConfigs: sanitizeRouteConfigs(source.routeConfigs, appUrl),
    featuredArtistSlugs: sanitizeFeaturedArtistSlugs(source.featuredArtistSlugs),
    adSlots: sanitizeAdSlots(source.adSlots),
    robotsTxt: safeMultilineText(source.robotsTxt, 8000),
    updatedAt: safeText(source.updatedAt, 40) || new Date().toISOString()
  };
}

function getAdminConfigPath(): string {
  return path.resolve(process.env.ADMIN_CONFIG_PATH || path.join(process.cwd(), 'data', 'admin-config.json'));
}

function getActivityLogPath(): string {
  return path.resolve(process.env.ADMIN_ACTIVITY_PATH || path.join(process.cwd(), 'data', 'activity-log.json'));
}

function getArtistRequestsPath(): string {
  return path.resolve(process.env.ARTIST_REQUESTS_PATH || path.join(process.cwd(), 'data', 'artist-requests.json'));
}

function getNextArtistPackRefreshAt(from = Date.now()): string {
  return new Date(from + ARTIST_PACK_REFRESH_INTERVAL_MS).toISOString();
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Failed to read ${filePath}:`, error);
    }
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await rename(tempPath, filePath);
}

async function getRequestedArtists(): Promise<RequestedArtist[]> {
  const rows = await readJsonFile<RequestedArtist[]>(getArtistRequestsPath(), []);
  const normalized = rows
    .filter((artist) => artist.slug && artist.name && Array.isArray(artist.songIds))
    .map((artist): RequestedArtist => {
      const songs = Array.isArray(artist.songs)
        ? artist.songs
            .filter((song) => song && song.id && song.title && song.artist && song.previewUrl)
            .map((song) => ({
              ...song,
              id: safeText(song.id, 120),
              title: safeText(song.title, 160),
              artist: safeText(song.artist, 160),
              album: safeText(song.album, 160) || 'Artist Request',
              genre: safeText(song.genre, 80) || 'Artist Request',
              countryCode: safeText(song.countryCode, 12) || 'GLOBAL',
              artworkUrl: safePublicImageUrl(song.artworkUrl),
              previewUrl: safeText(song.previewUrl, MAX_URL_LENGTH),
              spotifyUrl: safeHttpsUrl(song.spotifyUrl),
              deezerUrl: safeHttpsUrl(song.deezerUrl),
              difficulty: song.difficulty || 'MEDIUM'
            }))
            .slice(0, 50)
        : [];
      const hasSpotifyBuiltSongs = songs.length > 0;
      return {
        ...artist,
        slug: slugifyChallenge(artist.slug),
        name: safeText(artist.name, 100),
        spotifyArtistId: safeText(artist.spotifyArtistId, 80),
        spotifyUrl: safeHttpsUrl(artist.spotifyUrl),
        songIds: hasSpotifyBuiltSongs ? songs.map((song) => song.id) : [],
        songs: hasSpotifyBuiltSongs ? songs : undefined,
        songsCount: songs.length,
        coverImage: hasSpotifyBuiltSongs ? safePublicImageUrl(artist.coverImage) || songs[0]?.artworkUrl || ALL_SONGS[0]?.artworkUrl || '' : '',
        status: hasSpotifyBuiltSongs ? 'ready' : 'pending',
        createdAt: safeText(artist.createdAt, 40) || new Date().toISOString(),
        updatedAt: safeText(artist.updatedAt, 40),
        nextRefreshAt: safeText(artist.nextRefreshAt, 40),
        lastRefreshType: artist.lastRefreshType === 'manual' || artist.lastRefreshType === 'automatic' || artist.lastRefreshType === 'request'
          ? artist.lastRefreshType
          : undefined
      };
    });
  return dedupeRequestedArtists(normalized);
}

function getRequestedArtistDedupeKey(artist: RequestedArtist): string {
  const baseSlug = slugifyChallenge(artist.slug.replace(/-[a-z0-9]{8}$/i, '')) || slugifyChallenge(artist.name);
  return baseSlug || artist.spotifyArtistId || artist.slug;
}

function requestedArtistRank(artist: RequestedArtist): number {
  const statusScore = artist.status === 'ready' ? 1_000_000 : 0;
  const spotifyScore = artist.spotifyArtistId ? 100_000 : 0;
  const songScore = Math.max(0, Math.min(10_000, artist.songsCount || artist.songs?.length || 0));
  const date = Date.parse(artist.updatedAt || artist.createdAt || '');
  const dateScore = Number.isFinite(date) ? Math.floor(date / 86_400_000) : 0;
  return statusScore + spotifyScore + songScore + dateScore;
}

function dedupeRequestedArtists(artists: RequestedArtist[]): RequestedArtist[] {
  const byBaseSlug = new Map<string, RequestedArtist>();
  artists.forEach((artist) => {
    const key = getRequestedArtistDedupeKey(artist);
    const existing = byBaseSlug.get(key);
    if (!existing || requestedArtistRank(artist) > requestedArtistRank(existing)) {
      byBaseSlug.set(key, artist);
    }
  });
  return Array.from(byBaseSlug.values());
}

async function saveRequestedArtists(artists: RequestedArtist[]): Promise<void> {
  await writeJsonFile(getArtistRequestsPath(), dedupeRequestedArtists(artists));
}

function buildRequestedArtistPack(name: string): RequestedArtist {
  const slug = slugifyChallenge(name);
  const seed = slug.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rotated = [...ALL_SONGS.slice(seed % Math.max(1, ALL_SONGS.length)), ...ALL_SONGS.slice(0, seed % Math.max(1, ALL_SONGS.length))];
  const songs = rotated.slice(0, Math.min(24, Math.max(10, rotated.length)));
  return {
    slug,
    name: safeText(name, 100),
    songIds: songs.map((song) => song.id),
    songsCount: songs.length,
    coverImage: songs[0]?.artworkUrl || '',
    status: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nextRefreshAt: getNextArtistPackRefreshAt(),
    lastRefreshType: 'request'
  };
}

async function fetchSpotifyArtistImageUrl(name: string): Promise<string> {
  const search = await fetchSpotifyJson<{
    artists?: { items?: Array<{ name?: string; images?: Array<{ url?: string }> }> };
  }>(`/search?${new URLSearchParams({ q: name, type: 'artist', limit: '1' }).toString()}`);
  return search.artists?.items?.[0]?.images?.[0]?.url || '';
}

type SpotifyArtistApiItem = {
  id?: string;
  name?: string;
  external_urls?: { spotify?: string };
  images?: Array<{ url?: string }>;
  followers?: { total?: number };
  popularity?: number;
  genres?: string[];
};

function normalizeSpotifyArtistSuggestion(artist: SpotifyArtistApiItem): SpotifyArtistSuggestion | null {
  const id = safeText(artist.id, 80);
  const name = safeText(artist.name, 100);
  if (!id || !name) return null;
  return {
    id,
    name,
    imageUrl: safeHttpsUrl(artist.images?.[0]?.url),
    spotifyUrl: safeHttpsUrl(artist.external_urls?.spotify),
    followers: Number.isFinite(Number(artist.followers?.total)) ? Number(artist.followers?.total) : undefined,
    popularity: Number.isFinite(Number(artist.popularity)) ? Number(artist.popularity) : undefined,
    genres: Array.isArray(artist.genres) ? artist.genres.map((genre) => safeText(genre, 60)).filter(Boolean).slice(0, 4) : []
  };
}

async function searchSpotifyArtistSuggestions(query: string): Promise<SpotifyArtistSuggestion[]> {
  if (!isSpotifyConfigured()) {
    throw new Error('Spotify Web API is not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.');
  }
  const cleanQuery = safeText(query, 100);
  if (cleanQuery.length < 2) return [];
  const search = await fetchSpotifyJson<{
    artists?: { items?: SpotifyArtistApiItem[] };
  }>(`/search?${new URLSearchParams({ q: cleanQuery, type: 'artist', limit: '10' }).toString()}`);
  return (search.artists?.items || [])
    .map(normalizeSpotifyArtistSuggestion)
    .filter((artist): artist is SpotifyArtistSuggestion => Boolean(artist));
}

async function buildRequestedArtistPackFromSpotify(name: string, spotifyArtistId = ''): Promise<RequestedArtist> {
  if (!isSpotifyConfigured()) {
    throw new Error('Spotify Web API is not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.');
  }
  const selectedSpotifyArtistId = safeText(spotifyArtistId, 80);

  const spotifyArtist = selectedSpotifyArtistId
    ? await fetchSpotifyJson<SpotifyArtistApiItem>(`/artists/${encodeURIComponent(selectedSpotifyArtistId)}`)
    : (await fetchSpotifyJson<{ artists?: { items?: SpotifyArtistApiItem[] } }>(
        `/search?${new URLSearchParams({ q: name, type: 'artist', limit: '1' }).toString()}`
      )).artists?.items?.[0];
  if (!spotifyArtist?.id) {
    throw new Error(`No Spotify artist found for "${name}".`);
  }
  const slugBase = slugifyChallenge(spotifyArtist.name || name);
  const slug = selectedSpotifyArtistId ? `${slugBase}-${selectedSpotifyArtistId.slice(0, 8).toLowerCase()}` : slugBase;

  let topTracksResponse: { tracks?: Array<any> } = {};
  try {
    topTracksResponse = await fetchSpotifyJson<{ tracks?: Array<any> }>(
      `/artists/${encodeURIComponent(spotifyArtist.id)}/top-tracks?${new URLSearchParams({ market: 'US' }).toString()}`
    );
  } catch (error) {
    console.warn('Spotify top tracks lookup skipped:', error instanceof Error ? error.message : error);
  }
  type SpotifyAlbumSummary = {
    id?: string;
    name?: string;
    album_type?: string;
    release_date?: string;
    images?: Array<{ url?: string }>;
    external_urls?: { spotify?: string };
  };
  const albums: SpotifyAlbumSummary[] = [];
  for (let offset = 0; offset < SPOTIFY_ARTIST_ALBUM_LIMIT; offset += 10) {
    const albumsResponse = await fetchSpotifyJson<{
      items?: SpotifyAlbumSummary[];
      total?: number;
    }>(
      `/artists/${encodeURIComponent(spotifyArtist.id)}/albums?${new URLSearchParams({
        include_groups: 'album,single',
        market: 'US',
        limit: '10',
        offset: String(offset)
      }).toString()}`
    );
    albums.push(...(albumsResponse.items || []));
    if (!albumsResponse.items?.length || albums.length >= SPOTIFY_ARTIST_ALBUM_LIMIT || albums.length >= (albumsResponse.total || albums.length)) break;
  }

  const albumTracks: Array<{ track: any; album: any }> = [];
  for (const album of albums) {
    if (!album.id) continue;
    try {
      const tracksResponse = await fetchSpotifyJson<{ items?: Array<any> }>(
        `/albums/${encodeURIComponent(album.id)}/tracks?${new URLSearchParams({ market: 'US', limit: '50' }).toString()}`
      );
      (tracksResponse.items || []).forEach((track) => albumTracks.push({ track, album }));
    } catch (error) {
      console.warn('Spotify album tracks lookup failed:', error instanceof Error ? error.message : error);
    }
  }

  const seen = new Set<string>();
  const spotifyTracks = [
    ...(topTracksResponse.tracks || []).map((track) => ({ track, album: track.album })),
    ...albumTracks
  ].filter(({ track }) => {
    const title = safeText(track?.name, 160);
    const artistNames = Array.isArray(track?.artists) ? track.artists.map((artist: any) => safeText(artist?.name, 120)).join(' ') : '';
    const key = `${title}-${artistNames}`.toLowerCase();
    if (!title || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);

  if (spotifyTracks.length === 0) {
    throw new Error(`Spotify did not return playable tracks for "${spotifyArtist.name || name}".`);
  }

  const songs = spotifyTracks.map(({ track, album }, index): Song => {
    const title = safeText(track.name, 160);
    const artist = Array.isArray(track.artists) && track.artists.length > 0
      ? track.artists.map((item: any) => safeText(item.name, 120)).filter(Boolean).join(' & ')
      : safeText(spotifyArtist.name, 100) || safeText(name, 100);
    const artworkUrl = safeHttpsUrl(album?.images?.[0]?.url);
    const releaseYear = Number(String(album?.release_date || '').slice(0, 4));
    const directPreview = safeHttpsUrl(track.preview_url);
    const params = new URLSearchParams({ title, artist });
    if (directPreview) params.set('url', directPreview);
    return {
      id: `requested-${slug}-${safeText(String(track.id || index), 80)}`,
      title,
      artist,
      album: safeText(album?.name, 160) || `${artist} Essentials`,
      genre: 'Spotify Artist Catalog',
      countryCode: 'GLOBAL',
      releaseYear: Number.isFinite(releaseYear) ? releaseYear : undefined,
      artworkUrl,
      previewUrl: `/api/music/preview?${params.toString()}`,
      spotifyTrackId: safeText(track.id, 80),
      spotifyUri: safeText(track.uri, 120),
      spotifyUrl: safeHttpsUrl(track.external_urls?.spotify || album?.external_urls?.spotify),
      difficulty: index < 5 ? 'EASY' : index < 20 ? 'MEDIUM' : 'HARD'
    };
  });

  return {
    slug,
    name: safeText(spotifyArtist.name, 100) || safeText(name, 100),
    spotifyArtistId: safeText(spotifyArtist.id, 80),
    spotifyUrl: safeHttpsUrl(spotifyArtist.external_urls?.spotify),
    songIds: songs.map((song) => song.id),
    songs,
    songsCount: songs.length,
    coverImage: safeHttpsUrl(spotifyArtist.images?.[0]?.url) || songs[0]?.artworkUrl || '',
    status: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nextRefreshAt: getNextArtistPackRefreshAt(),
    lastRefreshType: 'request'
  };
}

async function refreshDueArtistPacks(): Promise<void> {
  if (!isSpotifyConfigured() || process.env.SPOTIFY_AUTO_REFRESH_ENABLED === 'false') return;
  const artists = await getRequestedArtists();
  const now = Date.now();
  const dueArtist = artists.find((artist) => {
    if (artist.status !== 'ready' || !artist.spotifyArtistId) return false;
    const nextRefresh = Date.parse(artist.nextRefreshAt || artist.updatedAt || artist.createdAt);
    return !Number.isFinite(nextRefresh) || nextRefresh <= now;
  });
  if (!dueArtist) return;

  try {
    const refreshed = await buildRequestedArtistPackFromSpotify(dueArtist.name, dueArtist.spotifyArtistId);
    refreshed.createdAt = dueArtist.createdAt;
    refreshed.updatedAt = new Date().toISOString();
    refreshed.nextRefreshAt = getNextArtistPackRefreshAt();
    refreshed.lastRefreshType = 'automatic';
    await saveRequestedArtists([
      refreshed,
      ...artists.filter((artist) => artist.spotifyArtistId !== dueArtist.spotifyArtistId && artist.slug !== dueArtist.slug)
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const backoffMs = error instanceof SpotifyApiError && error.status === 429 ? 24 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
    console.warn(`Scheduled artist pack refresh deferred for ${dueArtist.name}: ${message}`);
    dueArtist.nextRefreshAt = new Date(Date.now() + backoffMs).toISOString();
    await saveRequestedArtists(artists);
  }
}

function startArtistPackRefreshScheduler(): void {
  if (artistRefreshTimer) return;
  artistRefreshTimer = setTimeout(() => {
    void refreshDueArtistPacks();
    artistRefreshTimer = setInterval(() => {
      void refreshDueArtistPacks();
    }, ARTIST_PACK_REFRESH_CHECK_MS);
    artistRefreshTimer.unref?.();
  }, ARTIST_PACK_REFRESH_START_DELAY_MS);
  artistRefreshTimer.unref?.();
}

async function getAdminConfig(req?: Request): Promise<AdminConfigState> {
  if (adminConfigCache) {
    return sanitizeAdminConfig(adminConfigCache, req);
  }

  const raw = await readJsonFile<Record<string, unknown>>(getAdminConfigPath(), {});
  adminConfigCache = sanitizeAdminConfig(raw, req);
  return adminConfigCache;
}

async function saveAdminConfig(raw: unknown, req?: Request): Promise<AdminConfigState> {
  const next = {
    ...sanitizeAdminConfig(raw, req),
    updatedAt: new Date().toISOString()
  };
  adminConfigCache = next;
  await writeJsonFile(getAdminConfigPath(), next);
  return next;
}

function buildPublicConfig(
  config: AdminConfigState,
  req?: Request,
  adminEntryRequested = false
): PublicRuntimeConfig {
  const appUrl = getEffectiveAppUrl(req, config);
  return {
    appUrl,
    host: getEffectiveHost(appUrl),
    recaptchaSiteKey: getRecaptchaSiteKey(),
    integrations: sanitizeIntegrations(config.integrations),
    pageConfigs: sanitizePageConfigs(config.pageConfigs, appUrl),
    routeConfigs: sanitizeRouteConfigs(config.routeConfigs, appUrl),
    featuredArtistSlugs: sanitizeFeaturedArtistSlugs(config.featuredArtistSlugs),
    adSlots: sanitizeAdSlots(config.adSlots),
    robotsTxt: safeMultilineText(config.robotsTxt, 8000),
    generatedAt: new Date().toISOString(),
    adminEntryRequested
  };
}

function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};

  return Object.fromEntries(
    cookieHeader.split(';').map((item) => {
      const [name, ...value] = item.trim().split('=');
      return [name, decodeURIComponent(value.join('='))];
    }).filter(([name]) => Boolean(name))
  );
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() || '';
  if (secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== 'production') {
    return 'dev-only-song-guess-admin-session-secret-please-change';
  }
  return '';
}

function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME?.trim() && process.env.ADMIN_PASSWORD?.trim() && getSessionSecret());
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const secret = getSessionSecret() || 'fallback-compare-secret';
  const leftHash = createHmac('sha256', secret).update(left).digest();
  const rightHash = createHmac('sha256', secret).update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function signToken(token: string): string {
  return createHmac('sha256', getSessionSecret()).update(token).digest('base64url');
}

function isSecureRequest(req: Request): boolean {
  const forwardedProto = Array.isArray(req.headers['x-forwarded-proto'])
    ? req.headers['x-forwarded-proto'][0]
    : req.headers['x-forwarded-proto'];
  return Boolean(req.secure || String(forwardedProto || '').split(',')[0].trim().toLowerCase() === 'https');
}

function setAdminCookie(req: Request, res: ExpressResponse, token: string): void {
  const cookieValue = `${token}.${signToken(token)}`;
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookieValue)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}`
  ];

  if (isSecureRequest(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAdminCookie(res: ExpressResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
}

function appendSetCookie(res: ExpressResponse, cookieValue: string): void {
  const current = res.getHeader('Set-Cookie');
  if (!current) {
    res.setHeader('Set-Cookie', cookieValue);
    return;
  }
  res.setHeader('Set-Cookie', Array.isArray(current) ? [...current, cookieValue] : [String(current), cookieValue]);
}

function setUserCookie(req: Request, res: ExpressResponse, token: string): void {
  const cookieValue = `${token}.${signToken(token)}`;
  const parts = [
    `${USER_SESSION_COOKIE_NAME}=${encodeURIComponent(cookieValue)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(USER_SESSION_TTL_MS / 1000)}`
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  appendSetCookie(res, parts.join('; '));
}

function clearUserCookie(res: ExpressResponse): void {
  appendSetCookie(
    res,
    `${USER_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
}

function getOrSetAnonId(req: Request, res: ExpressResponse): string {
  const existing = parseCookies(req)[ANON_COOKIE_NAME];
  if (existing && /^[a-zA-Z0-9_-]{16,80}$/.test(existing)) return existing;
  const token = randomBytes(24).toString('base64url');
  appendSetCookie(
    res,
    `${ANON_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 400}${
      isSecureRequest(req) ? '; Secure' : ''
    }`
  );
  return token;
}

async function createUserSession(req: Request, res: ExpressResponse, userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  await queryDb(
    'INSERT INTO sg_user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, to_timestamp($3 / 1000.0))',
    [tokenHash, userId, Date.now() + USER_SESSION_TTL_MS]
  );
  setUserCookie(req, res, token);
}

function publicUserFromRow(row: Record<string, unknown>): PublicUser {
  return {
    id: String(row.id || ''),
    email: String(row.email || ''),
    name: String(row.name || ''),
    countryCode: String(row.country_code || '') || undefined,
    emailVerified: Boolean(row.email_verified),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || '')
  };
}

async function getUserSession(req: Request): Promise<UserSession | null> {
  if (!isDatabaseConfigured()) return null;
  const cookie = parseCookies(req)[USER_SESSION_COOKIE_NAME];
  if (!cookie) return null;
  const [token, signature] = cookie.split('.');
  if (!token || !signature || !timingSafeStringEqual(signature, signToken(token))) return null;

  const rows = await queryDb<Record<string, unknown>>(
    `SELECT u.id, u.email, u.name, u.country_code, u.email_verified
     FROM sg_user_sessions s
     JOIN sg_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()
     LIMIT 1`,
    [hashToken(token)]
  );
  if (!rows[0]) return null;
  await queryDb('UPDATE sg_users SET last_seen_at = now() WHERE id = $1', [rows[0].id]);
  return {
    id: String(rows[0].id),
    email: String(rows[0].email),
    name: String(rows[0].name || ''),
    countryCode: String(rows[0].country_code || '') || undefined,
    emailVerified: Boolean(rows[0].email_verified)
  };
}

async function requireUser(req: Request, res: ExpressResponse, next: NextFunction): Promise<void> {
  try {
    const user = await getUserSession(req);
    if (!user) {
      res.status(401).json({ error: 'User login required' });
      return;
    }
    res.locals.user = user;
    next();
  } catch (error) {
    res.status(503).json({ error: 'User database is not available' });
  }
}

async function getUserEntitlement(userId?: string): Promise<{ active: boolean; accessUntil?: string; source?: string }> {
  if (!userId || !isDatabaseConfigured()) return { active: false };
  const rows = await queryDb<Record<string, unknown>>(
    'SELECT access_until, source FROM sg_entitlements WHERE user_id = $1 AND access_until > now() LIMIT 1',
    [userId]
  );
  const row = rows[0];
  if (!row) return { active: false };
  const accessUntil = row.access_until instanceof Date ? row.access_until.toISOString() : String(row.access_until || '');
  return { active: true, accessUntil, source: String(row.source || 'stripe') };
}

async function buildAuthSessionResponse(req: Request): Promise<AuthSessionResponse> {
  const user = await getUserSession(req);
  return buildAuthSessionResponseForUser(user);
}

async function buildAuthSessionResponseForUser(user: UserSession | null): Promise<AuthSessionResponse> {
  const entitlement = await getUserEntitlement(user?.id);
  return {
    authenticated: Boolean(user),
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      countryCode: user.countryCode,
      emailVerified: user.emailVerified,
      createdAt: ''
    } : undefined,
    entitlement,
    databaseConfigured: isDatabaseConfigured(),
    stripeConfigured: isStripeConfigured()
  };
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getDailyAccessState(req: Request, res: ExpressResponse, user?: UserSession | null): Promise<DailyAccessState> {
  const entitlement = await getUserEntitlement(user?.id);
  if (entitlement.active) {
    return { allowed: true, unlimited: true, freePlayUsed: false, accessUntil: entitlement.accessUntil };
  }
  if (!isDatabaseConfigured()) {
    return { allowed: true, unlimited: false, freePlayUsed: false, reason: 'Database not configured; local fallback applies.' };
  }
  if (user) {
    const rows = await queryDb<Record<string, unknown>>(
      `SELECT
         (SELECT count(*)::int FROM sg_daily_plays WHERE user_id = $1 AND play_date = $2) AS play_count,
         signup_bonus_claimed
       FROM sg_users
       WHERE id = $1
       LIMIT 1`,
      [user.id, todayUtcDate()]
    );
    const row = rows[0];
    const playCount = Number(row?.play_count || 0);
    const maxFreePlays = row && !row.signup_bonus_claimed ? 2 : 1;
    return {
      allowed: playCount < maxFreePlays,
      unlimited: false,
      freePlayUsed: playCount > 0,
      reason: playCount >= maxFreePlays ? 'Your free Daily 5 is used for today. Unlock a 7-day pass for unlimited play and no ads.' : undefined
    };
  }
  const anonHash = hashToken(getOrSetAnonId(req, res));
  const dailyKey = `${todayUtcDate()}:${anonHash}`;
  const rows = await queryDb('SELECT daily_key FROM sg_daily_plays WHERE daily_key = $1 LIMIT 1', [dailyKey]);
  return {
    allowed: rows.length === 0,
    unlimited: false,
    freePlayUsed: rows.length > 0,
    reason: rows.length > 0 ? 'Your free Daily 5 is used for today. Unlock a 7-day pass for unlimited play and no ads.' : undefined
  };
}

async function grantWeeklyEntitlement(userId: string, source = 'stripe', stripeCustomerId = ''): Promise<string> {
  const rows = await queryDb<Record<string, unknown>>(
    `INSERT INTO sg_entitlements (user_id, access_until, source, stripe_customer_id, updated_at)
     VALUES ($1, now() + ($2 || ' days')::interval, $3, NULLIF($4, ''), now())
     ON CONFLICT (user_id)
     DO UPDATE SET
       access_until = GREATEST(sg_entitlements.access_until, now()) + ($2 || ' days')::interval,
       source = EXCLUDED.source,
       stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, sg_entitlements.stripe_customer_id),
       updated_at = now()
     RETURNING access_until`,
    [userId, WEEKLY_UNLOCK_DAYS, source, stripeCustomerId]
  );
  const value = rows[0]?.access_until;
  return value instanceof Date ? value.toISOString() : String(value || '');
}

function createAdminSession(req: Request, res: ExpressResponse, username: string): AdminSession {
  const token = randomBytes(32).toString('base64url');
  const session: AdminSession = {
    username,
    csrfToken: randomBytes(24).toString('base64url'),
    createdAt: Date.now(),
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS
  };

  adminSessions.set(token, session);
  setAdminCookie(req, res, token);
  return session;
}

function getAdminSession(req: Request): { token: string; session: AdminSession } | null {
  const cookie = parseCookies(req)[SESSION_COOKIE_NAME];
  if (!cookie) return null;

  const [token, signature] = cookie.split('.');
  if (!token || !signature || !timingSafeStringEqual(signature, signToken(token))) return null;

  const session = adminSessions.get(token);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(token);
    return null;
  }

  return { token, session };
}

function requireAdmin(req: Request, res: ExpressResponse, next: NextFunction): void {
  if (!isAdminAuthConfigured()) {
    res.status(503).json({ error: 'Admin authentication is not configured on the server' });
    return;
  }

  const authSession = getAdminSession(req);
  if (!authSession) {
    res.status(401).json({ error: 'Admin session required' });
    return;
  }

  authSession.session.expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  res.locals.adminSession = authSession.session;
  res.locals.adminToken = authSession.token;
  next();
}

function requireAdminCsrf(req: Request, res: ExpressResponse, next: NextFunction): void {
  const session = res.locals.adminSession as AdminSession | undefined;
  const csrfToken = typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : '';

  if (!session || !csrfToken || !timingSafeStringEqual(csrfToken, session.csrfToken)) {
    res.status(403).json({ error: 'Valid CSRF token required' });
    return;
  }

  next();
}

function cleanupExpiredAdminSessions(): void {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (session.expiresAt <= now) adminSessions.delete(token);
  }
}

function getAdminAccessPath(): string | null {
  const raw = process.env.ADMIN_ACCESS_PATH?.trim();
  if (!raw && process.env.NODE_ENV === 'production') return null;

  const fallback = process.env.NODE_ENV === 'production' ? '' : '/admin';
  const value = raw || fallback;
  if (!value) return null;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  if (normalized.startsWith('/api') || /[?#]/.test(normalized) || normalized.length > 128) return null;
  return normalized.replace(/\/+$/, '') || '/';
}

function isAdminEntryRequest(req: Request): boolean {
  const adminPath = getAdminAccessPath();
  const normalizedPath = req.path.replace(/\/+$/, '') || '/';
  return Boolean(adminPath && normalizedPath === adminPath);
}

async function getActivityLogs(): Promise<ActivityLogEntry[]> {
  const logs = await readJsonFile<ActivityLogEntry[]>(getActivityLogPath(), []);
  return Array.isArray(logs) ? logs.slice(0, MAX_ACTIVITY_LOGS) : [];
}

async function saveActivityLogs(logs: ActivityLogEntry[]): Promise<void> {
  await writeJsonFile(getActivityLogPath(), logs.slice(0, MAX_ACTIVITY_LOGS));
}

function hashRequestIp(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const secret = getSessionSecret() || 'activity-hash-fallback';
  return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16);
}

function sanitizeActivityLog(raw: unknown, req: Request): ActivityLogEntry {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const countryCode = safeText(source.countryCode, 12).toUpperCase();
  const country = COUNTRIES.find((item) => item.code === countryCode);
  const points = Number.parseInt(String(source.points ?? '0'), 10);
  const correctCount = Number.parseInt(String(source.correctCount ?? '0'), 10);
  const totalRounds = Number.parseInt(String(source.totalRounds ?? '0'), 10);
  const durationSeconds = Number.parseInt(String(source.durationSeconds ?? '0'), 10);
  const pathValue = safeText(source.path, 160);

  return {
    id: `act_${Date.now()}_${randomBytes(4).toString('hex')}`,
    timestamp: Date.now(),
    countryCode: country?.code || 'GLOBAL',
    mode: safeText(source.mode, 24) || 'daily',
    collectionTitle: safeText(source.collectionTitle, 120),
    points: Number.isFinite(points) ? Math.max(0, Math.min(100_000, points)) : 0,
    correctCount: Number.isFinite(correctCount) ? Math.max(0, Math.min(100, correctCount)) : 0,
    totalRounds: Number.isFinite(totalRounds) ? Math.max(0, Math.min(100, totalRounds)) : 0,
    durationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, Math.min(24 * 60 * 60, durationSeconds)) : 0,
    nickname: safeText(source.nickname, 32),
    path: pathValue.startsWith('/') ? pathValue : req.path,
    referrer: safeText(req.headers.referer, 2048),
    userAgent: safeText(req.headers['user-agent'], 240),
    ipHash: hashRequestIp(req)
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createAuthRedirectPage(title: string, message: string, redirectPath: string): string {
  const target = redirectPath.startsWith('/') ? redirectPath : '/play?auth=login';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="1; url=${escapeHtml(target)}" />
    <title>${escapeHtml(title)} - Song Guess</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #050807; color: #fff; font-family: Inter, system-ui, sans-serif; }
      main { width: min(420px, calc(100vw - 32px)); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; background: #0d1410; padding: 28px; text-align: center; box-shadow: 0 24px 80px rgba(0,0,0,.45); }
      h1 { margin: 0 0 10px; font-size: 24px; }
      p { margin: 0 0 18px; color: rgba(255,255,255,.65); }
      a { color: #00140a; background: #00e676; border-radius: 999px; display: inline-flex; padding: 10px 18px; font-weight: 900; text-decoration: none; }
    </style>
    <script>setTimeout(function(){ window.location.replace(${JSON.stringify(target)}); }, 700);</script>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <a href="${escapeHtml(target)}">Continue to login</a>
    </main>
  </body>
</html>`;
}

function serializeJsonForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function resolveCountryCodeFromRequest(req: Request, publicConfig: PublicRuntimeConfig): string {
  const pathSegments = req.path.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment).toLowerCase());
  const pathSegment = pathSegments[0] || '';
  const countryParam = safeText(req.query.country, 12).toUpperCase();
  const byQuery = COUNTRIES.find((country) => country.code === countryParam);
  if (byQuery) return byQuery.code;

  if (!pathSegment || ['privacy', 'gdpr', 'california', 'california-privacy', 'terms', 'cookies', 'artist'].includes(pathSegment)) {
    return 'GLOBAL';
  }

  if (pathSegment === 'play') {
    const playSegment = pathSegments[1] || '';
    if (!playSegment || playSegment === 'genre') return 'GLOBAL';

    const byPlaySlug = Object.values(publicConfig.pageConfigs).find(
      (page) => page.slug.toLowerCase() === playSegment
    );
    if (byPlaySlug) return byPlaySlug.countryCode;

    const byPlayCode = COUNTRIES.find((country) => country.code.toLowerCase() === playSegment);
    return byPlayCode?.code || 'GLOBAL';
  }

  const byCode = COUNTRIES.find((country) => country.code.toLowerCase() === pathSegment);
  if (byCode) return byCode.code;

  const bySlug = Object.values(publicConfig.pageConfigs).find(
    (page) => page.slug.toLowerCase() === pathSegment
  );
  return bySlug?.countryCode || 'GLOBAL';
}

function getRouteOverrideKey(req: Request): string | null {
  const pathSegments = req.path.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment).toLowerCase());
  if (!pathSegments[0]) return 'system:home';
  if (pathSegments[0] === 'contact' && !pathSegments[1]) return 'system:contact';
  if (pathSegments[0] === 'artist' && !pathSegments[1]) return 'system:artist-index';
  if (pathSegments[0] === 'artist' && pathSegments[1]) return `artist:${slugifyChallenge(pathSegments[1])}`;
  if (pathSegments[0] === 'play' && pathSegments[1] === 'country' && !pathSegments[2]) return 'system:country-index';
  if (pathSegments[0] === 'play' && pathSegments[1] === 'genre' && !pathSegments[2]) return 'system:genre-index';
  if (pathSegments[0] === 'play' && pathSegments[1] === 'genre' && pathSegments[2]) return `genre:${slugifyChallenge(pathSegments[2])}`;
  if (pathSegments[0] === 'play' && !pathSegments[1]) return 'system:play';
  return null;
}

function getRouteSeo(req: Request, publicConfig: PublicRuntimeConfig): AdminPageConfig {
  const legalSegment = decodeURIComponent(req.path.split('/').filter(Boolean)[0] || '').toLowerCase();
  const legalTitles: Record<string, { title: string; description: string }> = {
    privacy: {
      title: 'Privacy Policy - Song Guess Game',
      description: 'Privacy details for Song Guess Game, including local storage, analytics, advertising, activity logs, and user rights.'
    },
    gdpr: {
      title: 'GDPR Privacy Rights - Song Guess Game',
      description: 'EU and UK privacy rights for players using Song Guess Game.'
    },
    california: {
      title: 'California Privacy Notice - Song Guess Game',
      description: 'California CCPA and CPRA privacy notice for Song Guess Game players.'
    },
    'california-privacy': {
      title: 'California Privacy Notice - Song Guess Game',
      description: 'California CCPA and CPRA privacy notice for Song Guess Game players.'
    },
    terms: {
      title: 'Terms of Use - Song Guess Game',
      description: 'Terms of use, fair play rules, and platform conditions for Song Guess Game.'
    },
    cookies: {
      title: 'Cookie and Advertising Policy - Song Guess Game',
      description: 'Cookie, analytics, Google AdSense, and manual advertising disclosures for Song Guess Game.'
    }
  };

  const legal = legalTitles[legalSegment];
  if (legal) {
    return {
      ...publicConfig.pageConfigs.GLOBAL,
      pageTitle: legal.title,
      metaDescription: legal.description,
      canonicalUrl: `${publicConfig.appUrl}${req.path}`,
      socialTitle: legal.title,
      socialDescription: legal.description
    };
  }

  const routeKey = getRouteOverrideKey(req);
  if (routeKey) {
    return publicConfig.routeConfigs[routeKey] || createDefaultRouteConfig(routeKey, publicConfig.appUrl);
  }

  const countryCode = resolveCountryCodeFromRequest(req, publicConfig);
  return publicConfig.pageConfigs[countryCode] || publicConfig.pageConfigs.GLOBAL;
}

function getArchiveItemCount(pathname: string): number {
  if (pathname === '/artist') return getArtistChallenges().length;
  if (pathname === '/play/genre') return getGenreChallenges().length;
  if (pathname === '/play/country') return COUNTRIES.length;
  return 0;
}

function getArchivePageNumber(req: Request): number {
  const rawPage = safeText(req.query.page, 12);
  const page = Number.parseInt(rawPage, 10);
  return Number.isFinite(page) && page > 1 ? page : 1;
}

function getArchivePageHref(appUrl: string, pathname: string, page: number): string {
  return page <= 1 ? `${appUrl}${pathname}` : `${appUrl}${pathname}?page=${page}`;
}

function getArchivePaginationSeo(req: Request, publicConfig: PublicRuntimeConfig): {
  canonicalUrl: string;
  prevUrl?: string;
  nextUrl?: string;
} | null {
  const itemCount = getArchiveItemCount(req.path);
  if (!itemCount) return null;

  const totalPages = Math.max(1, Math.ceil(itemCount / ARCHIVE_PAGE_SIZE));
  const page = Math.min(getArchivePageNumber(req), totalPages);
  const canonicalUrl = getArchivePageHref(publicConfig.appUrl, req.path, page);

  return {
    canonicalUrl,
    prevUrl: page > 1 ? getArchivePageHref(publicConfig.appUrl, req.path, page - 1) : undefined,
    nextUrl: page < totalPages ? getArchivePageHref(publicConfig.appUrl, req.path, page + 1) : undefined
  };
}

function injectRuntimeHtml(html: string, req: Request, publicConfig: PublicRuntimeConfig, nonce?: string): string {
  const seo = getRouteSeo(req, publicConfig);
  const title = seo.socialTitle || seo.pageTitle;
  const description = seo.socialDescription || seo.metaDescription;
  const imageUrl = seo.socialImageUrl || '';
  const paginationSeo = getArchivePaginationSeo(req, publicConfig);
  const canonicalUrl = paginationSeo?.canonicalUrl || seo.canonicalUrl;
  const noindexMeta = req.query.room ? '<meta name="robots" content="noindex,follow" />' : '';
  const runtimeScript = `<script${nonce ? ` nonce="${escapeHtml(nonce)}"` : ''}>window.__SONG_GUESS_PUBLIC_CONFIG__=${serializeJsonForInlineScript(publicConfig)};</script>`;
  const googleAnalyticsId = publicConfig.integrations.analyticsEnabled
    ? sanitizeGoogleAnalyticsId(publicConfig.integrations.googleAnalyticsMeasurementId)
    : '';
  const googleTagScript = googleAnalyticsId
    ? [
        `<script id="song-guess-google-tag" async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}"></script>`,
        `<script${nonce ? ` nonce="${escapeHtml(nonce)}"` : ''}>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${escapeHtml(googleAnalyticsId)}',{send_page_view:false});</script>`
      ].join('\n    ')
    : '';
  const adsenseClientId = publicConfig.integrations.adsenseEnabled
    ? sanitizeAdsenseClientId(publicConfig.integrations.googleAdsenseClientId)
    : '';
  const adsenseScript = adsenseClientId
    ? `<script id="song-guess-adsense" async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClientId)}"></script>`
    : '';
  const searchConsoleMeta = publicConfig.integrations.searchConsoleVerification
    ? `<meta name="google-site-verification" content="${escapeHtml(publicConfig.integrations.searchConsoleVerification)}" />`
    : '';
  const socialImageMeta = imageUrl
    ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />\n    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`
    : '';
  const paginationMeta = [
    paginationSeo?.prevUrl ? `<link rel="prev" href="${escapeHtml(paginationSeo.prevUrl)}" />` : '',
    paginationSeo?.nextUrl ? `<link rel="next" href="${escapeHtml(paginationSeo.nextUrl)}" />` : ''
  ].filter(Boolean);

  const metaBlock = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="keywords" content="${escapeHtml(seo.keywords)}" />`,
    noindexMeta,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    ...paginationMeta,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    socialImageMeta,
    searchConsoleMeta,
    googleTagScript,
    adsenseScript,
    runtimeScript
  ].filter(Boolean).join('\n    ');

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']keywords["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
    .replace('</head>', `    ${metaBlock}\n  </head>`);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createDefaultRobotsTxt(appUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /uploads/',
    'Disallow: /admin/',
    'Disallow: /auth/',
    'Disallow: /checkout/',
    'Disallow: /room/',
    'Disallow: /*?room=',
    '',
    `Sitemap: ${appUrl}/sitemap.xml`
  ].join('\n');
}

function ensureRobotsSecurityExclusions(robots: string): string {
  const trimmed = robots.trim();
  const lines = trimmed ? trimmed.split(/\r?\n/) : ['User-agent: *'];
  const requiredDisallows = ['/api/', '/uploads/', '/admin/', '/auth/', '/checkout/', '/room/', '/*?room='];
  const sitemapIndex = lines.findIndex((line) => /^Sitemap:/i.test(line.trim()));
  let insertIndex = sitemapIndex >= 0 ? sitemapIndex : lines.length;
  for (const path of requiredDisallows) {
    const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (lines.some((line) => new RegExp(`^Disallow:\\s*${escaped}\\s*$`, 'i').test(line.trim()))) continue;
    lines.splice(insertIndex, 0, `Disallow: ${path}`);
    insertIndex += 1;
  }
  return lines.join('\n').trim();
}

function getCountryCanonicalPath(countryCode: string, publicConfig: PublicRuntimeConfig): string {
  if (countryCode === 'GLOBAL') return '/play';
  const slug = publicConfig.pageConfigs[countryCode]?.slug || slugifyRouteSegment(
    COUNTRIES.find((country) => country.code === countryCode)?.name || countryCode
  );
  return `/play/${slug}`;
}

function addArchivePagePaths(paths: Set<string>, basePath: string, itemCount: number): void {
  const totalPages = Math.max(1, Math.ceil(itemCount / ARCHIVE_PAGE_SIZE));
  for (let page = 2; page <= totalPages; page += 1) {
    paths.add(`${basePath}?page=${page}`);
  }
}

function getRequestedArtistCanonicalMap(requestedArtists: RequestedArtist[]): Map<string, string> {
  const map = new Map<string, string>();
  requestedArtists.forEach((artist) => {
    if (artist.status === 'ready' && artist.songsCount > 0 && artist.spotifyArtistId) {
      map.set(slugifyChallenge(artist.name), artist.slug);
      map.set(slugifyChallenge(artist.slug.replace(/-[a-z0-9]{8}$/i, '')), artist.slug);
    }
  });
  return map;
}

function buildSitemapXml(publicConfig: PublicRuntimeConfig, requestedArtists: RequestedArtist[] = []): string {
  const today = new Date().toISOString().slice(0, 10);
  const requestedArtistCanonicalMap = getRequestedArtistCanonicalMap(requestedArtists);
  const paths = new Set<string>([
    '/',
    '/play',
    '/play/country',
    '/artist',
    '/play/genre',
    '/contact',
    '/privacy',
    '/gdpr',
    '/california-privacy',
    '/terms',
    '/cookies'
  ]);

  COUNTRIES.forEach((country) => paths.add(getCountryCanonicalPath(country.code, publicConfig)));
  getGenreChallenges().forEach((genre) => paths.add(`/play/genre/${genre.slug}`));
  getArtistChallenges().forEach((artist) => {
    if (!requestedArtistCanonicalMap.has(artist.slug)) paths.add(`/artist/${artist.slug}`);
  });
  const readyRequestedArtists = requestedArtists.filter((artist) => artist.status === 'ready' && artist.songsCount > 0);
  readyRequestedArtists.forEach((artist) => paths.add(`/artist/${artist.slug}`));
  addArchivePagePaths(paths, '/artist', getArtistChallenges().filter((artist) => !requestedArtistCanonicalMap.has(artist.slug)).length + readyRequestedArtists.length);
  addArchivePagePaths(paths, '/play/genre', getGenreChallenges().length);
  addArchivePagePaths(paths, '/play/country', COUNTRIES.length);

  const urls = Array.from(paths).map((pagePath) => {
    const location = `${publicConfig.appUrl}${pagePath === '/' ? '' : pagePath}`;
    return [
      '  <url>',
      `    <loc>${escapeXml(location)}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      '    <changefreq>weekly</changefreq>',
      '    <priority>0.7</priority>',
      '  </url>'
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>'
  ].join('\n');
}

function buildRedirectTarget(req: Request, publicConfig: PublicRuntimeConfig, requestedArtists: RequestedArtist[] = []): string | null {
  if (req.method !== 'GET' && req.method !== 'HEAD') return null;
  if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.startsWith('/uploads')) return null;
  if (req.path === '/robots.txt' || req.path === '/sitemap.xml' || req.path === '/favicon.ico') return null;

  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  let cleanPath = req.path;

  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.replace(/\/+$/, '');
  }

  const cleanSegments = cleanPath.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment).toLowerCase());
  if (cleanSegments[0] === 'play' && cleanSegments[1] && cleanSegments[1] !== 'genre') {
    const playSegment = cleanSegments[1];
    const byPlaySlug = Object.values(publicConfig.pageConfigs).find(
      (page) => page.slug.toLowerCase() === playSegment
    );
    const byPlayCode = COUNTRIES.find((country) => country.code.toLowerCase() === playSegment);
    const countryCode = byPlaySlug?.countryCode || byPlayCode?.code;
    if (countryCode) {
      cleanPath = getCountryCanonicalPath(countryCode, publicConfig);
    }
  }

  if (cleanSegments[0] === 'artist' && cleanSegments[1]) {
    const requestedArtistCanonicalMap = getRequestedArtistCanonicalMap(requestedArtists);
    const cleanArtistSlug = slugifyChallenge(cleanSegments[1]);
    const canonicalSlug = requestedArtistCanonicalMap.get(cleanArtistSlug) || cleanArtistSlug;
    const canonicalArtistPath = `/artist/${canonicalSlug}`;
    if (canonicalArtistPath !== cleanPath) cleanPath = canonicalArtistPath;
  }

  if (cleanSegments[0] === 'play' && cleanSegments[1] === 'genre' && cleanSegments[2]) {
    const canonicalGenrePath = `/play/genre/${slugifyChallenge(cleanSegments[2])}`;
    if (canonicalGenrePath !== cleanPath) cleanPath = canonicalGenrePath;
  }

  const firstSegment = cleanSegments[0] || '';
  const topLevelCountry =
    firstSegment &&
    firstSegment !== 'play' &&
    firstSegment !== 'artist' &&
    !['contact', 'privacy', 'gdpr', 'california', 'california-privacy', 'terms', 'cookies'].includes(firstSegment)
      ? COUNTRIES.find((country) => country.code.toLowerCase() === firstSegment) ||
        Object.values(publicConfig.pageConfigs).find((page) => page.slug.toLowerCase() === firstSegment)
      : null;

  if (topLevelCountry) {
    const countryCode = 'code' in topLevelCountry ? topLevelCountry.code : topLevelCountry.countryCode;
    cleanPath = getCountryCanonicalPath(countryCode, publicConfig);
  }

  return cleanPath === req.path ? null : `${cleanPath}${query}`;
}

function getUploadDir(): string {
  return path.resolve(process.env.ADMIN_UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads'));
}

function getUploadUrlPath(fileName: string): string {
  return `/uploads/${fileName}`;
}

async function saveUploadedBannerAsset(rawDataUrl: unknown): Promise<string> {
  const dataUrl = typeof rawDataUrl === 'string' ? rawDataUrl : '';
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error('Upload must be a PNG, JPG, WEBP, or GIF image');
  }

  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > 1_500_000) {
    throw new Error('Banner image must be under 1.5 MB');
  }

  const fileName = `banner-${Date.now()}-${randomBytes(8).toString('hex')}.${extension}`;
  await mkdir(getUploadDir(), { recursive: true });
  await writeFile(path.join(getUploadDir(), fileName), buffer, { mode: 0o600 });
  return getUploadUrlPath(fileName);
}

function getQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return getQueryValue(value[0]);
  }
  return typeof value === 'string' ? value : '';
}

function getBoundedQueryValue(value: unknown): string {
  return getQueryValue(value).trim();
}

function parsePort(rawPort: string | undefined): number {
  const parsed = Number.parseInt(rawPort || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function createRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return multiplayerRooms.has(code) ? createRoomCode() : code;
}

function sanitizeMultiplayerSettings(source: unknown): MultiplayerRoom['settings'] {
  if (!source || typeof source !== 'object') return undefined;
  const raw = source as Record<string, unknown>;
  return {
    challengeType: safeText(raw.challengeType, 24),
    challengeSlug: safeText(raw.challengeSlug, 120),
    challengeTitle: safeText(raw.challengeTitle, 120),
    turnsPerPlayer: Math.max(1, Math.min(25, Number(raw.turnsPerPlayer) || 1))
  };
}

function broadcastRoom(room: MultiplayerRoom, wss: WebSocketServer): void {
  const payload = JSON.stringify({ type: 'room-state', room });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && (client as WebSocket & { roomCode?: string }).roomCode === room.code) {
      client.send(payload);
    }
  });
}

function broadcastRoomEvent(room: MultiplayerRoom, wss: WebSocketServer, eventPayload: Record<string, unknown>): void {
  const payload = JSON.stringify({ type: 'room-event', payload: eventPayload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && (client as WebSocket & { roomCode?: string }).roomCode === room.code) {
      client.send(payload);
    }
  });
}

function attachMultiplayerServer(server: http.Server): void {
  const wss = new WebSocketServer({ server, path: '/ws/multiplayer' });

  wss.on('connection', (socket) => {
    const typedSocket = socket as WebSocket & { roomCode?: string; playerId?: string };

    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as Record<string, unknown>;
        const type = String(message.type || '');
        const roomCode = safeText(message.roomCode, 12).toUpperCase();
        const playerName = safeText(message.name, 40) || 'Player';
        const playerEmail = safeText(message.email, 254).toLowerCase();

        if (type === 'create-room') {
          const code = createRoomCode();
          const playerId = randomUUID();
          const room: MultiplayerRoom = {
            code,
            hostName: playerName,
            players: [{ id: playerId, name: playerName, email: playerEmail || undefined, score: 0, correct: 0, turnsPlayed: 0, connected: true }],
            createdAt: Date.now(),
            settings: sanitizeMultiplayerSettings(message.settings),
            activity: 'Room created',
            status: 'lobby'
          };
          multiplayerRooms.set(code, room);
          typedSocket.roomCode = code;
          typedSocket.playerId = playerId;
          socket.send(JSON.stringify({ type: 'room-created', room, playerId }));
          return;
        }

        if (type === 'join-room' && roomCode) {
          const room = multiplayerRooms.get(roomCode);
          if (!room) {
            socket.send(JSON.stringify({ type: 'error', error: 'Room not found' }));
            return;
          }
          if (room.players.length >= 10) {
            socket.send(JSON.stringify({ type: 'error', error: 'Room is full' }));
            return;
          }
          const playerId = randomUUID();
          room.players.push({ id: playerId, name: playerName, email: playerEmail || undefined, score: 0, correct: 0, turnsPlayed: 0, connected: true });
          room.activity = `${playerName} joined`;
          typedSocket.roomCode = room.code;
          typedSocket.playerId = playerId;
          socket.send(JSON.stringify({ type: 'room-joined', room, playerId }));
          broadcastRoom(room, wss);
          return;
        }

        if (type === 'score' && roomCode) {
          const room = multiplayerRooms.get(roomCode);
          if (!room) return;
          const player = room.players.find((item) => item.id === typedSocket.playerId);
          if (player) {
            player.score = Math.max(0, Math.min(100_000, Number(message.score) || 0));
            broadcastRoom(room, wss);
          }
        }

        if (type === 'room-event' && roomCode) {
          const room = multiplayerRooms.get(roomCode);
          if (!room) {
            socket.send(JSON.stringify({ type: 'error', error: 'Room not found' }));
            return;
          }
          if (!room.players.some((player) => player.id === typedSocket.playerId)) {
            socket.send(JSON.stringify({ type: 'error', error: 'Not joined to this room' }));
            return;
          }
          const payload = message.payload && typeof message.payload === 'object'
            ? (message.payload as Record<string, unknown>)
            : {};
          const payloadType = safeText(payload.type, 40);
          if (payloadType === 'start-game') room.status = 'playing';
          if (payloadType === 'finish') room.status = 'finished';
          if (payloadType === 'activity') room.activity = safeText(payload.message, 160);
          if (Array.isArray(payload.players)) {
            room.players = payload.players.slice(0, 10).map((player) => {
              const row = player && typeof player === 'object' ? player as Record<string, unknown> : {};
              return {
                id: safeText(row.id, 80) || randomUUID(),
                name: safeText(row.name, 40) || 'Player',
                email: safeText(row.email, 254) || undefined,
                score: Math.max(0, Math.min(100_000, Number(row.score) || 0)),
                correct: Math.max(0, Math.min(1000, Number(row.correct) || 0)),
                turnsPlayed: Math.max(0, Math.min(1000, Number(row.turnsPlayed) || 0)),
                connected: row.connected !== false
              };
            });
          }
          broadcastRoomEvent(room, wss, payload);
          broadcastRoom(room, wss);
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', error: 'Invalid multiplayer message' }));
      }
    });

    socket.on('close', () => {
      const room = typedSocket.roomCode ? multiplayerRooms.get(typedSocket.roomCode) : null;
      if (!room) return;
      const player = room.players.find((item) => item.id === typedSocket.playerId);
      if (player) player.connected = false;
      broadcastRoom(room, wss);
    });
  });
}

function parseLimit(value: unknown, fallback: number, max: number): number {
  const raw = getQueryValue(value);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, parsed));
}

function applySecurityHeaders(req: Request, res: ExpressResponse, next: NextFunction): void {
  const nonce = randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

  if (process.env.NODE_ENV === 'production') {
    const scriptSources = [
      "'self'",
      `'nonce-${nonce}'`,
      'https://www.googletagmanager.com',
      'https://pagead2.googlesyndication.com',
      'https://www.google.com',
      'https://www.gstatic.com',
      'https://www.recaptcha.net'
    ].join(' ');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        `script-src ${scriptSources}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: https:",
        "connect-src 'self' https:",
        "font-src 'self' data:",
        "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.instagram.com https://www.google.com https://www.recaptcha.net",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'"
      ].join('; ')
    );
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
}

function normalizeOrigin(originOrHost: string): string | null {
  const trimmed = originOrHost.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(hostHeader: string | undefined): Set<string> {
  const origins = new Set<string>();
  const configuredValues = [
    process.env.APP_URL,
    process.env.VITE_APP_URL,
    process.env.VITE_DOMAIN_NAME
  ];

  configuredValues.forEach((value) => {
    if (!value) return;
    const origin = normalizeOrigin(value);
    if (origin) origins.add(origin);
  });

  if (hostHeader) {
    const httpOrigin = normalizeOrigin(`http://${hostHeader}`);
    const httpsOrigin = normalizeOrigin(`https://${hostHeader}`);
    if (httpOrigin) origins.add(httpOrigin);
    if (httpsOrigin) origins.add(httpsOrigin);
  }

  if (process.env.NODE_ENV !== 'production') {
    ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'].forEach((origin) =>
      origins.add(origin)
    );
  }

  return origins;
}

function isAllowedCorsOrigin(origin: string | undefined, hostHeader: string | undefined): boolean {
  if (!origin) return true;

  try {
    const parsedOrigin = new URL(origin).origin;
    return getAllowedOrigins(hostHeader).has(parsedOrigin);
  } catch {
    return false;
  }
}

function appendVaryHeader(res: ExpressResponse, value: string): void {
  const current = res.getHeader('Vary');
  const values = new Set(
    (Array.isArray(current) ? current.join(',') : current?.toString() || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
  values.add(value);
  res.setHeader('Vary', Array.from(values).join(', '));
}

function setApiCorsHeaders(req: Request, res: ExpressResponse, allowedHeaders: string): void {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  if (origin && isAllowedCorsOrigin(origin, req.headers.host)) {
    res.setHeader('Access-Control-Allow-Origin', new URL(origin).origin);
    appendVaryHeader(res, 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
}

function enforceCorsOrigin(req: Request, res: ExpressResponse, next: NextFunction): void {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  if (!isAllowedCorsOrigin(origin, req.headers.host)) {
    res.status(403).json({ error: 'Origin is not allowed' });
    return;
  }
  setApiCorsHeaders(req, res, 'Content-Type, Accept, Range, X-CSRF-Token');
  next();
}

function createRateLimit(maxRequests: number, windowMs: number): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    existing.count += 1;

    if (buckets.size > 10_000) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    if (existing.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((existing.resetAt - now) / 1000).toString());
      res.status(429).json({ error: 'Too many API requests. Please try again shortly.' });
      return;
    }

    next();
  };
}

function validateAudioSourceUrl(rawUrl: string): UrlValidationResult {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl || trimmedUrl.length > MAX_URL_LENGTH) {
    return { ok: false, status: 400, error: 'Missing or invalid audio URL' };
  }

  if (/[\u0000-\u001F\u007F]/.test(trimmedUrl)) {
    return { ok: false, status: 400, error: 'Audio URL contains invalid characters' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    return { ok: false, status: 400, error: 'Audio URL is not valid' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, status: 403, error: 'Only HTTPS audio sources are allowed' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, status: 400, error: 'Audio URL credentials are not allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const ipHostname = hostname.replace(/^\[/, '').replace(/\]$/, '');
  if (net.isIP(ipHostname)) {
    return { ok: false, status: 403, error: 'IP literal audio URLs are not allowed' };
  }

  if (!ALLOWED_AUDIO_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return { ok: false, status: 403, error: 'Audio host is not allowed' };
  }

  parsed.hash = '';
  return { ok: true, url: parsed.toString() };
}

function getValidatedAudioUrl(rawUrl: unknown): string {
  const validation = validateAudioSourceUrl(typeof rawUrl === 'string' ? rawUrl : '');
  return validation.ok ? validation.url : '';
}

function getSafeRangeHeader(rangeHeader: string | undefined): string | null | undefined {
  if (!rangeHeader) return undefined;
  const normalized = rangeHeader.trim();
  if (/^bytes=(\d{1,12}-\d{0,12}|\d{0,12}-\d{1,12})$/.test(normalized)) {
    return normalized;
  }
  return null;
}

function parseContentLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isAllowedAudioContentType(contentType: string): boolean {
  const mime = contentType.split(';')[0].trim().toLowerCase();
  return mime.startsWith('audio/') || mime === 'application/octet-stream' || mime === 'binary/octet-stream';
}

async function fetchWithValidatedRedirects(
  sourceUrl: string,
  init: RequestInit,
  maxRedirects = 2
): Promise<Response> {
  let currentUrl = sourceUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await fetch(currentUrl, { ...init, redirect: 'manual' });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Upstream audio redirect missing location');
      }

      const nextUrl = new URL(location, currentUrl).toString();
      const validation = validateAudioSourceUrl(nextUrl);
      if (validation.ok === false) {
        throw new Error('Upstream audio redirect target rejected');
      }

      currentUrl = validation.url;
      continue;
    }

    return response;
  }

  throw new Error('Too many upstream audio redirects');
}

async function streamUpstreamBody(upstream: Response, res: ExpressResponse, controller: AbortController): Promise<void> {
  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  let bytesStreamed = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesStreamed += value.byteLength;

      if (bytesStreamed > MAX_AUDIO_BYTES) {
        controller.abort();
        break;
      }

      if (!res.write(value)) {
        await new Promise<void>((resolve) => {
          const finish = () => {
            res.off('close', finish);
            res.off('drain', finish);
            resolve();
          };
          res.once('close', finish);
          res.once('drain', finish);
        });
        if (res.writableEnded || res.destroyed) break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!res.writableEnded) {
    res.end();
  }
}

async function proxyAudioResponse(req: Request, res: ExpressResponse, rawUrl: string): Promise<void> {
  const validation = validateAudioSourceUrl(rawUrl);
  if (validation.ok === false) {
    res.status(validation.status).json({ error: validation.error });
    return;
  }

  const rangeHeader = getSafeRangeHeader(req.headers.range);
  if (rangeHeader === null) {
    res.status(416).json({ error: 'Invalid Range header' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  res.on('close', () => controller.abort());

  try {
    const headers: Record<string, string> = {
      'User-Agent': MUSIC_USER_AGENT,
      Accept: 'audio/*,*/*;q=0.8'
    };

    if (rangeHeader) {
      headers.Range = rangeHeader;
    }

    const upstream = await fetchWithValidatedRedirects(validation.url, {
      headers,
      signal: controller.signal
    });

    if (upstream.status !== 200 && upstream.status !== 206) {
      res.status(502).json({ error: 'Audio source returned an unexpected response' });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
    if (!isAllowedAudioContentType(contentType)) {
      res.status(415).json({ error: 'Audio source did not return audio content' });
      return;
    }

    const contentLength = parseContentLength(upstream.headers.get('content-length'));
    if (contentLength !== null && contentLength > MAX_AUDIO_BYTES) {
      res.status(413).json({ error: 'Audio source is too large' });
      return;
    }

    setApiCorsHeaders(req, res, 'Range, Content-Type, Accept');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);

    if (upstream.headers.get('content-range')) {
      res.setHeader('Content-Range', upstream.headers.get('content-range')!);
    }
    if (upstream.headers.get('content-length')) {
      res.setHeader('Content-Length', upstream.headers.get('content-length')!);
    }

    res.status(upstream.status === 206 ? 206 : 200);
    await streamUpstreamBody(upstream, res, controller);
  } catch (err) {
    console.error('Audio proxy error:', err);
    if (!res.headersSent) {
      res.status(controller.signal.aborted ? 504 : 502).json({ error: 'Failed to proxy audio stream' });
      return;
    }
    if (!res.writableEnded) {
      res.end();
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': MUSIC_USER_AGENT,
        Accept: 'application/json',
        ...headers
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Upstream API returned ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchArtistImageUrl(artistName: string): Promise<string> {
  if (isSpotifyConfigured()) {
    return await fetchSpotifyArtistImageUrl(artistName);
  }
  return '';
}

function handleCorsPreflight(allowedHeaders: string): RequestHandler {
  return (req, res) => {
    if (!isAllowedCorsOrigin(typeof req.headers.origin === 'string' ? req.headers.origin : undefined, req.headers.host)) {
      res.status(403).end();
      return;
    }
    setApiCorsHeaders(req, res, allowedHeaders);
    res.status(204).end();
  };
}

async function startServer() {
  const app = express();
  const PORT = parsePort(process.env.PORT);
  const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

  try {
    await ensureDatabaseSchema();
  } catch (error) {
    console.warn('Postgres schema initialization skipped:', error instanceof Error ? error.message : error);
  }

  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(applySecurityHeaders);
  app.use('/api/admin/uploads', express.json({ limit: '8mb' }));
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!stripe || !webhookSecret) {
      res.status(503).json({ error: 'Stripe webhook is not configured' });
      return;
    }

    try {
      const signature = req.headers['stripe-signature'];
      if (typeof signature !== 'string') {
        res.status(400).json({ error: 'Missing Stripe signature' });
        return;
      }
      const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = String(session.metadata?.userId || '');
        if (userId) {
          const accessUntil = await grantWeeklyEntitlement(userId, 'stripe', String(session.customer || ''));
          const billingCountry = safeText(session.customer_details?.address?.country, 8);
          const receiptUrl = safeText(session.payment_status === 'paid' ? session.url : '', MAX_URL_LENGTH);
          await queryDb(
            `INSERT INTO sg_payments (id, user_id, email, amount_cents, currency, status, stripe_session_id, stripe_payment_intent_id, receipt_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (stripe_session_id)
             DO UPDATE SET status = EXCLUDED.status, stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id, receipt_url = EXCLUDED.receipt_url, updated_at = now()`,
            [
              randomUUID(),
              userId,
              session.customer_details?.email || session.customer_email || '',
              session.amount_total || WEEKLY_UNLOCK_AMOUNT_CENTS,
              session.currency || 'usd',
              'paid',
              session.id,
              typeof session.payment_intent === 'string' ? session.payment_intent : '',
              receiptUrl
            ]
          );
          if (billingCountry) {
            await queryDb('UPDATE sg_users SET country_code = COALESCE(country_code, $2), updated_at = now() WHERE id = $1', [userId, billingCountry]);
          }
          console.log(`Granted weekly Song Guess access until ${accessUntil} for ${userId}`);
        }
      }
      res.json({ received: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid Stripe webhook' });
    }
  });
  app.use(express.json({ limit: '512kb' }));
  app.use('/uploads', (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'none'; script-src 'none'; object-src 'none'; frame-ancestors 'none'");
    next();
  });
  app.use('/uploads', express.static(getUploadDir(), {
    dotfiles: 'deny',
    index: false,
    immutable: true,
    maxAge: '30d'
  }));
  app.get('/favicon.ico', (_req, res) => {
    res.redirect(302, '/favicon.png');
  });
  const generalApiRateLimit = createRateLimit(API_RATE_LIMIT_MAX, API_RATE_LIMIT_WINDOW_MS);
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet');
    if (
      req.path.startsWith('/auth') ||
      req.path.startsWith('/payments') ||
      req.path.startsWith('/entitlements') ||
      req.path.startsWith('/admin/login') ||
      req.path.startsWith('/admin/session')
    ) {
      enforceCorsOrigin(req, res, next);
      return;
    }
    generalApiRateLimit(req, res, () => enforceCorsOrigin(req, res, next));
  });
  app.options('/api/audio-stream', handleCorsPreflight('Range, Content-Type, Accept'));
  app.options('/api/music/preview', handleCorsPreflight('Range, Accept'));
  app.options('/api/music/search', handleCorsPreflight('Content-Type, Accept'));
  app.options('/api/*', handleCorsPreflight('Content-Type, Accept, Range, X-CSRF-Token'));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'song-guess-game', time: new Date().toISOString() });
  });

  app.get('/api/spotify/callback', (req, res) => {
    const error = safeText(req.query.error, 160);
    const target = error
      ? `/play?spotify=error&message=${encodeURIComponent(error)}`
      : '/play?spotify=connected';
    res.redirect(302, target);
  });

  app.get('/api/public-config', async (req, res) => {
    try {
      const adminConfig = await getAdminConfig(req);
      res.json(buildPublicConfig(adminConfig, req, false));
    } catch (error) {
      console.error('Public config error:', error);
      res.status(500).json({ error: 'Failed to load public config' });
    }
  });

  app.post('/api/contact', createRateLimit(5, 10 * 60_000), async (req, res) => {
    const name = safeText(req.body?.name, 80);
    const email = safeText(req.body?.email, 254).toLowerCase();
    const message = safeMultilineText(req.body?.message, 3000);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
      res.status(400).json({ error: 'Name, valid email, and a message are required.' });
      return;
    }
    const recaptcha = await verifyRecaptcha(req, 'contact');
    if (recaptcha.ok === false) {
      res.status(403).json({ error: recaptcha.error });
      return;
    }
    try {
      const emailSent = await sendContactEmail(name, email, message);
      if (!emailSent) {
        res.status(503).json({ error: 'Contact email is not configured yet.' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : 'Could not send contact request.' });
    }
  });

  app.get('/robots.txt', async (req, res) => {
    try {
      const adminConfig = await getAdminConfig(req);
      const publicConfig = buildPublicConfig(adminConfig, req, false);
      const robots = ensureRobotsSecurityExclusions(safeMultilineText(adminConfig.robotsTxt, 8000) || createDefaultRobotsTxt(publicConfig.appUrl));
      res.type('text/plain').send(`${robots.trim()}\n`);
    } catch (error) {
      console.error('Robots error:', error);
      res.type('text/plain').send(`${ensureRobotsSecurityExclusions(createDefaultRobotsTxt(getEnvPublicAppUrl(req))).trim()}\n`);
    }
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const adminConfig = await getAdminConfig(req);
      const publicConfig = buildPublicConfig(adminConfig, req, false);
      const requestedArtists = await getRequestedArtists();
      res.type('application/xml').send(buildSitemapXml(publicConfig, requestedArtists));
    } catch (error) {
      console.error('Sitemap error:', error);
      res.status(500).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset />');
    }
  });

  app.get('/api/artist-requests', async (_req, res) => {
    res.json({ artists: await getRequestedArtists() });
  });

  app.get('/api/spotify/artists', createRateLimit(240, 5 * 60_000), async (req, res) => {
    try {
      const query = safeText(req.query.q, 100);
      res.json({ artists: await searchSpotifyArtistSuggestions(query) });
    } catch (error) {
      res.status(isSpotifyConfigured() ? 502 : 503).json({
        error: error instanceof Error ? error.message : 'Could not search Spotify artists'
      });
    }
  });

  app.post('/api/artist-requests', createRateLimit(120, 5 * 60_000), async (req, res) => {
    const name = safeText(req.body?.artistName, 100);
    const spotifyArtistId = safeText(req.body?.spotifyArtistId, 80);
    const slug = slugifyChallenge(name);
    if ((!slug || name.length < 2) && !spotifyArtistId) {
      res.status(400).json({ error: 'Artist name is required' });
      return;
    }
    const recaptcha = await verifyRecaptcha(req, 'artist_request');
    if (recaptcha.ok === false) {
      res.status(403).json({ error: recaptcha.error });
      return;
    }

    const existingCatalogArtist = getArtistChallenge(slug);
    const artists = await getRequestedArtists();
    const existing = artists.find((artist) =>
      spotifyArtistId ? artist.spotifyArtistId === spotifyArtistId : artist.slug === slug
    );
    if (existing) {
      if (existing.songs && existing.songs.length > 0) {
        res.json({ artist: existing });
        return;
      }
      try {
        const rebuilt = await buildRequestedArtistPackFromSpotify(name, spotifyArtistId);
        await saveRequestedArtists([
          rebuilt,
          ...artists.filter((artist) => spotifyArtistId ? artist.spotifyArtistId !== spotifyArtistId : artist.slug !== slug)
        ]);
        res.json({ artist: rebuilt });
        return;
      } catch (error) {
        sendSpotifyError(res, error, 'Could not rebuild artist pack from Spotify');
        return;
      }
    }

    try {
      const artist = await buildRequestedArtistPackFromSpotify(name, spotifyArtistId);
      await saveRequestedArtists([artist, ...artists]);
      res.json({ artist });
    } catch (error) {
      if (existingCatalogArtist && !spotifyArtistId) {
        res.json({
          artist: {
            slug: existingCatalogArtist.slug,
            name: existingCatalogArtist.name,
            songIds: existingCatalogArtist.songIds,
            songsCount: existingCatalogArtist.songsCount,
            coverImage: existingCatalogArtist.coverImage,
            status: 'ready',
            createdAt: new Date().toISOString()
          }
        });
        return;
      }
      sendSpotifyError(res, error, 'Could not build artist pack from Spotify');
    }
  });

  app.post('/api/admin/artist-packs/:slug/refresh', requireAdmin, requireAdminCsrf, async (req, res) => {
    const slug = slugifyChallenge(req.params.slug);
    const requestedName = safeText(req.body?.artistName, 100);
    const requestedSpotifyArtistId = safeText(req.body?.spotifyArtistId, 80);
    if (!slug && !requestedName && !requestedSpotifyArtistId) {
      res.status(400).json({ error: 'Artist name or slug is required' });
      return;
    }

    const artists = await getRequestedArtists();
    const existingRequested = artists.find((artist) =>
      (requestedSpotifyArtistId && artist.spotifyArtistId === requestedSpotifyArtistId) ||
      artist.slug === slug ||
      slugifyChallenge(artist.name) === slug
    );
    const catalogArtist = getArtistChallenge(slug);
    const artistName = requestedName || existingRequested?.name || catalogArtist?.name || slug.replace(/-/g, ' ');
    const spotifyArtistId = requestedSpotifyArtistId || existingRequested?.spotifyArtistId || '';

    try {
      const refreshed = await buildRequestedArtistPackFromSpotify(artistName, spotifyArtistId);
      refreshed.createdAt = existingRequested?.createdAt || new Date().toISOString();
      refreshed.updatedAt = new Date().toISOString();
      refreshed.nextRefreshAt = getNextArtistPackRefreshAt();
      refreshed.lastRefreshType = 'manual';
      const nextArtists = [
        refreshed,
        ...artists.filter((artist) =>
          artist.slug !== refreshed.slug &&
          artist.slug !== existingRequested?.slug &&
          (!refreshed.spotifyArtistId || artist.spotifyArtistId !== refreshed.spotifyArtistId)
        )
      ];
      await saveRequestedArtists(nextArtists);
      res.json({ artist: refreshed, artists: nextArtists });
    } catch (error) {
      sendSpotifyError(res, error, 'Could not refresh artist pack from Spotify');
    }
  });

  app.post('/api/activity', async (req, res) => {
    try {
      const entry = sanitizeActivityLog(req.body, req);
      const logs = await getActivityLogs();
      await saveActivityLogs([entry, ...logs]);
      res.json({ ok: true });
    } catch (error) {
      console.error('Activity log error:', error);
      res.status(500).json({ error: 'Failed to record activity' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      res.json(await buildAuthSessionResponse(req));
    } catch (error) {
      res.status(503).json({
        authenticated: false,
        entitlement: { active: false },
        databaseConfigured: isDatabaseConfigured(),
        stripeConfigured: isStripeConfigured(),
        error: 'User database is not available'
      });
    }
  });

  app.post('/api/auth/register', createRateLimit(10, 5 * 60_000), async (req, res) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({ error: 'Postgres DATABASE_URL is required for user accounts' });
      return;
    }

    try {
      const recaptcha = await verifyRecaptcha(req, 'register');
      if (recaptcha.ok === false) {
        res.status(403).json({ error: recaptcha.error });
        return;
      }
      const email = safeText(req.body?.email, 254).toLowerCase();
      const name = safeText(req.body?.name, 80) || email.split('@')[0] || 'Player';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'A valid email address is required' });
        return;
      }
      if (password.length < 8 || password.length > 200) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const rawVerifyToken = randomBytes(32).toString('base64url');
      const verifyHash = hashToken(rawVerifyToken);
      const userId = randomUUID();
      await queryDb(
        `INSERT INTO sg_users (id, email, password_hash, name, email_verification_token_hash, email_verification_expires_at)
         VALUES ($1, $2, $3, $4, $5, now() + interval '24 hours')`,
        [userId, email, passwordHash, name, verifyHash]
      );
      const appUrl = getEffectiveAppUrl(req);
      const verificationUrl = `${appUrl}/api/auth/verify?token=${encodeURIComponent(rawVerifyToken)}`;
      const emailSent = await sendVerificationEmail(email, name, verificationUrl, 'new-account').catch((error) => {
        console.warn('Verification email send failed:', error instanceof Error ? error.message : error);
        return false;
      });
      res.json({
        registered: true,
        email,
        verificationUrl,
        emailSent
      });
    } catch (error) {
      const message = String((error as { code?: string }).code) === '23505'
        ? 'That email is already registered'
        : 'Could not create account';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/auth/login', createRateLimit(20, 5 * 60_000), async (req, res) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({ error: 'Postgres DATABASE_URL is required for user accounts' });
      return;
    }

    try {
      const recaptcha = await verifyRecaptcha(req, 'login');
      if (recaptcha.ok === false) {
        res.status(403).json({ error: recaptcha.error });
        return;
      }
      const email = safeText(req.body?.email, 254).toLowerCase();
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const rows = await queryDb<Record<string, unknown>>(
        'SELECT id, email, password_hash, name, country_code, email_verified FROM sg_users WHERE email = $1 LIMIT 1',
        [email]
      );
      const row = rows[0];
      const ok = row ? await bcrypt.compare(password, String(row.password_hash || '')) : false;
      if (!ok) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      if (!row.email_verified) {
        res.status(403).json({ error: 'Please verify your email before signing in. Check your inbox for the verification link.' });
        return;
      }
      await createUserSession(req, res, String(row.id));
      res.json(await buildAuthSessionResponseForUser({
        id: String(row.id),
        email: String(row.email),
        name: String(row.name || ''),
        countryCode: String(row.country_code || '') || undefined,
        emailVerified: Boolean(row.email_verified)
      }));
    } catch {
      res.status(503).json({ error: 'Login is not available right now' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const cookie = parseCookies(req)[USER_SESSION_COOKIE_NAME];
      const [token] = cookie?.split('.') || [];
      if (token && isDatabaseConfigured()) {
        await queryDb('DELETE FROM sg_user_sessions WHERE token_hash = $1', [hashToken(token)]);
      }
    } catch {}
    clearUserCookie(res);
    res.json({ ok: true });
  });

  app.patch('/api/auth/profile', requireUser, async (req, res) => {
    const user = res.locals.user as UserSession;
    const name = safeText(req.body?.name, 80) || user.name || user.email.split('@')[0] || 'Player';
    const countryCode = safeText(req.body?.countryCode, 8).toUpperCase();
    const normalizedCountry = countryCode === 'NONE' ? '' : countryCode;

    try {
      const rows = await queryDb<Record<string, unknown>>(
        `UPDATE sg_users
         SET name = $2, country_code = NULLIF($3, ''), updated_at = now()
         WHERE id = $1
         RETURNING id, email, name, country_code, email_verified`,
        [user.id, name, normalizedCountry]
      );
      const row = rows[0];
      res.json(await buildAuthSessionResponseForUser({
        id: String(row.id),
        email: String(row.email),
        name: String(row.name || ''),
        countryCode: String(row.country_code || '') || undefined,
        emailVerified: Boolean(row.email_verified)
      }));
    } catch {
      res.status(503).json({ error: 'Could not update account settings' });
    }
  });

  app.post('/api/auth/change-email', createRateLimit(10, 10 * 60_000), requireUser, async (req, res) => {
    const user = res.locals.user as UserSession;
    const nextEmail = safeText(req.body?.email, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      res.status(400).json({ error: 'A valid email address is required' });
      return;
    }
    const recaptcha = await verifyRecaptcha(req, 'change_email');
    if (recaptcha.ok === false) {
      res.status(403).json({ error: recaptcha.error });
      return;
    }
    const rawVerifyToken = randomBytes(32).toString('base64url');
    try {
      await queryDb(
        `UPDATE sg_users
         SET pending_email = $2,
             pending_email_verification_token_hash = $3,
             pending_email_verification_expires_at = now() + interval '24 hours',
             updated_at = now()
         WHERE id = $1`,
        [user.id, nextEmail, hashToken(rawVerifyToken)]
      );
      const appUrl = getEffectiveAppUrl(req);
      const verificationUrl = `${appUrl}/api/auth/verify-email-change?token=${encodeURIComponent(rawVerifyToken)}`;
      const emailSent = await sendVerificationEmail(nextEmail, user.name, verificationUrl, 'email-change').catch((error) => {
        console.warn('Email-change verification send failed:', error instanceof Error ? error.message : error);
        return false;
      });
      res.json({
        ok: true,
        verificationUrl,
        emailSent
      });
    } catch (error) {
      const message = String((error as { code?: string }).code) === '23505'
        ? 'That email is already registered'
        : 'Could not start email verification';
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/auth/verify', async (req, res) => {
    const token = getBoundedQueryValue(req.query.token);
    if (!token || !isDatabaseConfigured()) {
      res.status(400).type('html').send(createAuthRedirectPage('Verification failed', 'Verification link is invalid or the database is not configured.', '/play?auth=login'));
      return;
    }
    const rows = await queryDb<Record<string, unknown>>(
      `UPDATE sg_users
       SET email_verified = true, email_verification_token_hash = null, email_verification_expires_at = null, updated_at = now()
       WHERE email_verification_token_hash = $1 AND email_verification_expires_at > now()
       RETURNING email`,
      [hashToken(token)]
    );
    if (rows[0]) {
      res.type('html').send(createAuthRedirectPage('Email verified', 'Redirecting you back to Song Guess Game...', '/play?auth=verified'));
    } else {
      res.status(400).type('html').send(createAuthRedirectPage('Verification failed', 'Verification link expired or invalid.', '/play?auth=login'));
    }
  });

  app.get('/api/auth/verify-email-change', async (req, res) => {
    const token = getBoundedQueryValue(req.query.token);
    if (!token || !isDatabaseConfigured()) {
      res.status(400).type('html').send(createAuthRedirectPage('Verification failed', 'Email change link is invalid or the database is not configured.', '/play?auth=login'));
      return;
    }
    try {
      const rows = await queryDb<Record<string, unknown>>(
        `UPDATE sg_users
         SET email = pending_email,
             email_verified = true,
             pending_email = null,
             pending_email_verification_token_hash = null,
             pending_email_verification_expires_at = null,
             updated_at = now()
         WHERE pending_email_verification_token_hash = $1
           AND pending_email_verification_expires_at > now()
           AND pending_email IS NOT NULL
         RETURNING email`,
        [hashToken(token)]
      );
      if (rows[0]) {
        res.type('html').send(createAuthRedirectPage('Email updated', 'Redirecting you back to Song Guess Game...', '/play?auth=verified'));
      } else {
        res.status(400).type('html').send(createAuthRedirectPage('Verification failed', 'Email change link expired or invalid.', '/play?auth=login'));
      }
    } catch {
      res.status(400).type('html').send(createAuthRedirectPage('Verification failed', 'That email is already registered.', '/play?auth=login'));
    }
  });

  app.get('/api/auth/google/start', createRateLimit(20, 5 * 60_000), (req, res) => {
    if (!isDatabaseConfigured()) {
      res.status(503).type('html').send('Postgres DATABASE_URL is required for Google login.');
      return;
    }
    const googleConfig = getGoogleOAuthConfig(req);
    if (!googleConfig) {
      res.status(503).type('html').send('Google login is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
      return;
    }

    const state = randomBytes(24).toString('base64url');
    res.setHeader(
      'Set-Cookie',
      `${GOOGLE_OAUTH_STATE_COOKIE_NAME}=${encodeURIComponent(state)}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600${
        isSecureRequest(req) ? '; Secure' : ''
      }`
    );

    const params = new URLSearchParams({
      client_id: googleConfig.clientId,
      redirect_uri: googleConfig.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account'
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    if (!isDatabaseConfigured()) {
      res.status(503).type('html').send('Postgres DATABASE_URL is required for Google login.');
      return;
    }
    const googleConfig = getGoogleOAuthConfig(req);
    const code = getBoundedQueryValue(req.query.code);
    const state = getBoundedQueryValue(req.query.state);
    const cookieState = parseCookies(req)[GOOGLE_OAUTH_STATE_COOKIE_NAME];
    if (!googleConfig || !code || !state || !cookieState || state !== cookieState) {
      res.status(400).type('html').send('Google login could not be verified.');
      return;
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: googleConfig.clientId,
          client_secret: googleConfig.clientSecret,
          redirect_uri: googleConfig.redirectUri,
          grant_type: 'authorization_code'
        })
      });
      if (!tokenResponse.ok) throw new Error(`Google token exchange failed: ${tokenResponse.status}`);
      const tokenBody = await tokenResponse.json() as { access_token?: string };
      if (!tokenBody.access_token) throw new Error('Google did not return an access token');

      const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenBody.access_token}` }
      });
      if (!profileResponse.ok) throw new Error(`Google profile lookup failed: ${profileResponse.status}`);
      const profile = await profileResponse.json() as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
      };
      const googleSub = safeText(profile.sub, 120);
      const email = safeText(profile.email, 254).toLowerCase();
      if (!googleSub || !email) throw new Error('Google profile is missing email or subject');

      const rows = await queryDb<{ id: string }>(
        `INSERT INTO sg_users (id, email, password_hash, name, email_verified, google_sub, updated_at, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, now(), now())
         ON CONFLICT (email) DO UPDATE
         SET google_sub = COALESCE(sg_users.google_sub, EXCLUDED.google_sub),
             email_verified = sg_users.email_verified OR EXCLUDED.email_verified,
             name = CASE WHEN sg_users.name = '' THEN EXCLUDED.name ELSE sg_users.name END,
             updated_at = now(),
             last_seen_at = now()
         RETURNING id`,
        [
          randomUUID(),
          email,
          await bcrypt.hash(randomBytes(32).toString('base64url'), 12),
          safeText(profile.name, 80) || email.split('@')[0] || 'Player',
          Boolean(profile.email_verified),
          googleSub
        ]
      );

      await createUserSession(req, res, rows[0].id);
      appendSetCookie(
        res,
        `${GOOGLE_OAUTH_STATE_COOKIE_NAME}=; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=0${
          isSecureRequest(req) ? '; Secure' : ''
        }`
      );
      res.redirect('/play?login=google');
    } catch (error) {
      res.status(500).type('html').send(error instanceof Error ? error.message : 'Google login failed');
    }
  });

  app.post('/api/entitlements/status', async (req, res) => {
    try {
      const user = await getUserSession(req);
      res.json(await getDailyAccessState(req, res, user));
    } catch {
      res.status(503).json({ allowed: false, unlimited: false, freePlayUsed: true, reason: 'Access service unavailable' });
    }
  });

  app.post('/api/entitlements/claim-free-play', async (req, res) => {
    try {
      const user = await getUserSession(req);
      const state = await getDailyAccessState(req, res, user);
      if (state.unlimited || !isDatabaseConfigured()) {
        res.json(state);
        return;
      }
      if (!state.allowed) {
        res.status(402).json(state);
        return;
      }
      const scopeType = safeText(req.body?.scopeType, 24) || 'global';
      const scopeSlug = safeText(req.body?.scopeSlug, 100) || 'play';
      const anonHash = user ? '' : hashToken(getOrSetAnonId(req, res));
      const existingRows = user
        ? await queryDb<Record<string, unknown>>(
            'SELECT count(*)::int AS play_count FROM sg_daily_plays WHERE user_id = $1 AND play_date = $2',
            [user.id, todayUtcDate()]
          )
        : [];
      const existingCount = user ? Number(existingRows[0]?.play_count || 0) : 0;
      const dailyKey = user
        ? `${todayUtcDate()}:${user.id}:${existingCount + 1}`
        : `${todayUtcDate()}:${anonHash}`;
      await queryDb(
        `INSERT INTO sg_daily_plays (daily_key, user_id, anon_hash, play_date, scope_type, scope_slug)
         VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6)
         ON CONFLICT (daily_key) DO NOTHING`,
        [dailyKey, user?.id || null, anonHash, todayUtcDate(), scopeType, scopeSlug]
      );
      if (user && existingCount >= 1) {
        await queryDb('UPDATE sg_users SET signup_bonus_claimed = true, updated_at = now() WHERE id = $1', [user.id]);
      }
      res.json({ allowed: true, unlimited: false, freePlayUsed: true });
    } catch {
      res.status(503).json({ allowed: false, unlimited: false, freePlayUsed: true, reason: 'Could not claim daily free play' });
    }
  });

  app.post('/api/payments/create-checkout', requireUser, async (req, res) => {
    const stripe = getStripeClient();
    if (!stripe) {
      res.status(503).json({ error: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY first.' });
      return;
    }

    try {
      const user = res.locals.user as UserSession;
      if (!user.emailVerified) {
        res.status(403).json({ error: 'Please verify your email before unlocking unlimited play.' });
        return;
      }
      const appUrl = getEffectiveAppUrl(req);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: WEEKLY_UNLOCK_AMOUNT_CENTS,
              product_data: {
                name: 'Song Guess Unlimited - 7 Day Pass',
                description: 'Unlimited Song Guess games for one week. Ads hidden while access is active.'
              }
            }
          }
        ],
        success_url: `${appUrl}/play?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/play?checkout=cancelled`,
        metadata: { userId: user.id }
      });
      res.json({ url: session.url });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Could not create Stripe Checkout session' });
    }
  });

  app.get('/api/auth/payments', requireUser, async (_req, res) => {
    const user = res.locals.user as UserSession;
    try {
      const payments = await queryDb<PaymentRecord>(
        `SELECT id, user_id AS "userId", email, amount_cents AS "amountCents", currency, status,
                stripe_session_id AS "stripeSessionId", stripe_payment_intent_id AS "stripePaymentIntentId",
                refunded_at AS "refundedAt", receipt_url AS "receiptUrl", created_at AS "createdAt"
         FROM sg_payments
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [user.id]
      );
      res.json({ payments });
    } catch {
      res.status(503).json({ error: 'Could not load payment history' });
    }
  });

  app.get('/api/auth/payments/:id/receipt', requireUser, async (req, res) => {
    const user = res.locals.user as UserSession;
    const paymentId = safeText(req.params.id, 80);
    try {
      const rows = await queryDb<PaymentRecord>(
        `SELECT id, email, amount_cents AS "amountCents", currency, status, created_at AS "createdAt"
         FROM sg_payments
         WHERE id = $1 AND user_id = $2
         LIMIT 1`,
        [paymentId, user.id]
      );
      const payment = rows[0];
      if (!payment) {
        res.status(404).type('text/plain').send('Receipt not found');
        return;
      }
      const amount = `$${(payment.amountCents / 100).toFixed(2)} ${payment.currency.toUpperCase()}`;
      res
        .setHeader('Content-Disposition', `attachment; filename="song-guess-receipt-${payment.id}.txt"`)
        .type('text/plain')
        .send([
          'Song Guess Receipt',
          `Receipt ID: ${payment.id}`,
          `Email: ${payment.email}`,
          `Amount: ${amount}`,
          `Status: ${payment.status}`,
          `Created: ${new Date(payment.createdAt).toISOString()}`,
          'Product: Song Guess Unlimited - 7 Day Pass'
        ].join('\n'));
    } catch {
      res.status(503).type('text/plain').send('Could not generate receipt');
    }
  });

  app.get('/api/admin/session', (req, res) => {
    cleanupExpiredAdminSessions();
    const configured = isAdminAuthConfigured();
    const authSession = configured ? getAdminSession(req) : null;

    res.json({
      authenticated: Boolean(authSession),
      configured,
      csrfToken: authSession?.session.csrfToken,
      username: authSession?.session.username,
      accessPathConfigured: Boolean(getAdminAccessPath())
    });
  });

  app.post('/api/admin/login', createRateLimit(ADMIN_LOGIN_RATE_LIMIT_MAX, 5 * 60_000), (req, res) => {
    if (!isAdminAuthConfigured()) {
      res.status(503).json({ error: 'Admin credentials are not configured on the server' });
      return;
    }

    const username = safeText(req.body?.username, 160);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const expectedUsername = process.env.ADMIN_USERNAME?.trim() || '';
    const expectedPassword = process.env.ADMIN_PASSWORD?.trim() || '';

    if (!timingSafeStringEqual(username, expectedUsername) || !timingSafeStringEqual(password, expectedPassword)) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    const session = createAdminSession(req, res, expectedUsername);
    res.json({
      authenticated: true,
      configured: true,
      csrfToken: session.csrfToken,
      username: session.username,
      accessPathConfigured: Boolean(getAdminAccessPath())
    });
  });

  app.post('/api/admin/logout', requireAdmin, requireAdminCsrf, (req, res) => {
    const token = res.locals.adminToken as string | undefined;
    if (token) adminSessions.delete(token);
    clearAdminCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/admin/config', requireAdmin, async (req, res) => {
    try {
      res.json(await getAdminConfig(req));
    } catch (error) {
      console.error('Admin config load error:', error);
      res.status(500).json({ error: 'Failed to load admin config' });
    }
  });

  app.put('/api/admin/config', requireAdmin, requireAdminCsrf, async (req, res) => {
    try {
      res.json(await saveAdminConfig(req.body, req));
    } catch (error) {
      console.error('Admin config save error:', error);
      res.status(500).json({ error: 'Failed to save admin config' });
    }
  });

  app.get('/api/admin/activity', requireAdmin, async (_req, res) => {
    try {
      res.json({ activity: await getActivityLogs() });
    } catch (error) {
      console.error('Admin activity load error:', error);
      res.status(500).json({ error: 'Failed to load activity logs' });
    }
  });

  app.delete('/api/admin/activity', requireAdmin, requireAdminCsrf, async (_req, res) => {
    try {
      await saveActivityLogs([]);
      res.json({ ok: true });
    } catch (error) {
      console.error('Admin activity clear error:', error);
      res.status(500).json({ error: 'Failed to clear activity logs' });
    }
  });

  app.get('/api/admin/users', requireAdmin, async (_req, res) => {
    if (!isDatabaseConfigured()) {
      res.json({ users: [], databaseConfigured: false });
      return;
    }
    try {
      const users = await queryDb<AdminUserRecord>(
        `SELECT u.id, u.email, u.name, u.email_verified AS "emailVerified",
                e.access_until AS "accessUntil", u.created_at AS "createdAt", u.last_seen_at AS "lastSeenAt"
         FROM sg_users u
         LEFT JOIN sg_entitlements e ON e.user_id = u.id
         ORDER BY u.created_at DESC
         LIMIT 500`
      );
      res.json({ users, databaseConfigured: true });
    } catch {
      res.status(503).json({ error: 'Could not load users' });
    }
  });

  app.get('/api/admin/payments', requireAdmin, async (_req, res) => {
    if (!isDatabaseConfigured()) {
      res.json({ payments: [], databaseConfigured: false, stripeConfigured: isStripeConfigured() });
      return;
    }
    try {
      const payments = await queryDb<PaymentRecord>(
        `SELECT id, user_id AS "userId", email, amount_cents AS "amountCents", currency, status,
                stripe_session_id AS "stripeSessionId", stripe_payment_intent_id AS "stripePaymentIntentId",
                refunded_at AS "refundedAt", created_at AS "createdAt"
         FROM sg_payments
         ORDER BY created_at DESC
         LIMIT 500`
      );
      res.json({ payments, databaseConfigured: true, stripeConfigured: isStripeConfigured() });
    } catch {
      res.status(503).json({ error: 'Could not load payments' });
    }
  });

  app.post('/api/admin/payments/:id/refund', requireAdmin, requireAdminCsrf, async (req, res) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({ error: 'Postgres DATABASE_URL is required for refunds' });
      return;
    }
    const stripe = getStripeClient();
    if (!stripe) {
      res.status(503).json({ error: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY first.' });
      return;
    }

    try {
      const paymentId = safeText(req.params.id, 80);
      const rows = await queryDb<Record<string, unknown>>(
        'SELECT stripe_payment_intent_id FROM sg_payments WHERE id = $1 LIMIT 1',
        [paymentId]
      );
      const paymentIntent = String(rows[0]?.stripe_payment_intent_id || '');
      if (!paymentIntent) {
        res.status(404).json({ error: 'Payment intent not found' });
        return;
      }
      const refund = await stripe.refunds.create({ payment_intent: paymentIntent });
      await queryDb(
        `UPDATE sg_payments SET status = $2, refunded_at = now(), updated_at = now() WHERE id = $1`,
        [paymentId, refund.status || 'refunded']
      );
      res.json({ ok: true, refundId: refund.id, status: refund.status });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Refund failed' });
    }
  });

  app.post('/api/admin/uploads/banner', requireAdmin, requireAdminCsrf, async (req, res) => {
    try {
      const url = await saveUploadedBannerAsset(req.body?.dataUrl);
      res.json({ url });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Upload failed' });
    }
  });

  // API Route: Audio Streaming Proxy with Byte Range support & CORS
  app.get('/api/audio-stream', async (req, res) => {
    const audioUrl = getBoundedQueryValue(req.query.url);
    if (!audioUrl) {
      return res.status(400).json({ error: 'Missing or invalid audio URL' });
    }
    await proxyAudioResponse(req, res, audioUrl);
  });

  // API Route: Fresh dynamic Moroccan track audio preview resolver
  const previewUrlCache = new Map<string, string>();

  app.get('/api/music/preview', async (req, res) => {
    const title = getBoundedQueryValue(req.query.title);
    const artist = getBoundedQueryValue(req.query.artist);
    const directUrl = getBoundedQueryValue(req.query.url);

    if (title.length > MAX_TEXT_QUERY_LENGTH || artist.length > MAX_TEXT_QUERY_LENGTH || directUrl.length > MAX_URL_LENGTH) {
      return res.status(400).json({ error: 'Request parameters are too long' });
    }

    if (!title && !artist && !directUrl) {
      return res.status(400).json({ error: 'Song title or artist required' });
    }

    try {
      let previewUrl = '';
      if (directUrl) {
        const directValidation = validateAudioSourceUrl(directUrl);
        if (directValidation.ok === false) {
          return res.status(directValidation.status).json({ error: directValidation.error });
        }
        previewUrl = directValidation.url;
      }

      const cacheKey = `${title.toLowerCase()}---${artist.toLowerCase()}`;

      if (!previewUrl && previewUrlCache.has(cacheKey)) {
        previewUrl = previewUrlCache.get(cacheKey)!;
      }

      if (!previewUrl) {
        const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/feat\..*/i, '').trim();
        const cleanArtist = artist.replace(/\([^)]*\)/g, '').replace(/feat\..*/i, '').trim();
        const lowerArtist = cleanArtist.toLowerCase();
        const lowerTitle = cleanTitle.toLowerCase();

        // 1. Deezer strict artist + track query
        try {
          const strictQuery = `artist:"${cleanArtist}" track:"${cleanTitle}"`;
          const searchUrl = new URL('https://api.deezer.com/search');
          searchUrl.searchParams.set('q', strictQuery);
          searchUrl.searchParams.set('limit', '5');
          const data = await fetchJson<{ data?: Array<{ preview?: string }> }>(searchUrl.toString());
          const match = data.data?.find((d: any) => d.preview && d.preview.length > 0);
          if (match?.preview) {
            previewUrl = getValidatedAudioUrl(match.preview);
          }
        } catch (_) {}

        // 2. iTunes Search with artist & title verification
        if (!previewUrl) {
          try {
            const itunesTerm = `${cleanArtist} ${cleanTitle}`.trim();
            const itunesUrl = new URL('https://itunes.apple.com/search');
            itunesUrl.searchParams.set('term', itunesTerm);
            itunesUrl.searchParams.set('entity', 'song');
            itunesUrl.searchParams.set('limit', '6');
            const itunesData = await fetchJson<{ results?: Array<any> }>(itunesUrl.toString());
            if (itunesData.results && Array.isArray(itunesData.results)) {
              const match = itunesData.results.find((r: any) => {
                if (!r.previewUrl) return false;
                const rArtist = (r.artistName || '').toLowerCase();
                const rTitle = (r.trackName || '').toLowerCase();
                const artistMatches = rArtist.includes(lowerArtist) || lowerArtist.includes(rArtist);
                const titleMatches = rTitle.includes(lowerTitle) || lowerTitle.includes(rTitle);
                return artistMatches || titleMatches;
              });
              if (match?.previewUrl) {
                previewUrl = getValidatedAudioUrl(match.previewUrl);
              }
            }
          } catch (_) {}
        }

        // 3. Deezer loose query with verification
        if (!previewUrl) {
          const queries = [
            `${cleanArtist} ${cleanTitle}`.trim(),
            `${cleanTitle} ${cleanArtist}`.trim()
          ];
          for (const q of queries) {
            try {
              const searchUrl = new URL('https://api.deezer.com/search');
              searchUrl.searchParams.set('q', q);
              searchUrl.searchParams.set('limit', '5');
              const data = await fetchJson<{ data?: Array<any> }>(searchUrl.toString());
              const match = data.data?.find((d: any) => {
                if (!d.preview) return false;
                const dArtist = (d.artist?.name || '').toLowerCase();
                const dTitle = (d.title || '').toLowerCase();
                const artistMatches = dArtist.includes(lowerArtist) || lowerArtist.includes(dArtist);
                const titleMatches = dTitle.includes(lowerTitle) || lowerTitle.includes(dTitle);
                return artistMatches || titleMatches;
              });
              if (match?.preview) {
                const validatedPreviewUrl = getValidatedAudioUrl(match.preview);
                if (validatedPreviewUrl) {
                  previewUrl = validatedPreviewUrl;
                  break;
                }
              }
            } catch (_) {}
          }
        }

        if (previewUrl && cacheKey !== '---') {
          previewUrlCache.set(cacheKey, previewUrl);
        }
      }

      if (!previewUrl) {
        return res.status(404).json({ error: 'No audio preview available for track' });
      }

      // Proxy audio with Range header support for instant playback & scrubbing
      await proxyAudioResponse(req, res, previewUrl);
    } catch (err) {
      console.error('Dynamic preview stream error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Preview fetch failed' });
    }
  });

  app.get('/api/music/artist-image', async (req, res) => {
    const name = getBoundedQueryValue(req.query.name);
    if (!name || name.length > MAX_TEXT_QUERY_LENGTH) {
      res.status(400).json({ error: 'Artist name is required' });
      return;
    }
    try {
      const imageUrl = await fetchArtistImageUrl(name);
      res.redirect(302, imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80');
    } catch {
      res.redirect(302, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80');
    }
  });

  // API Route: Universal Music Search Proxy (Moroccan & Global Catalog)
  app.get('/api/music/search', async (req, res) => {
    const query = getBoundedQueryValue(req.query.q) || getBoundedQueryValue(req.query.term);
    const limit = parseLimit(req.query.limit, 15, 25);

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (query.length > MAX_TEXT_QUERY_LENGTH) {
      return res.status(400).json({ error: 'Search query is too long' });
    }

    try {
      const url = new URL('https://api.deezer.com/search');
      url.searchParams.set('q', query);
      url.searchParams.set('limit', limit.toString());
      const data = await fetchJson(url.toString());
      setApiCorsHeaders(req, res, 'Content-Type, Accept');
      res.json(data);
    } catch (err) {
      console.error('Music search API error:', err);
      res.status(502).json({ error: 'Music search proxy failed' });
    }
  });

  // Backward-compatibility alias for music search
  app.get('/api/itunes/search', (req, res) => {
    res.redirect(`/api/music/search?q=${encodeURIComponent(getQueryValue(req.query.term))}`);
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  app.use(async (req, res, next) => {
    try {
      const adminConfig = await getAdminConfig(req);
      const publicConfig = buildPublicConfig(adminConfig, req, false);
      const requestedArtists = await getRequestedArtists();
      const target = buildRedirectTarget(req, publicConfig, requestedArtists);
      if (target) {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.redirect(301, target);
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist', 'client');
    const indexPath = path.join(distPath, 'index.html');
    const serveIndexHtml: RequestHandler = async (req, res, next) => {
      try {
        const config = await getAdminConfig(req);
        const publicConfig = buildPublicConfig(config, req, isAdminEntryRequest(req));
        const html = await readFile(indexPath, 'utf8');
        if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
          res.setHeader('Cache-Control', 'no-store, max-age=0');
        }
        res.type('html').send(injectRuntimeHtml(html, req, publicConfig, res.locals.cspNonce as string | undefined));
      } catch (error) {
        next(error);
      }
    };

    app.get(['/server.cjs', '/server.cjs.map'], (_req, res) => {
      res.sendStatus(404);
    });
    app.get('/index.html', serveIndexHtml);
    app.use(express.static(distPath, { dotfiles: 'ignore', index: false }));
    app.get('*', serveIndexHtml);
  }

  const server = http.createServer(app);
  attachMultiplayerServer(server);
  startArtistPackRefreshScheduler();

  server.listen(PORT, HOST, () => {
    console.log(`Moroccan Heardle server running on http://${HOST}:${PORT}`);
  });
}

startServer();
