import React, { useEffect, useMemo } from 'react';
import { AdminAdSlot, AdPlacementLocation, IntegrationSettings } from '../adminTypes';
import { getSafeImageUrl, getSafeLinkUrl } from '../utils/safeUrl';

interface AdBannerDisplayProps {
  location: AdPlacementLocation;
  slots: AdminAdSlot[];
  integrations: IntegrationSettings;
  className?: string;
}

export const AdBannerDisplay: React.FC<AdBannerDisplayProps> = ({
  location,
  slots,
  integrations,
  className = ''
}) => {
  const slot = useMemo(
    () => slots.find((item) => item.location === location && item.enabled),
    [location, slots]
  );

  useEffect(() => {
    if (!slot || slot.type !== 'adsense') return;
    if (!integrations.adsenseEnabled || !integrations.googleAdsenseClientId || !slot.adsenseSlot) return;

    const timeout = window.setTimeout(() => {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (error) {
        console.debug('AdSense slot render skipped', error);
      }
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [
    integrations.adsenseEnabled,
    integrations.googleAdsenseClientId,
    slot
  ]);

  if (!slot) return null;

  const isRail = location === 'left_rail' || location === 'right_rail';
  const frameClass = isRail
    ? 'w-full min-h-[360px] rounded-2xl'
    : 'w-full min-h-16 rounded-xl';

  if (slot.type === 'manual_banner') {
    const imageUrl = getSafeImageUrl(slot.bannerImageUrl);
    if (!imageUrl) return null;

    const linkUrl = getSafeLinkUrl(slot.bannerLinkUrl);

    return (
      <div className={`${frameClass} overflow-hidden border border-white/10 bg-[#121815] my-2 ${className}`}>
        <a
          href={linkUrl}
          target={linkUrl === '#' ? undefined : '_blank'}
          rel={linkUrl === '#' ? undefined : 'noopener noreferrer sponsored'}
          className="block relative group h-full"
        >
          <img
            src={imageUrl}
            alt={slot.bannerAltText || 'Sponsored music partner'}
            className={isRail ? 'w-full h-full min-h-[360px] object-cover' : 'w-full h-16 sm:h-20 object-cover'}
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 text-[9px] font-mono text-white/70 rounded">
            Ad
          </div>
        </a>
      </div>
    );
  }

  if (!integrations.adsenseEnabled || !integrations.googleAdsenseClientId || !slot.adsenseSlot) {
    return null;
  }

  return (
    <div className={`${frameClass} overflow-hidden border border-white/10 bg-[#121815] my-2 p-2 ${className}`}>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: isRail ? 340 : 80 }}
        data-ad-client={integrations.googleAdsenseClientId}
        data-ad-slot={slot.adsenseSlot}
        data-ad-format={isRail ? 'auto' : 'horizontal'}
        data-full-width-responsive="true"
      />
    </div>
  );
};
