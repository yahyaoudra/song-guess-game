import React, { useState } from 'react';
import { X, Search, Globe, Check, Music } from 'lucide-react';
import { COUNTRIES, Country } from '../data/countries';
import { QUIZ_COLLECTIONS } from '../data/quizCollections';
import { ALL_SONGS } from '../data/moroccanSongs';

interface CountrySelectorModalProps {
  selectedCountryCode: string;
  onSelectCountry: (countryCode: string) => void;
  onClose: () => void;
}

export const CountrySelectorModal: React.FC<CountrySelectorModalProps> = ({
  selectedCountryCode,
  onSelectCountry,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRegion, setActiveRegion] = useState<string>('ALL');

  const REGIONS = ['ALL', 'Global', 'Africa', 'Americas', 'Europe', 'Asia', 'Middle East'];

  const filteredCountries = COUNTRIES.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nativeName && c.nativeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.popularGenres.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRegion = activeRegion === 'ALL' || c.region === activeRegion;
    return matchesSearch && matchesRegion;
  });

  const getSongCount = (code: string) => {
    if (code === 'GLOBAL') return ALL_SONGS.length;
    return ALL_SONGS.filter((s) => s.countryCode === code).length || 8;
  };

  const getPlaylistCount = (code: string) => {
    if (code === 'GLOBAL') return QUIZ_COLLECTIONS.length;
    return QUIZ_COLLECTIONS.filter((col) => col.countryCode === code).length || 2;
  };

  return (
    <div
      id="country-selector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0f1512] border border-white/15 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#141c18]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00e676]/15 border border-[#00e676]/30 flex items-center justify-center text-lg">
              🌍
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Choose Your Country / Music Scene
              </h2>
              <p className="text-xs text-white/50">
                Load authentic hit playlists, chart-toppers & quizzes from around the world
              </p>
            </div>
          </div>

          <button
            id="close-country-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Region Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-white/10 bg-[#121815] flex flex-col gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country, language, or genre (e.g. Morocco, K-Pop, France, Reggaeton)..."
              className="w-full bg-[#18221c] border border-white/10 focus:border-[#00e676] rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none transition-all"
            />
          </div>

          {/* Region Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRegion(r)}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-semibold transition-all cursor-pointer ${
                  activeRegion === r
                    ? 'bg-[#00e676] text-black shadow-md'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {r === 'ALL' ? '🌎 All Regions' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Country Grid */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2 max-h-[58vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredCountries.map((c) => {
              const isSelected = selectedCountryCode === c.code;
              const songCount = getSongCount(c.code);
              const playlistCount = getPlaylistCount(c.code);

              return (
                <button
                  key={c.code}
                  onClick={() => {
                    onSelectCountry(c.code);
                    onClose();
                  }}
                  className={`group relative p-3 sm:p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#00e676]/10 border-[#00e676] shadow-lg ring-1 ring-[#00e676]/50'
                      : 'bg-[#141b17] border-white/10 hover:border-white/25 hover:bg-[#19221d]'
                  }`}
                >
                  <div className="text-3xl sm:text-4xl select-none shrink-0 pt-0.5">
                    {c.flag}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-white group-hover:text-[#00e676] transition-colors truncate">
                          {c.name}
                        </span>
                        {c.nativeName && (
                          <span className="text-[11px] font-arabic text-white/40 shrink-0">
                            {c.nativeName}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-[#00e676] text-black text-[10px] font-black rounded-full uppercase tracking-tighter shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" /> Active
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-white/50 line-clamp-1 mt-0.5">
                      {c.description}
                    </p>

                    {/* Genres & Counts */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5 text-[10px] text-white/40">
                      <span className="truncate text-white/60">
                        {c.popularGenres.slice(0, 3).join(', ')}
                      </span>
                      <span className="shrink-0 font-mono text-[#00e676]/80 font-bold">
                        {playlistCount} playlists
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#121815] flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-2">
            <Music className="w-3.5 h-3.5 text-[#00e676]" />
            <span>Switch country anytime during game or quiz browsing</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
