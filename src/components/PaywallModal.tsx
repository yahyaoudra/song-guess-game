import React, { useMemo } from 'react';
import { Check, Crown, Lock, X } from 'lucide-react';
import { getArtistChallenges } from '../utils/challengeCatalog';

interface PaywallModalProps {
  onClose: () => void;
  onLogin: () => void;
  onCheckout: () => void;
  isAuthenticated: boolean;
  stripeConfigured: boolean;
  databaseConfigured: boolean;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  onClose,
  onLogin,
  onCheckout,
  isAuthenticated,
  stripeConfigured,
  databaseConfigured
}) => {
  const carouselArtists = useMemo(() => {
    const wanted = ['Taylor Swift', 'Drake', 'Justin Bieber', 'Ariana Grande', 'Bruno Mars', 'Pitbull'];
    const artists = getArtistChallenges();
    return wanted.map((name) => {
      const match = artists.find((artist) => artist.name.toLowerCase() === name.toLowerCase());
      return {
        slug: match?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        name,
        displayImage: `/api/music/artist-image?name=${encodeURIComponent(name)}`
      };
    });
  }, []);

  const actionLabel = !databaseConfigured
    ? 'Add Postgres to enable access'
    : !isAuthenticated
    ? 'Login or sign up'
    : !stripeConfigured
    ? 'Add Stripe keys'
    : 'Unlock unlimited';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/82 p-3 backdrop-blur-md sm:p-4">
      <div className="relative my-auto w-full max-w-4xl overflow-hidden rounded-lg border border-[#00e676]/25 bg-[#08110d] shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#00e676]" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Close paywall"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-4 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00e676]/30 bg-[#00e676]/10 px-3 py-1 text-xs font-black text-[#00e676]">
              <Crown className="h-3.5 w-3.5" />
              7-day pass
            </div>
            <h2 className="mt-4 max-w-xl text-2xl font-black leading-tight text-white sm:mt-5 sm:text-5xl">
              Play unlimited Song Guess
            </h2>
            <p className="mt-3 max-w-lg text-xs leading-relaxed text-white/58 sm:mt-4 sm:text-sm">
              One $3.99 payment unlocks every mode for a week. No subscription, no daily wall, and no ads while your pass is active.
            </p>

            <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-2">
              {[
                'All artists',
                'All countries',
                'All genres and eras',
                'Unlimited replay',
                'No ads',
                'Multiplayer rooms'
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/75 sm:text-sm">
                  <Check className="h-4 w-4 text-[#00e676]" />
                  {feature}
                </div>
              ))}
            </div>

            <button
              onClick={isAuthenticated && stripeConfigured && databaseConfigured ? onCheckout : onLogin}
              disabled={!databaseConfigured}
              className="mt-5 flex h-11 w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-[#00e676] text-sm font-black text-black shadow-[0_18px_48px_rgba(0,230,118,0.22)] hover:bg-[#1fe682] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-7 sm:h-12"
            >
              <Lock className="h-4 w-4" />
              {actionLabel}
            </button>
            {!stripeConfigured && isAuthenticated && databaseConfigured && (
              <p className="mt-2 text-xs text-yellow-100/70">Stripe checkout needs `STRIPE_SECRET_KEY` before live payments can start.</p>
            )}
          </div>

          <div className="relative min-h-[190px] overflow-hidden border-t border-white/10 bg-[#101713] sm:min-h-[320px] lg:border-l lg:border-t-0">
            <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_30%_20%,rgba(0,230,118,0.28),transparent_35%),radial-gradient(circle_at_80%_65%,rgba(255,214,0,0.18),transparent_32%)]" />
            <div className="relative flex h-full flex-col justify-center gap-3 p-5">
              {[0, 1].map((row) => (
                <div
                  key={row}
                  className={`flex gap-3 ${row === 1 ? 'translate-x-10' : ''} animate-[paywall-slide_24s_linear_infinite]`}
                  aria-hidden="true"
                >
                  {[...carouselArtists, ...carouselArtists].map((artist, index) => (
                    <div key={`${artist.slug}-${row}-${index}`} className="w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30 shadow-xl sm:w-36">
                      <img
                        src={artist.displayImage}
                        alt=""
                        className="h-20 w-full object-cover sm:h-28"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          (event.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="px-3 py-2 text-xs font-black text-white truncate">{artist.name}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes paywall-slide {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};
