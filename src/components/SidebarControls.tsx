import React, { useState } from 'react';
import { CreditCard, Flame, Gamepad2, Languages, Mic2, ShieldCheck, Sparkles, Sliders, Tags, Volume2, VolumeX } from 'lucide-react';
import { Difficulty, StreakData, ThemeColor, TitleDisplayMode } from '../types';
import { DIFFICULTY_COLORS } from '../data/moroccanSongs';
import { COUNTRIES } from '../data/countries';
import { audioEngine } from '../utils/audioPlayer';

interface SidebarControlsProps {
  difficulty: Difficulty;
  onOpenCountrySelector: () => void;
  selectedCountryCode: string;
  onNewRandomGame?: () => void;
  volume: number;
  onVolumeChange: (newVol: number) => void;
  streakData: StreakData;
  titleDisplayMode: TitleDisplayMode;
  onTitleDisplayModeChange: (mode: TitleDisplayMode) => void;
  themeOverride?: ThemeColor | 'auto';
  activeChallengeType?: 'artist' | 'genre' | null;
  activeChallengeTitle?: string;
  isUnlocked?: boolean;
  accessUntil?: string;
  isAuthenticated?: boolean;
  stripeConfigured?: boolean;
  onOpenAuth?: () => void;
  onOpenPaywall?: () => void;
  onUnlock?: () => void;
  onOpenMultiplayer?: () => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  difficulty,
  onOpenCountrySelector,
  selectedCountryCode,
  onNewRandomGame,
  volume,
  onVolumeChange,
  streakData,
  titleDisplayMode,
  onTitleDisplayModeChange,
  themeOverride = 'auto',
  activeChallengeType = null,
  activeChallengeTitle,
  isUnlocked = false,
  accessUntil,
  isAuthenticated = false,
  stripeConfigured = false,
  onOpenAuth,
  onOpenPaywall,
  onUnlock,
  onOpenMultiplayer
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume || 0.85);

  const activeCountry = COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];

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

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = parseFloat(event.target.value);
    audioEngine.setVolume(nextVolume);
    onVolumeChange(nextVolume);
  };

  const handleToggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      audioEngine.setVolume(0);
      onVolumeChange(0);
    } else {
      const restore = prevVolume > 0 ? prevVolume : 0.85;
      audioEngine.setVolume(restore);
      onVolumeChange(restore);
    }
  };

  return (
    <>
      {/* Mobile Quick Action Toggle Button */}
      <button
        id="mobile-sidebar-toggle-btn"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed bottom-4 right-4 z-40 lg:hidden w-12 h-12 rounded-full bg-[#161d19] border border-white/15 text-white flex items-center justify-center shadow-2xl active:scale-95 cursor-pointer backdrop-blur-md"
        aria-label="Toggle game controls"
      >
        <Sliders className="w-5 h-5 text-[#00e676]" />
      </button>

      {/* Main Sidebar Container */}
      <aside
        id="game-sidebar"
        className={`fixed right-0 w-72 lg:w-60 p-4 flex flex-col gap-4 select-none transition-transform duration-300 ${
          isMobileOpen
            ? 'inset-y-0 z-50 translate-x-0 bg-[#0d120f]/95 border-l border-white/10 backdrop-blur-xl h-full'
            : 'top-24 bottom-20 z-20 h-auto overflow-y-auto translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden flex items-center justify-between pb-2 border-b border-white/10">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Game Controls</span>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="text-xs text-white/50 hover:text-white px-2 py-1 cursor-pointer"
          >
            Close ✕
          </button>
        </div>

        {/* 1. Music Scene / Challenge Context */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-mono font-bold tracking-widest text-white/40 uppercase">
            {activeChallengeType ? 'CHALLENGE' : 'MUSIC SCENE'}
          </span>

          {activeChallengeType ? (
            <div className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-[#141c17] border border-white/10 shadow-sm text-left">
              <span className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-white shrink-0">
                {activeChallengeType === 'artist' ? (
                  <Mic2 className="w-4 h-4 text-yellow-300" />
                ) : (
                  <Tags className="w-4 h-4 text-cyan-300" />
                )}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {activeChallengeTitle || (activeChallengeType === 'artist' ? 'Artist game' : 'Genre game')}
                </div>
                <div className="text-[10px] text-white/40 truncate">
                  {activeChallengeType === 'artist' ? 'Artist discography' : 'Genre playlist'}
                </div>
              </div>
            </div>
          ) : (
            <button
              id="sidebar-country-btn"
              onClick={() => {
                onOpenCountrySelector();
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#141c17] hover:bg-[#1b2620] border border-white/10 hover:border-[#00e676]/50 transition-all cursor-pointer group shadow-sm text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl select-none leading-none">{activeCountry.flag}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#00e676] transition-colors truncate">
                    {activeCountry.name}
                  </div>
                  <div className="text-[10px] text-white/40 truncate">
                    {activeCountry.popularGenres.slice(0, 2).join(', ')}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#00e676] px-2 py-0.5 rounded-full bg-[#00e676]/10 shrink-0">
                Change
              </span>
            </button>
          )}
        </div>

        {/* 2. Shuffle New Songs */}
        {onNewRandomGame && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-white/40 uppercase">
              QUICK ACTIONS
            </span>
            <button
              id="shuffle-new-game-btn"
              onClick={() => {
                onNewRandomGame();
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#17211c] hover:bg-[#202e27] border border-white/10 hover:border-[#00e676]/50 rounded-xl text-xs font-bold text-white transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00e676]" />
              <span>Shuffle New Tracks</span>
            </button>
          </div>
        )}

        {/* 3. Unlock & Multiplayer */}
        <div className="p-3 bg-[#111714] border border-[#00e676]/20 rounded-xl flex flex-col gap-2 shadow-[0_0_20px_rgba(0,230,118,0.05)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              {isUnlocked ? (
                <ShieldCheck className="w-4 h-4 text-[#00e676]" />
              ) : (
                <CreditCard className="w-4 h-4 text-[#00e676]" />
              )}
              <span>{isUnlocked ? 'Unlimited active' : 'Play unlimited'}</span>
            </div>
            <span className="rounded-full bg-[#00e676]/10 px-2 py-0.5 text-[9px] font-black text-[#00e676]">
              NO ADS
            </span>
          </div>
          <ul className="space-y-1 text-[10px] text-white/45">
            <li>All artists</li>
            <li>All countries</li>
            <li>All genres and no ads</li>
          </ul>
          {accessUntil && (
            <p className="text-[10px] text-white/40">
              Access until {new Date(accessUntil).toLocaleDateString()}
            </p>
          )}
          {!isUnlocked && (
            <button
              onClick={() => {
                if (onOpenPaywall) {
                  onOpenPaywall();
                } else if (!isAuthenticated || !stripeConfigured) {
                  onOpenAuth?.();
                } else {
                  onUnlock?.();
                }
                setIsMobileOpen(false);
              }}
              className="mt-1 h-9 w-full rounded-lg bg-[#00e676] text-xs font-black text-black hover:bg-[#1fe682] active:scale-95"
            >
              Unlock unlimited
            </button>
          )}
        </div>

        {onOpenMultiplayer && (
          <button
            onClick={() => {
              onOpenMultiplayer();
              setIsMobileOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#17211c] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:border-[#00e676]/50 hover:bg-[#202e27] active:scale-95"
          >
            <Gamepad2 className="h-3.5 w-3.5 text-[#00e676]" />
            <span>Multiplayer</span>
          </button>
        )}

        {/* 4. Audio & Platform Badge */}
        <div className="p-3 bg-[#111714] border border-white/5 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-white/60">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 fill-[#1DB954]" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <span>Spotify sync</span>
            </div>
            <span className="text-[9px] font-mono tracking-tighter text-[#1DB954] uppercase font-bold">
              DIRECT STREAM
            </span>
          </div>
          <p className="text-[10px] text-white/40 leading-tight">
            High-fidelity instant snippets with exact snippet durations.
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#111714] p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
              <Flame className={`h-3.5 w-3.5 ${streakData.currentStreak > 0 ? 'fill-amber-300' : ''}`} />
              <span>{streakData.currentStreak || 0} {streakData.currentStreak === 1 ? 'day' : 'days'}</span>
            </div>
            <span className="text-[10px] font-mono text-white/35">
              Best {streakData.bestStreak || 0}
            </span>
          </div>

          <div id="sidebar-volume-controller" className="flex items-center gap-2 rounded-full border border-white/10 bg-[#141c17] px-3 py-2">
            <button
              id="sidebar-volume-mute-btn"
              onClick={handleToggleMute}
              className="text-white/60 transition-colors hover:text-white"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4 text-red-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-[#00e676]" />
              )}
            </button>

            <input
              id="sidebar-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleSliderChange}
              className="h-1.5 min-w-0 flex-1 appearance-none rounded-lg bg-[#1f2a24] cursor-pointer"
              style={{ accentColor: activeColor }}
              title={`Volume: ${Math.round(volume * 100)}%`}
            />

            <span className="w-7 text-right font-mono text-[10px] text-white/50">
              {Math.round(volume * 100)}%
            </span>
          </div>

          <div className="mt-3 border-t border-white/5 pt-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-white/50">
              <Languages className="h-3.5 w-3.5 text-[#00e676]" />
              <span>Title mode</span>
            </div>
            <div id="title-display-mode-selector" className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-[#141c17] p-1">
              {([
                ['both', 'Dual'],
                ['romanized', 'Latin'],
                ['original', 'Original'],
                ['translated', 'Translate']
              ] as Array<[TitleDisplayMode, string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onTitleDisplayModeChange(mode)}
                  className={`h-7 rounded-md text-[10px] font-black transition-colors ${
                    titleDisplayMode === mode ? 'bg-[#00e676] text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`}
                  title={`Use ${label} title mode`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
