import React from 'react';
import { Sparkles, Play, Globe, Flame, Music, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { COUNTRIES } from '../data/countries';

interface OnboardingModalProps {
  onClose: () => void;
  onSelectCountry?: (countryCode: string) => void;
  selectedCountryCode: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  onClose,
  onSelectCountry,
  selectedCountryCode
}) => {
  const activeCountry = COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];

  return (
    <div
      id="onboarding-welcome-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 select-none overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-[#111714] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center my-auto overflow-hidden">
        {/* Decorative Top Ambient Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00e676]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Tag & App Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#00e676]/15 border border-[#00e676]/30 flex items-center justify-center text-3xl shadow-inner mb-4 relative z-10">
          🎵
        </div>

        <span className="text-[11px] font-mono font-black uppercase tracking-widest text-[#00e676] mb-2">
          WELCOME TO SONG GUESS GAME
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Can You Guess The Track in 0.1s?
        </h2>

        <p className="text-sm text-white/70 leading-relaxed max-w-md mb-6">
          Listen to ultra-short audio snippets from your favorite local and international music scenes. Every skip reveals a longer clue!
        </p>

        {/* 3 Step Visual Guide */}
        <div className="w-full space-y-2.5 mb-6 text-left">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#17201b] border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-[#00e676] text-black font-black flex items-center justify-center shrink-0 text-xs">
              1
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Press Play & Listen</h4>
              <p className="text-[11px] text-white/50">Hear the opening 0.1s snippet of the mystery track.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#17201b] border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black font-black flex items-center justify-center shrink-0 text-xs">
              2
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Type & Search Song Title</h4>
              <p className="text-[11px] text-white/50">Search in English, Arabic, Romaji or native script.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#17201b] border border-white/10">
            <div className="w-8 h-8 rounded-xl bg-purple-400 text-black font-black flex items-center justify-center shrink-0 text-xs">
              3
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Build Your Daily Streak & Rank</h4>
              <p className="text-[11px] text-white/50">Publish your verified score on the global and country leaderboard.</p>
            </div>
          </div>
        </div>

        {/* Selected Country Indicator */}
        <div className="w-full p-3 mb-6 bg-[#16201b] border border-white/10 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeCountry.flag}</span>
            <div className="text-left">
              <span className="block text-white font-bold">{activeCountry.name} Music Scene</span>
              <span className="block text-[10px] text-white/40">{activeCountry.popularGenres.slice(0, 3).join(', ')}</span>
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#00e676] bg-[#00e676]/10 px-2.5 py-1 rounded-full border border-[#00e676]/20 font-bold">
            Ready to play
          </span>
        </div>

        {/* Start Game Action */}
        <button
          id="onboarding-start-btn"
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#00e676] hover:bg-[#1fe682] text-black font-black text-sm tracking-wide transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Start Playing Now</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>

        <p className="text-[11px] text-white/40 mt-3">
          No sign-up required • Free to play • Offline cached support
        </p>
      </div>
    </div>
  );
};
