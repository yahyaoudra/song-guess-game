import { getInitialPublicRuntimeConfig } from './runtimeConfig';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let recaptchaScriptPromise: Promise<void> | null = null;

function getRecaptchaSiteKey(): string {
  return (
    window.__SONG_GUESS_PUBLIC_CONFIG__?.recaptchaSiteKey ||
    getInitialPublicRuntimeConfig().recaptchaSiteKey ||
    ''
  ).trim();
}

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();
  if (recaptchaScriptPromise) return recaptchaScriptPromise;

  recaptchaScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('reCAPTCHA could not load. Please try again.'));
    document.head.appendChild(script);
  });

  return recaptchaScriptPromise;
}

export async function executeRecaptcha(action: string): Promise<string | undefined> {
  const siteKey = getRecaptchaSiteKey();
  if (!siteKey || typeof window === 'undefined') return undefined;

  await loadRecaptchaScript(siteKey);
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) throw new Error('reCAPTCHA is not available. Please try again.');

  await new Promise<void>((resolve) => grecaptcha.ready(resolve));
  return grecaptcha.execute(siteKey, { action });
}
