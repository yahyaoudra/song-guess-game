import { ActivityLogEntry, AdminConfigState, AdminSessionResponse, AdminUserRecord, PaymentRecord, RequestedArtist } from '../adminTypes';

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
