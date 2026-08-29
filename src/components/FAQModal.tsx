import React from 'react';
import { X, HelpCircle, Shield, Music, Globe } from 'lucide-react';
import { SNIPPET_TIERS } from '../data/moroccanSongs';

interface FAQModalProps {
  onClose: () => void;
}

export const FAQModal: React.FC<FAQModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none">
      <div
        id="faq-modal"
        className="relative w-full max-w-lg bg-[#111714] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[85vh] my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-[#00e676]" />
            <h2 className="text-xl font-black text-white tracking-tight">
              Song Guess Game — Guide & Rules
            </h2>
          </div>

          <button
            id="close-faq-modal-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto pr-1 mt-4 space-y-4 text-xs text-white/80 leading-relaxed">
          {/* Section 1 */}
          <div className="p-3.5 bg-[#161d19] border border-white/5 rounded-2xl">
            <h3 className="font-bold text-white mb-1.5 flex items-center gap-1.5">
              <Music className="w-4 h-4 text-[#00e676]" />
              <span>How To Play</span>
            </h3>
            <p className="text-white/70">
              Listen to audio clues to identify the song. Each round starts with a quick snippet. Skip or guess incorrectly to reveal longer audio clips while earning points based on speed!
            </p>
          </div>

          {/* Section 2 - Countries & Scenes */}
          <div className="p-3.5 bg-[#161d19] border border-white/5 rounded-2xl">
            <h3 className="font-bold text-white mb-1.5 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#00e676]" />
              <span>Worldwide Music Scenes</span>
            </h3>
            <p className="text-white/70">
              Pick your country (Morocco, USA, UK, France, Spain, Egypt, Algeria, Brazil, South Korea, Japan, and more) to load authentic hit playlists, Spotify official top charts, and curated quizzes!
            </p>
          </div>

          {/* Section 3 - Scoring */}
          <div className="p-3.5 bg-[#161d19] border border-white/5 rounded-2xl">
            <h3 className="font-bold text-white mb-2">Scoring Ladder</h3>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              {SNIPPET_TIERS.map((tier) => (
                <div key={tier.step} className="bg-[#0e1411] p-2 rounded-lg text-center border border-white/5">
                  <span className="font-bold block" style={{ color: tier.color || '#00e676' }}>
                    {tier.label}
                  </span>
                  <span className="text-white/60">{tier.points} PTS</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4 - Audio Stream & Spotify Notice */}
          <div className="p-3.5 bg-[#161d19] border border-white/5 rounded-2xl">
            <h3 className="font-bold text-white mb-1.5 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#1DB954]" />
              <span>Audio & Spotify Integration</span>
            </h3>
            <p className="text-white/60 text-[11px] leading-relaxed">
              Audio previews stream directly to your browser for fast snippet guessing. You can also open any full track or official playlist directly on Spotify.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
