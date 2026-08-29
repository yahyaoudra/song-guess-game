import React, { useState } from 'react';
import { X, Trophy, Search } from 'lucide-react';
import { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../utils/storage';
import { COUNTRIES } from '../data/countries';

interface LeaderboardModalProps {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [entries] = useState<LeaderboardEntry[]>(getLeaderboard());
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = entries.filter((e) =>
    e.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 select-none">
      <div
        id="leaderboard-modal"
        className="relative w-full max-w-xl bg-[#111714] border border-white/15 rounded-lg p-3 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#ffd600]/15 border border-[#ffd600]/30 flex items-center justify-center text-[#ffd600] shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
                Song Guess Leaderboard
              </h2>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                Today's Daily 5 Top Global Music Champions
              </p>
            </div>
          </div>

          <button
            id="close-leaderboard-modal-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="my-4 relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search player nickname..."
            className="w-full pl-10 pr-4 py-2 bg-[#18201c] border border-white/10 rounded-xl text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Entries List */}
        <div className="overflow-y-auto flex flex-col gap-2 pr-1 max-h-[62vh]">
          {filtered.map((entry, index) => {
            const isTop1 = index === 0;
            const isTop2 = index === 1;
            const isTop3 = index === 2;
            const countryMeta = COUNTRIES.find((c) => c.code === entry.countryCode);

            return (
              <div
                key={entry.id + index}
                className={`flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-lg border transition-all ${
                  entry.isCurrentUser
                    ? 'bg-[#00e676]/10 border-[#00e676]/40'
                    : isTop1
                    ? 'bg-[#ffd600]/10 border-[#ffd600]/30'
                    : 'bg-[#151c18] border-white/5 hover:border-white/15'
                }`}
              >
                {/* Rank & Nickname */}
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-black font-mono text-[10px] sm:text-xs text-white/80 bg-white/5 shrink-0">
                    {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${index + 1}`}
                  </div>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      {countryMeta && (
                        <span className="text-sm" title={countryMeta.name}>
                          {countryMeta.flag}
                        </span>
                      )}
                      <span className="min-w-0 truncate text-xs sm:text-sm font-bold text-white">
                        {entry.nickname}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#00e676] text-black rounded-full uppercase">
                          YOU
                        </span>
                      )}
                      {entry.badge && (
                        <span className="hidden max-w-[70px] truncate text-[10px] text-white/50 sm:inline">
                          {entry.badge}
                        </span>
                      )}
                    </div>
                    <span className="block truncate text-[10px] text-white/40 font-mono">
                      {entry.correctCount}/{entry.totalRounds} correct • {entry.timeFormatted} min
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="w-16 shrink-0 text-right sm:w-20">
                  <span
                    className="block text-xs sm:text-sm font-black font-mono leading-tight"
                    style={{
                      color: isTop1 ? '#ffd600' : entry.isCurrentUser ? '#00e676' : '#ffffff'
                    }}
                  >
                    {entry.points} PTS
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
