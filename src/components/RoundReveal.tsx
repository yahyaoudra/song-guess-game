import React, { useEffect, useState, useRef } from 'react';
import { Share2, ArrowRight, Play, Pause, ExternalLink, Sparkles, Music2, Radio } from 'lucide-react';
import { Song, Difficulty, ThemeColor, TitleDisplayMode } from '../types';
import { DIFFICULTY_COLORS, SNIPPET_TIERS } from '../data/moroccanSongs';
import { audioEngine } from '../utils/audioPlayer';
import { getSongTitleDisplay } from '../utils/songTitles';
import { getShareUrl } from '../utils/domain';
import { getCountryPath } from '../utils/runtimeConfig';

interface RoundRevealProps {
  song: Song;
  roundNumber: number;
  totalRounds: number;
  pointsEarned: number;
  totalPoints: number;
  maxPossiblePoints: number;
  isCorrect: boolean;
  difficulty: Difficulty;
  themeOverride?: ThemeColor | 'auto';
  onNextRound: () => void;
  onChallengeFriend: () => void;
  showArabicTitles?: boolean;
  titleDisplayMode?: TitleDisplayMode;
  playedStepIndex?: number;
  onOpenShareCard?: () => void;
}

// Generate static pleasing aesthetic bar heights for waveform
const WAVEFORM_BAR_HEIGHTS = [
  35, 60, 45, 80, 55, 90, 70, 40, 65, 85, 100, 75, 50, 65, 80, 95, 60, 45,
  70, 85, 90, 65, 45, 80, 100, 85, 60, 75, 90, 55, 40, 70, 85, 60, 45, 30
];

export const RoundReveal: React.FC<RoundRevealProps> = ({
  song,
  roundNumber,
  totalRounds,
  pointsEarned,
  totalPoints,
  maxPossiblePoints,
  isCorrect,
  difficulty,
  themeOverride = 'auto',
  onNextRound,
  onChallengeFriend,
  showArabicTitles = true,
  titleDisplayMode = 'both',
  playedStepIndex = 0,
  onOpenShareCard
}) => {
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [currentPlaybackSec, setCurrentPlaybackSec] = useState(0);
  const [totalDurationSec, setTotalDurationSec] = useState(30);
  const [copiedShare, setCopiedShare] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);

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

  const isLastRound = roundNumber >= totalRounds;

  // Calculate snippet bounds
  const smartCueOffset = song.smartCueOffsetSec || 0;
  const currentTier = SNIPPET_TIERS[Math.min(playedStepIndex, SNIPPET_TIERS.length - 1)] || SNIPPET_TIERS[0];
  const snippetDuration = currentTier.durationSec;
  const snippetStartSec = smartCueOffset;
  const snippetEndSec = Math.min(30, smartCueOffset + snippetDuration);

  // Percentages for timeline visualization
  const snippetStartPercent = (snippetStartSec / 30) * 100;
  const snippetWidthPercent = Math.max(2, ((snippetEndSec - snippetStartSec) / 30) * 100);
  const playheadPercent = Math.min(100, Math.max(0, (currentPlaybackSec / 30) * 100));

  const titleInfo = getSongTitleDisplay(song, (titleDisplayMode as TitleDisplayMode) || 'both');

  useEffect(() => {
    const handleAudioState = (playing: boolean, curSec: number, maxSec: number) => {
      setIsPlayingFull(playing);
      if (curSec !== undefined && !isNaN(curSec)) {
        setCurrentPlaybackSec(curSec);
      }
      if (maxSec && maxSec > 0) {
        setTotalDurationSec(maxSec);
      }
    };
    audioEngine.setListener(handleAudioState);

    // Auto-play full preview when revealed
    audioEngine.playFullPreview(song.previewUrl, 0, {
      title: song.title,
      artist: song.artist,
      spotifyTrackId: song.spotifyTrackId
    });

    return () => {
      audioEngine.stop();
    };
  }, [song.id, song.previewUrl, song.title, song.artist, song.spotifyTrackId]);

  const handleToggleFullAudio = () => {
    if (isPlayingFull) {
      audioEngine.stop();
    } else {
      audioEngine.playFullPreview(song.previewUrl, currentPlaybackSec || 0, {
        title: song.title,
        artist: song.artist,
        spotifyTrackId: song.spotifyTrackId
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;
    const targetSec = ratio * 30;
    setCurrentPlaybackSec(targetSec);
    audioEngine.seek(targetSec);
  };

  const handleShareResult = () => {
    const shareLink = getShareUrl(getCountryPath(song.countryCode));
    const text = `🎵 Song Guess Game Round ${roundNumber}/${totalRounds}: ${
      isCorrect ? `Guessed "${song.title}" (+${pointsEarned} pts)` : `Missed "${song.title}"`
    }! Play at ${shareLink}`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const formatTime = (sec: number) => {
    const s = Math.floor(sec);
    const mins = Math.floor(s / 60);
    const remainingSecs = s % 60;
    return `${mins}:${String(remainingSecs).padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center select-none mt-4 mb-8 px-4 animate-in fade-in zoom-in-95 duration-300">
      {/* Album Artwork Cover with Play/Pause Badge */}
      <div className="relative group mb-4">
        <div
          className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#161d19] relative transition-transform duration-300 group-hover:scale-105"
          style={{
            boxShadow: isCorrect
              ? `0 10px 40px -10px ${activeColor}40`
              : '0 10px 40px -10px rgba(0,0,0,0.8)'
          }}
        >
          {song.artworkUrl ? (
            <img
              src={song.artworkUrl}
              alt={song.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#151c18] text-white/40">
              <Sparkles className="w-12 h-12" />
            </div>
          )}

          {/* Play/Pause Overlay on Cover */}
          <button
            id="reveal-play-toggle-btn"
            onClick={handleToggleFullAudio}
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white backdrop-blur-sm transition-all opacity-80 hover:opacity-100 hover:scale-110 cursor-pointer shadow-lg"
            title={isPlayingFull ? 'Pause preview' : 'Play full preview'}
          >
            {isPlayingFull ? (
              <Pause className="w-6 h-6 fill-white" />
            ) : (
              <Play className="w-6 h-6 fill-white ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Round Indicator */}
      <span className="text-[11px] font-mono font-black uppercase tracking-widest text-[#00e676] mb-1">
        ROUND {roundNumber} OF {totalRounds}
      </span>

      {/* Track Title + Points Stamp Badge */}
      <div className="relative flex items-center justify-center flex-wrap gap-2 mb-1 px-4">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {titleInfo.primaryTitle}
        </h2>

        {/* The Signature Song Guess Tilted Stamp Badge */}
        <div
          id="points-stamp-badge"
          className="inline-block transform rotate-6 border-2 px-2.5 py-0.5 rounded text-xs sm:text-sm font-mono font-black shadow-lg"
          style={{
            borderColor: isCorrect ? activeColor : '#ef4444',
            color: isCorrect ? activeColor : '#ef4444',
            backgroundColor: isCorrect ? `${activeColor}15` : 'rgba(239, 68, 68, 0.15)',
          }}
        >
          {isCorrect ? `+${pointsEarned}` : 'MISSED'}
        </div>
      </div>

      {/* Secondary Subtitle / Translation / Native Title */}
      {titleInfo.secondaryTitle && (
        <div className="text-sm text-white/60 mb-1 font-sans">
          {titleInfo.secondaryTitle}
        </div>
      )}

      {/* Artist & Year */}
      <p className="text-sm font-semibold text-white/70 mb-3">
        {titleInfo.artistDisplay} {song.releaseYear ? <><span className="text-white/30">•</span> {song.releaseYear}</> : null}
      </p>

      {/* === SNIPPET & FULL SONG WAVEFORM TIMELINE === */}
      <div
        id="round-reveal-audio-timeline"
        className="w-full bg-[#111714] border border-white/10 rounded-2xl p-3.5 mb-4 shadow-xl text-left"
      >
        {/* Timeline Header & Snippet Tag */}
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 font-bold text-white/90">
            <Radio className={`w-3.5 h-3.5 ${isPlayingFull ? 'text-[#00e676] animate-pulse' : 'text-white/40'}`} />
            <span>Full Song Preview (30s)</span>
          </div>

          {/* Snippet Highlight Info Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00e676]/15 border border-[#00e676]/30 text-[11px] font-mono text-[#00e676]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-ping inline-block" />
            <span>Snippet Played: {formatTime(snippetStartSec)} - {formatTime(snippetEndSec)} ({snippetDuration}s)</span>
          </div>
        </div>

        {/* Interactive Waveform Display with Highlighted Snippet Region */}
        <div
          ref={waveformRef}
          onClick={handleSeek}
          id="reveal-waveform-container"
          className="relative h-14 w-full bg-[#16201b] rounded-xl overflow-hidden cursor-pointer flex items-center justify-between px-2 gap-1 group"
          title="Click to scrub anywhere in the track"
        >
          {/* Highlighted Snippet Area Overlay */}
          <div
            id="snippet-highlighted-overlay"
            className="absolute top-0 bottom-0 z-10 border-x-2 border-[#00e676] bg-[#00e676]/20 transition-all pointer-events-none"
            style={{
              left: `${snippetStartPercent}%`,
              width: `${snippetWidthPercent}%`,
              boxShadow: '0 0 15px rgba(0, 230, 118, 0.35)'
            }}
          >
            {/* Snippet Label Tag inside waveform */}
            <span className="absolute top-1 left-1 px-1 py-0.2 bg-black/80 text-[#00e676] text-[9px] font-mono font-bold rounded uppercase tracking-tighter">
              Snippet ({currentTier.label})
            </span>
          </div>

          {/* Waveform Bars */}
          {WAVEFORM_BAR_HEIGHTS.map((height, i) => {
            const barPercent = (i / WAVEFORM_BAR_HEIGHTS.length) * 100;
            const isInSnippet = barPercent >= snippetStartPercent && barPercent <= (snippetStartPercent + snippetWidthPercent);
            const isPastPlayhead = barPercent <= playheadPercent;

            // Height oscillation if playing
            const animScale = isPlayingFull ? 0.75 + Math.sin(Date.now() / 200 + i) * 0.25 : 1;
            const currentHeight = Math.max(15, height * animScale);

            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-150"
                style={{
                  height: `${currentHeight}%`,
                  backgroundColor: isPastPlayhead
                    ? activeColor
                    : isInSnippet
                    ? '#00e676'
                    : 'rgba(255, 255, 255, 0.2)',
                  opacity: isInSnippet ? 1 : 0.6
                }}
              />
            );
          })}

          {/* Real-time Playhead Scrubber */}
          <div
            id="reveal-playhead-line"
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_8px_#ffffff] pointer-events-none transition-all duration-75"
            style={{
              left: `${playheadPercent}%`
            }}
          >
            <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-white rounded-full border-2 border-black shadow" />
          </div>
        </div>

        {/* Timestamps & Play Controls */}
        <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-white/50">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFullAudio}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
            >
              {isPlayingFull ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{isPlayingFull ? 'Pause' : 'Play'}</span>
            </button>
            <span>{formatTime(currentPlaybackSec)} / 0:30</span>
          </div>

          <span className="text-[10px] text-white/40">
            {isCorrect ? `Identified in Tier ${playedStepIndex + 1} (${snippetDuration}s)` : 'Revealed full track'}
          </span>
        </div>
      </div>

      {/* Listen on Spotify direct link */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <a
          id="spotify-listen-link"
          href={`https://open.spotify.com/search/${encodeURIComponent(song.title + ' ' + song.artist)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1DB954]/15 hover:bg-[#1DB954]/25 border border-[#1DB954]/40 hover:border-[#1DB954] text-[#1DB954] hover:text-[#1ed760] text-xs font-bold rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
          title={`Open "${song.title}" by ${song.artist} on Spotify`}
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          <span>Listen on Spotify</span>
          <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
        </a>
      </div>

      {/* Running Score Bar */}
      <div className="text-xs font-mono font-bold tracking-wider mb-5" style={{ color: activeColor }}>
        {totalPoints} / {maxPossiblePoints} points
      </div>

      {/* Primary Action Buttons */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
        {/* Challenge a friend */}
        <button
          id="challenge-friend-btn"
          type="button"
          onClick={onChallengeFriend}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#161d19] border border-white/10 hover:border-white/30 hover:bg-[#1f2824] active:scale-95 text-white text-sm font-bold rounded-full transition-all cursor-pointer shadow-lg"
        >
          <Share2 className="w-4 h-4" />
          <span>Challenge your friend</span>
        </button>

        {/* Next Song / See Results */}
        <button
          id="next-round-btn"
          type="button"
          onClick={onNextRound}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-full text-black text-sm font-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xl"
          style={{
            backgroundColor: activeColor,
            boxShadow: `0 0 20px ${activeColor}40`,
          }}
        >
          <span>{isLastRound ? 'See results' : 'Next song'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Share result & Image Card buttons */}
      <div className="mt-4 flex items-center gap-3">
        {onOpenShareCard && (
          <button
            id="share-image-card-btn"
            type="button"
            onClick={onOpenShareCard}
            className="text-xs text-[#00e676] hover:text-[#26e886] font-bold flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00e676]/10 border border-[#00e676]/20 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Performance Card Image</span>
          </button>
        )}

        <button
          id="share-round-result-pill"
          onClick={handleShareResult}
          className="text-xs text-white/50 hover:text-white/90 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copiedShare ? 'Copied link!' : 'Copy Result Link'}</span>
        </button>
      </div>
    </div>
  );
};
