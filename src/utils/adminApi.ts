import {
  ActivityLogEntry,
  AdminConfigState,
  AdminCustomPackType,
  AdminEmailEvent,
  AdminFeatureAnalytics,
  AdminSessionResponse,
  AdminCustomCountry,
  AdminCustomPack,
  AdminUserProfile,
  AdminUserRecord,
  AdminUserSegments,
  PaymentRecord,
  RequestedArtist,
  SpotifyPlaylistSuggestion
} from '../adminTypes';

let csrfToken = '';

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (csrfToken && init.method && init.method.toUpperCase() !== 'GET') {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {}
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function getAdminSession(): Promise<AdminSessionResponse> {
  const session = await requestJson<AdminSessionResponse>('/api/admin/session');
  csrfToken = session.csrfToken || csrfToken;
  return session;
}

export async function loginAdmin(username: string, password: string): Promise<AdminSessionResponse> {
  const session = await requestJson<AdminSessionResponse>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  csrfToken = session.csrfToken || '';
  return session;
}

export async function logoutAdmin(): Promise<void> {
  await requestJson<{ ok: true }>('/api/admin/logout', {
    method: 'POST'
  });
  csrfToken = '';
}

export async function fetchAdminConfig(): Promise<AdminConfigState> {
  return requestJson<AdminConfigState>('/api/admin/config');
}

export async function saveAdminConfig(config: AdminConfigState): Promise<AdminConfigState> {
  return requestJson<AdminConfigState>('/api/admin/config', {
    method: 'PUT',
    body: JSON.stringify(config)
  });
}

export async function searchAdminSpotifyPlaylists(query: string): Promise<SpotifyPlaylistSuggestion[]> {
  const params = new URLSearchParams({ q: query });
  const body = await requestJson<{ playlists: SpotifyPlaylistSuggestion[] }>(`/api/admin/spotify/playlists?${params.toString()}`);
  return body.playlists;
}

export async function addAdminCustomCountry(country: {
  code: string;
  name: string;
  nativeName?: string;
  flag?: string;
  region?: string;
  popularGenres?: string[] | string;
  description?: string;
}): Promise<{ country: AdminCustomCountry; config: AdminConfigState }> {
  return requestJson<{ country: AdminCustomCountry; config: AdminConfigState }>('/api/admin/custom-countries', {
    method: 'POST',
    body: JSON.stringify(country)
  });
}

export async function addAdminSpotifyPlaylistPack(input: {
  playlistIdOrUrl: string;
  packType: AdminCustomPackType;
  title?: string;
  countryCode?: string;
  genreName?: string;
  genreSlug?: string;
}): Promise<{ pack: AdminCustomPack; config: AdminConfigState }> {
  return requestJson<{ pack: AdminCustomPack; config: AdminConfigState }>('/api/admin/custom-packs/spotify-playlist', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function deleteAdminCustomPack(packId: string): Promise<{ config: AdminConfigState }> {
  return requestJson<{ ok: true; config: AdminConfigState }>(`/api/admin/custom-packs/${encodeURIComponent(packId)}`, {
    method: 'DELETE'
  });
}

export async function fetchAdminActivity(): Promise<ActivityLogEntry[]> {
  const body = await requestJson<{ activity: ActivityLogEntry[] }>('/api/admin/activity');
  return body.activity;
}

export async function clearAdminActivity(): Promise<void> {
  await requestJson<{ ok: true }>('/api/admin/activity', {
    method: 'DELETE'
  });
}

export async function recordActivity(
  activity: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'ipHash' | 'userAgent'>
): Promise<void> {
  try {
    await requestJson<{ ok: true }>('/api/activity', {
      method: 'POST',
      body: JSON.stringify(activity)
    });
  } catch (error) {
    console.debug('Activity logging skipped', error);
  }
}

export async function recordFeatureEvent(feature: string, detail?: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    await requestJson<{ ok: true }>('/api/feature-event', {
      method: 'POST',
      body: JSON.stringify({ feature, detail, metadata, path: window.location.pathname + window.location.search })
    });
  } catch (error) {
    console.debug('Feature logging skipped', error);
  }
}

export async function uploadBannerAsset(dataUrl: string): Promise<string> {
  const body = await requestJson<{ url: string }>('/api/admin/uploads/banner', {
    method: 'POST',
    body: JSON.stringify({ dataUrl })
  });
  return body.url;
}

export async function fetchAdminUsers(): Promise<{ users: AdminUserRecord[]; totalUsers: number; databaseConfigured: boolean }> {
  return requestJson<{ users: AdminUserRecord[]; totalUsers: number; databaseConfigured: boolean }>('/api/admin/users');
}

export async function fetchAdminUserProfile(userId: string): Promise<AdminUserProfile> {
  return requestJson<AdminUserProfile>(`/api/admin/users/${encodeURIComponent(userId)}`);
}

export async function fetchAdminUserSegments(): Promise<AdminUserSegments> {
  const body = await requestJson<{ segments: AdminUserSegments }>('/api/admin/user-segments');
  return body.segments;
}

export async function fetchAdminFeatureAnalytics(): Promise<AdminFeatureAnalytics> {
  return requestJson<AdminFeatureAnalytics>('/api/admin/feature-analytics');
}

export async function fetchAdminEmailEvents(): Promise<AdminEmailEvent[]> {
  const body = await requestJson<{ emails: AdminEmailEvent[]; emailProviderConfigured: boolean }>('/api/admin/email-events');
  return body.emails;
}

export async function retryAdminEmail(emailEventId: string): Promise<void> {
  await requestJson<{ ok: true }>(`/api/admin/email-events/${encodeURIComponent(emailEventId)}/retry`, {
    method: 'POST'
  });
}

export async function resendUnverifiedUserEmails(limit = 200): Promise<{ matched: number; sent: number; failed: number }> {
  return requestJson<{ ok: true; matched: number; sent: number; failed: number }>('/api/admin/email-backfill/unverified-verification', {
    method: 'POST',
    body: JSON.stringify({ limit })
  });
}

export async function resendAbandonedCheckoutEmails(limit = 200): Promise<{ matched: number; sent: number; failed: number }> {
  return requestJson<{ ok: true; matched: number; sent: number; failed: number }>('/api/admin/email-backfill/abandoned-checkouts', {
    method: 'POST',
    body: JSON.stringify({ limit })
  });
}

export async function executeQueuedArtistRequest(slug: string): Promise<{ artist: RequestedArtist; artists: RequestedArtist[] }> {
  return requestJson<{ artist: RequestedArtist; artists: RequestedArtist[] }>(`/api/admin/artist-requests/${encodeURIComponent(slug)}/execute`, {
    method: 'POST'
  });
}

export async function fetchAdminPayments(): Promise<{
  payments: PaymentRecord[];
  databaseConfigured: boolean;
  stripeConfigured: boolean;
}> {
  return requestJson<{
    payments: PaymentRecord[];
    databaseConfigured: boolean;
    stripeConfigured: boolean;
  }>('/api/admin/payments');
}

export async function refundAdminPayment(paymentId: string): Promise<void> {
  await requestJson<{ ok: true }>(`/api/admin/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST'
  });
}

export async function refreshAdminArtistPack(slug: string, artistName: string, spotifyArtistId?: string): Promise<{
  artist: RequestedArtist;
  artists: RequestedArtist[];
}> {
  return requestJson<{ artist: RequestedArtist; artists: RequestedArtist[] }>(`/api/admin/artist-packs/${encodeURIComponent(slug)}/refresh`, {
    method: 'POST',
    body: JSON.stringify({ artistName, spotifyArtistId })
  });
}
