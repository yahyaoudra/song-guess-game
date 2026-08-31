import React, { useEffect, useState } from 'react';
import { Loader2, Play, Pause } from 'lucide-react';
import { Song, Difficulty, ThemeColor } from '../types';
import { SNIPPET_TIERS, DIFFICULTY_COLORS } from '../data/moroccanSongs';
import { audioEngine } from '../utils/audioPlayer';

interface AudioSnippetPlayerProps {
  song: Song;
  currentStepIndex: number;
  difficulty: Difficulty;
  themeOverride?: ThemeColor | 'auto';
  onSnippetEnded?: () => void;
  onBeforePlay?: () => boolean | Promise<boolean>;
  onPlayStart?: () => void;
}

export const AudioSnippetPlayer: React.FC<AudioSnippetPlayerProps> = ({
  song,
  currentStepIndex,
  difficulty,
  themeOverride = 'auto',
  onBeforePlay,
  onPlayStart
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressSec, setProgressSec] = useState(0);

  const currentTier = SNIPPET_TIERS[currentStepIndex] || SNIPPET_TIERS[0];
  const maxDuration = currentTier.durationSec;

  const activeColor =
    themeOverride !== 'auto' && themeOverride
      ? themeOverride === 'green'
        ? '#00e676'
        : themeOverride === 'yellow'
        ? '#ffd600'
        : themeOverride === 'orange'
        ? '#ff9100'
        : themeOverride === 'red'
        ? '#ff5252'
        : themeOverride === 'purple'
        ? '#c084fc'
        : '#00e5ff'
      : DIFFICULTY_COLORS[difficulty]?.accent || '#00e676';

  const glowColor = DIFFICULTY_COLORS[difficulty]?.glow || 'rgba(0, 230, 118, 0.4)';

  useEffect(() => {
    const handlePlayState = (playing: boolean, currentSec: number, _maxSec: number, loading: boolean) => {
      setIsPlaying(playing);
      setIsLoading(loading);
      setProgressSec(currentSec);
    };

    audioEngine.setListener(handlePlayState);
    return () => {
      audioEngine.stop();
    };
  }, []);

  // When current step changes or song changes, stop previous audio and preload
  useEffect(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setIsLoading(false);
    setProgressSec(0);
    const offset = song.smartCueOffsetSec || 0;
    audioEngine.prepare(song.previewUrl, offset);
  }, [currentStepIndex, song.id, song.previewUrl, song.smartCueOffsetSec]);

  const handleTogglePlay = async () => {
    if (!isPlaying && onBeforePlay) {
      const allowed = await onBeforePlay();
      if (!allowed) return;
    }

    if (!isPlaying) onPlayStart?.();
    const offset = song.smartCueOffsetSec || 0;
    audioEngine.toggle(song.previewUrl, maxDuration, offset, {
      title: song.title,
      artist: song.artist,
      spotifyTrackId: song.spotifyTrackId
    });
  };

  // Calculate widths for the 6 snippet steps relative to total 15 seconds
  const totalLength = SNIPPET_TIERS[SNIPPET_TIERS.length - 1].durationSec; // 15s
  const unlockedFraction = Math.min(1, maxDuration / totalLength);
  const playProgressFraction = maxDuration > 0 ? (progressSec / maxDuration) * unlockedFraction : 0;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center select-none mt-10 mb-8">
      {/* 1. Multi-Segment Progress Bar */}
      <div className="w-full px-4 mb-10">
        <div
          id="snippet-progress-track"
          className="relative w-full h-4 bg-[#1e2622] rounded-full overflow-hidden border border-white/5 shadow-inner"
        >
          {/* Segment Dividers */}
          <div className="absolute inset-0 flex pointer-events-none">
            {SNIPPET_TIERS.map((tier, idx) => {
              const prevDuration = idx === 0 ? 0 : SNIPPET_TIERS[idx - 1].durationSec;
              const stepWidth = ((tier.durationSec - prevDuration) / totalLength) * 100;
              return (
                <div
                  key={tier.step}
                  className="h-full border-r border-[#0e1411]/80 relative"
                  style={{ width: `${stepWidth}%` }}
                />
              );
            })}
          </div>

          {/* Unlocked Zone Background */}
          <div
            className="absolute top-0 left-0 bottom-0 transition-all duration-300 opacity-30 rounded-l-full"
            style={{
              width: `${unlockedFraction * 100}%`,
              backgroundColor: activeColor,
            }}
          />

          {/* Active Playback Progress Bar */}
          <div
            className="absolute top-0 left-0 bottom-0 rounded-l-full transition-all ease-linear"
            style={{
              width: `${playProgressFraction * 100}%`,
              backgroundColor: activeColor,
              boxShadow: `0 0 12px ${activeColor}`,
            }}
          />
        </div>

        {/* Indicator Arrow and Label underneath */}
        <div className="relative w-full h-6 mt-1">
          <div
            className="absolute flex flex-col items-center transition-all duration-300"
            style={{
              left: `calc(${unlockedFraction * 100}% - 14px)`,
            }}
          >
            <div
              className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px]"
              style={{ borderBottomColor: activeColor }}
            />
            <span
              className="text-[11px] font-mono font-bold tracking-tight mt-0.5"
              style={{ color: activeColor }}
            >
              {currentTier.label}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Big Circular Play Button & Duration Tag */}
      <div className="relative flex items-center justify-center">
        {/* Animated Sound Pulse Waves when playing */}
        {isPlaying && !isLoading && (
          <>
            <div
              className="absolute w-32 h-32 rounded-full animate-ping opacity-25"
              style={{ backgroundColor: activeColor }}
            />
            <div
              className="absolute w-36 h-36 rounded-full animate-pulse opacity-20 border"
              style={{ borderColor: activeColor }}
            />
          </>
        )}

        {/* Central Button */}
        <button
          id="play-snippet-btn"
          onClick={handleTogglePlay}
          className="group relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xl cursor-pointer"
          style={{
            backgroundColor: activeColor,
            boxShadow: isPlaying ? `0 0 35px ${glowColor}` : `0 0 20px ${glowColor}`,
          }}
          aria-label={isLoading ? 'Loading music clue' : isPlaying ? 'Pause music clue' : 'Play music clue'}
        >
          {isLoading ? (
            <Loader2 className="w-10 h-10 text-black animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-10 h-10 text-black fill-black ml-0" />
          ) : (
            <Play className="w-10 h-10 text-black fill-black ml-1.5" />
          )}
        </button>

        {/* Current Unlocked Duration Tag beside play button */}
        <div className="absolute left-[115%] pl-2 whitespace-nowrap">
          <span
            className="text-lg font-bold font-mono tracking-tight"
            style={{ color: activeColor }}
          >
            {currentTier.label}
          </span>
        </div>
      </div>
    </div>
  );
};
