import React from 'react';
import { Difficulty, ThemeColor } from '../types';
import { DIFFICULTY_COLORS } from '../data/moroccanSongs';

interface StageLightingProps {
  difficulty: Difficulty;
  themeOverride?: ThemeColor | 'auto';
  isComplete?: boolean;
}

export const StageLighting: React.FC<StageLightingProps> = ({
  difficulty,
  themeOverride = 'auto',
  isComplete = false
}) => {
  const activeColor = isComplete
    ? '#c084fc'
    : themeOverride !== 'auto' && themeOverride
    ? themeOverride === 'green' ? '#00e676' : themeOverride === 'yellow' ? '#ffd600' : themeOverride === 'orange' ? '#ff9100' : themeOverride === 'red' ? '#ff5252' : themeOverride === 'purple' ? '#c084fc' : '#00e5ff'
    : DIFFICULTY_COLORS[difficulty]?.accent || '#00e676';

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Deep dark arena background */}
      <div className="absolute inset-0 bg-[#080c0a]" />

      {/* Perspective Stage Spotlight Beam - The signature Songspot stage effect */}
      <div
        className="absolute inset-x-0 top-0 bottom-0 mx-auto w-full max-w-4xl transition-all duration-700 opacity-60"
        style={{
          clipPath: 'polygon(28% 0%, 72% 0%, 94% 100%, 6% 100%)',
          background: `linear-gradient(180deg, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(0, 0, 0, 0.2) 100%)`,
        }}
      />

      {/* Subtle colored ambient cone matching current round difficulty */}
      <div
        className="absolute inset-x-0 top-0 mx-auto w-full max-w-2xl h-[85vh] transition-colors duration-1000 blur-3xl opacity-15"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${activeColor} 0%, rgba(0, 0, 0, 0) 70%)`
        }}
      />

      {/* Stage floor perspective grid lines / glow */}
      <div
        className="absolute bottom-0 inset-x-0 h-40 opacity-20 pointer-events-none"
        style={{
          background: `linear-gradient(to top, rgba(255,255,255,0.03), transparent)`
        }}
      />

      {/* Subtle 'Song Guess Game' watermark text in background */}
      <div className="absolute top-[28%] inset-x-0 flex justify-center items-center pointer-events-none opacity-[0.06] transition-opacity px-4 text-center">
        <span className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tighter text-white font-sans uppercase">
          Song Guess Game
        </span>
      </div>
    </div>
  );
};
