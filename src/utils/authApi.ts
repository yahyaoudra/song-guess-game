import { AuthSessionResponse, DailyAccessState, PaymentRecord, RequestedArtist, SpotifyArtistSuggestion } from '../adminTypes';
import { executeRecaptcha } from './recaptcha';

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
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
      if (typeof body?.reason === 'string') message = body.reason;
    } catch {}
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function getAuthSession(): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>('/api/auth/me');
}

export async function registerUser(email: string, password: string, name: string): Promise<AuthSessionResponse & { verificationUrl?: string; emailSent?: boolean }> {
  const recaptchaToken = await executeRecaptcha('register');
  return requestJson<AuthSessionResponse & { verificationUrl?: string; emailSent?: boolean }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, recaptchaToken })
  });
}

export async function loginUser(email: string, password: string): Promise<AuthSessionResponse> {
  const recaptchaToken = await executeRecaptcha('login');
  return requestJson<AuthSessionResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, recaptchaToken })
  });
}

export async function logoutUser(): Promise<void> {
  await requestJson<{ ok: true }>('/api/auth/logout', { method: 'POST' });
}

export async function updateUserProfile(name: string, countryCode: string): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name, countryCode })
  });
}

export async function startEmailChange(email: string): Promise<{ ok: true; verificationUrl: string; emailSent?: boolean }> {
  const recaptchaToken = await executeRecaptcha('change_email');
  return requestJson<{ ok: true; verificationUrl: string; emailSent?: boolean }>('/api/auth/change-email', {
    method: 'POST',
    body: JSON.stringify({ email, recaptchaToken })
  });
}

export async function fetchUserPayments(): Promise<PaymentRecord[]> {
  const body = await requestJson<{ payments: PaymentRecord[] }>('/api/auth/payments');
  return body.payments;
}

export function getReceiptUrl(paymentId: string): string {
  return `/api/auth/payments/${encodeURIComponent(paymentId)}/receipt`;
}

export async function getAccessStatus(): Promise<DailyAccessState> {
  return requestJson<DailyAccessState>('/api/entitlements/status', { method: 'POST' });
}

export async function claimFreePlay(scopeType: string, scopeSlug: string): Promise<DailyAccessState> {
  return requestJson<DailyAccessState>('/api/entitlements/claim-free-play', {
    method: 'POST',
    body: JSON.stringify({ scopeType, scopeSlug })
  });
}

export async function createCheckout(): Promise<string> {
  const body = await requestJson<{ url?: string }>('/api/payments/create-checkout', { method: 'POST' });
  if (!body.url) throw new Error('Stripe did not return a checkout URL');
  return body.url;
}

export async function fetchRequestedArtists(): Promise<RequestedArtist[]> {
  const body = await requestJson<{ artists: RequestedArtist[] }>('/api/artist-requests');
  return body.artists;
}

export async function searchSpotifyArtists(query: string): Promise<SpotifyArtistSuggestion[]> {
  const params = new URLSearchParams({ q: query });
  const body = await requestJson<{ artists: SpotifyArtistSuggestion[] }>(`/api/spotify/artists?${params.toString()}`);
  return body.artists;
}

export async function requestArtist(artistName: string, spotifyArtistId?: string): Promise<RequestedArtist> {
  const recaptchaToken = await executeRecaptcha('artist_request');
  const body = await requestJson<{ artist: RequestedArtist }>('/api/artist-requests', {
    method: 'POST',
    body: JSON.stringify({ artistName, spotifyArtistId, recaptchaToken })
  });
  return body.artist;
}

export async function sendContactRequest(name: string, email: string, message: string): Promise<void> {
  const recaptchaToken = await executeRecaptcha('contact');
  await requestJson<{ ok: true }>('/api/contact', {
    method: 'POST',
    body: JSON.stringify({ name, email, message, recaptchaToken })
  });
}
