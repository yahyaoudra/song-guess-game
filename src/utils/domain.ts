import { getCountryPath, getInitialPublicRuntimeConfig, normalizePublicAppUrl } from './runtimeConfig';

export function getPublicAppUrl(): string {
  const runtimeConfig = getInitialPublicRuntimeConfig();
  return normalizePublicAppUrl(
    runtimeConfig.appUrl || import.meta.env.VITE_APP_URL || import.meta.env.VITE_DOMAIN_NAME
  );
}

export function getPublicHost(): string {
  const url = getPublicAppUrl();
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}

export function getShareUrl(path = ''): string {
  const base = getPublicAppUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${path ? cleanPath : ''}`;
}

export function getCountryShareUrl(countryCode?: string): string {
  return getShareUrl(getCountryPath(countryCode));
}
