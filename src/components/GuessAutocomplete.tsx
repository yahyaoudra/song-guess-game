import React, { useState, useEffect, useRef } from 'react';
import { Search, SkipForward, Flag, Music, Globe, Sparkles } from 'lucide-react';
import { Song, TitleDisplayMode } from '../types';
import { searchGlobalSongs } from '../utils/musicSearchApi';
import { getSongTitleDisplay } from '../utils/songTitles';

interface GuessAutocompleteProps {
  onGuess: (song: Song) => void;
  onSkip: () => void;
  disabled?: boolean;
  countryCode?: string;
  showArabicTitles?: boolean;
  titleDisplayMode: TitleDisplayMode;
  isLastStep?: boolean;
  nextStepLabel?: string;
}

export const GuessAutocomplete: React.FC<GuessAutocompleteProps> = ({
  onGuess,
  onSkip,
  disabled = false,
  countryCode = 'GLOBAL',
  showArabicTitles = true,
  titleDisplayMode,
  isLastStep = false,
  nextStepLabel
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayMode: TitleDisplayMode = titleDisplayMode;

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchGlobalSongs(query, countryCode);
        if (isMounted) {
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setSelectedIndex(0);
        }
      } catch (e) {
        console.error('Search error', e);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, countryCode]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSong = (song: Song) => {
    onGuess(song);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim() && suggestions.length > 0) {
        handleSelectSong(suggestions[0]);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        handleSelectSong(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="w-full max-w-lg mx-auto relative select-none">
      {/* Search & Skip Control Bar */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
            <Search className="w-4 h-4" />
          </div>

          <input
            ref={inputRef}
            id="guess-track-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              displayMode === 'original'
                ? "Search native title, artist, or script..."
                : displayMode === 'translated'
                ? "Search translated title, English meaning, or artist..."
                : "Name that song or artist..."
            }
            autoComplete="off"
            spellCheck="false"
            className="w-full pl-10 pr-4 py-3 bg-[#131a16] border border-white/10 rounded-full text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#00e676] focus:ring-1 focus:ring-[#00e676]/30 transition-all shadow-lg"
          />

          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <div className="w-4 h-4 border-2 border-white/20 border-t-[#00e676] rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Skip or Give Up Button */}
        <button
          id="skip-track-btn"
          onClick={onSkip}
          disabled={disabled}
          title={isLastStep ? "Give up and reveal this song" : "Skip to unlock a longer clip"}
          className={`flex w-full items-center justify-center gap-1.5 px-5 py-3 border active:scale-95 rounded-full text-sm font-semibold transition-all cursor-pointer shadow-lg disabled:opacity-50 sm:w-auto ${
            isLastStep
              ? 'bg-[#221316] border-red-500/40 text-red-300 hover:text-red-100 hover:border-red-400 hover:bg-red-950/40 shadow-red-950/30'
              : 'bg-[#131a16] border-white/10 hover:border-white/25 hover:bg-[#1a231e] text-white/80 hover:text-white'
          }`}
        >
          {isLastStep ? (
            <>
              <Flag className="w-4 h-4 text-red-400 fill-red-400/20" />
              <span>Give up</span>
            </>
          ) : (
            <>
              <SkipForward className="w-4 h-4" />
              <span>Skip {nextStepLabel ? `(${nextStepLabel})` : ''}</span>
            </>
          )}
        </button>
      </div>

      {/* Helper text caption */}
      <p className="text-center text-xs text-white/40 mt-2.5 font-sans">
        {isLastStep
          ? "Final snippet tier (15s). Make your guess or give up to reveal the answer."
          : "Press play, then type a song/artist name or skip to reveal a longer audio snippet."}
      </p>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          id="search-suggestions-dropdown"
          className="absolute left-0 right-0 top-0 -translate-y-[calc(100%+0.5rem)] bg-[#121815] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto backdrop-blur-xl sm:top-full sm:mt-2 sm:translate-y-0"
        >
          {suggestions.map((song, idx) => {
            const isSelected = idx === selectedIndex;
            const titleInfo = getSongTitleDisplay(song, displayMode);

            return (
              <button
                key={song.id + idx}
                id={`suggestion-item-${idx}`}
                onClick={() => handleSelectSong(song)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'
                }`}
              >
                {/* Artwork Thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1e2622] shrink-0 flex items-center justify-center border border-white/10">
                  {song.artworkUrl ? (
                    <img
                      src={song.artworkUrl}
                      alt={song.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <Music className="w-5 h-5 text-white/40" />
                  )}
                </div>

                {/* Song info with dynamic title mode rendering */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-white truncate">
                      {titleInfo.primaryTitle}
                    </span>
                    {titleInfo.secondaryTitle && (
                      <span className="text-xs text-white/50 truncate font-normal">
                        {titleInfo.secondaryTitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50 truncate mt-0.5">
                    <span className="text-white/70">{titleInfo.artistDisplay}</span>
                    <span>•</span>
                    <span>{song.genre}</span>
                    {titleInfo.badgeLabel && (
                      <>
                        <span>•</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-white/70 rounded">
                          {titleInfo.badgeLabel}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
