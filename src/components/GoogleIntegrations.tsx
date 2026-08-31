import React, { useEffect, useRef } from 'react';
import { PublicRuntimeConfig } from '../adminTypes';

interface GoogleIntegrationsProps {
  config: PublicRuntimeConfig;
  pageTitle: string;
  pagePath: string;
}

function ensureScript(id: string, src: string, crossOrigin?: string): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  if (crossOrigin) script.crossOrigin = crossOrigin;
  document.head.appendChild(script);
}

export const GoogleIntegrations: React.FC<GoogleIntegrationsProps> = ({
  config,
  pageTitle,
  pagePath
}) => {
  const initializedAnalyticsId = useRef<string>('');
  const initializedClarityId = useRef<string>('');

  useEffect(() => {
    const measurementId = config.integrations.googleAnalyticsMeasurementId.trim();
    if (!config.integrations.analyticsEnabled || !measurementId) return;

    ensureScript(
      'song-guess-google-tag',
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
    );

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtagFallback(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

    if (initializedAnalyticsId.current !== measurementId) {
      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        send_page_view: false
      });
      initializedAnalyticsId.current = measurementId;
    }

    window.gtag('event', 'page_view', {
      page_title: pageTitle,
      page_path: pagePath,
      page_location: `${config.appUrl}${pagePath === '/' ? '' : pagePath}`
    });
  }, [
    config.appUrl,
    config.integrations.analyticsEnabled,
    config.integrations.googleAnalyticsMeasurementId,
    pagePath,
    pageTitle
  ]);

  useEffect(() => {
    const clientId = config.integrations.googleAdsenseClientId.trim();
    if (!config.integrations.adsenseEnabled || !clientId) return;

    ensureScript(
      'song-guess-adsense',
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`,
      'anonymous'
    );
  }, [
    config.integrations.adsenseEnabled,
    config.integrations.googleAdsenseClientId
  ]);

  useEffect(() => {
    const projectId = config.integrations.microsoftClarityProjectId.trim();
    if (!config.integrations.clarityEnabled || !projectId || initializedClarityId.current === projectId) return;

    window.clarity = window.clarity || function clarityFallback(...args: unknown[]) {
      (window.clarity as unknown as { q?: unknown[] }).q = (window.clarity as unknown as { q?: unknown[] }).q || [];
      (window.clarity as unknown as { q?: unknown[] }).q?.push(args);
    };

    ensureScript('song-guess-clarity', `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`);
    initializedClarityId.current = projectId;
  }, [
    config.integrations.clarityEnabled,
    config.integrations.microsoftClarityProjectId
  ]);

  return null;
};
