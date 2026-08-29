import React from 'react';
import { X } from 'lucide-react';
import { AdminAdSlot, IntegrationSettings } from '../adminTypes';
import { getSafeImageUrl, getSafeLinkUrl } from '../utils/safeUrl';
import { AdBannerDisplay } from './AdBannerDisplay';

interface AdInterstitialModalProps {
  slots: AdminAdSlot[];
  integrations: IntegrationSettings;
  onClose: () => void;
}

export const AdInterstitialModal: React.FC<AdInterstitialModalProps> = ({
  slots,
  integrations,
  onClose
}) => {
  const popupSlot = slots.find((slot) => slot.location === 'popup' && slot.enabled);
  if (!popupSlot) return null;

  const imageUrl = popupSlot.type === 'manual_banner' ? getSafeImageUrl(popupSlot.bannerImageUrl) : null;
  const linkUrl = popupSlot.type === 'manual_banner' ? getSafeLinkUrl(popupSlot.bannerLinkUrl) : '#';
  const canRenderAdsense =
    popupSlot.type === 'adsense' &&
    integrations.adsenseEnabled &&
    Boolean(integrations.googleAdsenseClientId) &&
    Boolean(popupSlot.adsenseSlot);

  if (popupSlot.type === 'manual_banner' && !imageUrl) return null;
  if (popupSlot.type === 'adsense' && !canRenderAdsense) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-500/75 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-md">
        <div className="flex justify-end pb-3">
          <button
            onClick={onClose}
            className="text-white font-black text-sm hover:text-white/75 cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-2xl">
          {imageUrl ? (
            <a
              href={linkUrl}
              target={linkUrl === '#' ? undefined : '_blank'}
              rel={linkUrl === '#' ? undefined : 'noopener noreferrer sponsored'}
              className="block"
            >
              <img
                src={imageUrl}
                alt={popupSlot.bannerAltText || 'Sponsored link'}
                className="w-full aspect-square object-cover rounded-sm"
                referrerPolicy="no-referrer"
              />
            </a>
          ) : (
            <div className="min-h-[320px] bg-white text-black">
              <AdBannerDisplay
                location="popup"
                slots={slots}
                integrations={integrations}
                className="min-h-[320px] border-zinc-200 bg-white"
              />
            </div>
          )}

          {popupSlot.type === 'manual_banner' ? (
            <a
              href={linkUrl}
              target={linkUrl === '#' ? undefined : '_blank'}
              rel={linkUrl === '#' ? undefined : 'noopener noreferrer sponsored'}
              onClick={linkUrl === '#' ? onClose : undefined}
              className="mt-5 mb-1 mx-auto flex h-14 w-[72%] items-center justify-center rounded-full bg-blue-500 text-white font-black"
            >
              Open
            </a>
          ) : (
            <button
              onClick={onClose}
              className="mt-5 mb-1 mx-auto flex h-12 w-[72%] items-center justify-center rounded-full bg-blue-500 text-white font-black cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
