interface SafeUrlOptions {
  requireHttps?: boolean;
  allowHashFallback?: boolean;
  maxLength?: number;
}

const DEFAULT_MAX_URL_LENGTH = 2048;

export function getSafeHttpUrl(rawUrl: string | undefined, options: SafeUrlOptions = {}): string | null {
  const value = (rawUrl || '').trim();
  const maxLength = options.maxLength || DEFAULT_MAX_URL_LENGTH;

  if (!value || value.length > maxLength || /[\u0000-\u001F\u007F]/.test(value)) {
    return null;
  }

  if (options.allowHashFallback && value === '#') {
    return '#';
  }

  try {
    const parsed = new URL(value);
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    if (!isHttp || (options.requireHttps && parsed.protocol !== 'https:')) {
      return null;
    }

    parsed.username = '';
    parsed.password = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getSafeImageUrl(rawUrl: string | undefined): string | null {
  const value = (rawUrl || '').trim();
  if (/^\/uploads\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp|gif)$/i.test(value)) {
    return value;
  }
  return getSafeHttpUrl(rawUrl, { requireHttps: true });
}

export function getSafeLinkUrl(rawUrl: string | undefined): string {
  return getSafeHttpUrl(rawUrl, { allowHashFallback: true }) || '#';
}

export function stripHtmlToText(rawHtml: string | undefined, maxLength = 500): string {
  return (rawHtml || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
