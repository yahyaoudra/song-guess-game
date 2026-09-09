type AnalyticsParams = Record<string, unknown>;

const PURCHASE_TRACKED_KEY = 'song_guess_purchase_tracked_sessions_v1';
const RETURNING_USER_TRACKED_KEY = 'song_guess_returning_user_tracked_v1';
const EVENT_DEDUPE_KEY = 'song_guess_analytics_event_dedupe_v1';

function getTrackedSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch {
    return new Set();
  }
}

function saveTrackedSet(key: string, values: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(values).slice(-50)));
  } catch {}
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}): void {
  if (typeof window === 'undefined') return;
  const eventId = typeof params.event_id === 'string' ? params.event_id : '';
  const recentKey = eventId ? `${eventName}:${eventId}` : '';
  if (recentKey) {
    const recent = window.__SONG_GUESS_RECENT_ANALYTICS_EVENTS__ || [];
    if (recent.includes(recentKey)) return;
    window.__SONG_GUESS_RECENT_ANALYTICS_EVENTS__ = [...recent, recentKey].slice(-100);
  }
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventId ? params : { ...params, event_id: `${eventName}-${Date.now()}` });
    return;
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(['event', eventName, eventId ? params : { ...params, event_id: `${eventName}-${Date.now()}` }]);
}

export function trackEventOnce(eventName: string, dedupeId: string, params: AnalyticsParams = {}): boolean {
  if (!eventName || !dedupeId) return false;
  const tracked = getTrackedSet(EVENT_DEDUPE_KEY);
  const key = `${eventName}:${dedupeId}`;
  if (tracked.has(key)) return false;
  tracked.add(key);
  saveTrackedSet(EVENT_DEDUPE_KEY, tracked);
  trackEvent(eventName, { ...params, event_id: key });
  return true;
}

export function setAnalyticsUser(userId?: string): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') {
    window.gtag('set', { user_id: userId || null });
    return;
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(['set', { user_id: userId || null }]);
}

export function trackReturningUser(userId: string): void {
  if (!userId) return;
  const tracked = getTrackedSet(RETURNING_USER_TRACKED_KEY);
  if (tracked.has(userId)) return;
  tracked.add(userId);
  saveTrackedSet(RETURNING_USER_TRACKED_KEY, tracked);
  trackEvent('returning_client', {
    user_id: userId
  });
}

export function trackPurchaseOnce(sessionId: string, amountCents = 399): void {
  if (!sessionId) return;
  const tracked = getTrackedSet(PURCHASE_TRACKED_KEY);
  if (tracked.has(sessionId)) return;
  tracked.add(sessionId);
  saveTrackedSet(PURCHASE_TRACKED_KEY, tracked);
  const value = Number((amountCents / 100).toFixed(2));
  trackEvent('purchase', {
    transaction_id: sessionId,
    currency: 'USD',
    value,
    items: [{
      item_id: 'song_guess_unlimited_7_day_pass',
      item_name: 'Song Guess Unlimited - 7 Day Pass',
      price: value,
      quantity: 1
    }]
  });
}
