import React, { useState, useMemo, useEffect } from 'react';
import { X, Play, Flame, Music, Search, ExternalLink, LayoutGrid, List, MapPin, Mic2, Tags } from 'lucide-react';
import { QuizCollection, Song } from '../types';
import { QUIZ_COLLECTIONS } from '../data/quizCollections';
import { ALL_SONGS, DIFFICULTY_COLORS } from '../data/moroccanSongs';
import { COUNTRIES } from '../data/countries';

interface QuizCollectionModalProps {
  selectedCountryCode: string;
  onSelectCountryCode?: (code: string) => void;
  onSelectCollection: (collection: QuizCollection) => void;
  onClose: () => void;
}

type LibraryTab = 'countries' | 'artists' | 'genres';

const TAB_OPTIONS: Array<{
  id: LibraryTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'countries', label: 'Countries', icon: MapPin },
  { id: 'artists', label: 'Artists', icon: Mic2 },
  { id: 'genres', label: 'Genres', icon: Tags }
];

function getCollectionLibraryTab(collection: QuizCollection): LibraryTab {
  if (collection.id.startsWith('artist-')) return 'artists';
  if (collection.id.startsWith('genre-')) return 'genres';
  return 'countries';
}

function isCanonicalLibraryCollection(collection: QuizCollection): boolean {
  const tab = getCollectionLibraryTab(collection);
  if (tab === 'artists') return collection.id.endsWith('-artist-profile');
  if (tab === 'genres') return collection.id.startsWith('genre-global-') && collection.id.endsWith('-deep-library');
  return true;
}

function getDisplayTitle(collection: QuizCollection, tab: LibraryTab): string {
  if (tab === 'artists') {
    return collection.title.replace(/\s+Discography\s*&\s*Singles$/i, '');
  }
  if (tab === 'genres') {
    return collection.title.replace(/^Global\s+/i, '').replace(/\s+Deep Library$/i, '');
  }
  return collection.title;
}

export const QuizCollectionModal: React.FC<QuizCollectionModalProps> = ({
  selectedCountryCode,
  onSelectCountryCode,
  onSelectCollection,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('countries');
  const [filterCountry, setFilterCountry] = useState<string>(selectedCountryCode || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const songById = useMemo(() => new Map(ALL_SONGS.map((song) => [song.id, song])), []);
  const tabCounts = useMemo(() => {
    return QUIZ_COLLECTIONS.filter(isCanonicalLibraryCollection).reduce<Record<LibraryTab, number>>(
      (counts, collection) => {
        counts[getCollectionLibraryTab(collection)] += 1;
        return counts;
      },
      { countries: 0, artists: 0, genres: 0 }
    );
  }, []);

  useEffect(() => {
    if (selectedCountryCode) {
      setFilterCountry(selectedCountryCode);
    }
  }, [selectedCountryCode]);

  const categories = useMemo(() => {
    const baseCategories = QUIZ_COLLECTIONS
      .filter((collection) => getCollectionLibraryTab(collection) === activeTab && isCanonicalLibraryCollection(collection))
      .map((collection) => collection.category)
      .filter((category) => Boolean(category) && category !== 'Spotify Official');
    return ['All', 'Spotify Official', ...Array.from(new Set(baseCategories)).sort()];
  }, [activeTab]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [categories, selectedCategory]);

  const getCollectionSongs = (collection: QuizCollection): Song[] => (
    collection.songIds
      .map((songId) => songById.get(songId))
      .filter((song): song is Song => Boolean(song))
  );

  const filteredCollections = useMemo(() => {
    return QUIZ_COLLECTIONS.filter((col) => {
      const matchesTab = getCollectionLibraryTab(col) === activeTab;
      const matchesCanonical = isCanonicalLibraryCollection(col);

      const matchesCountry =
        activeTab !== 'countries'
          ? true
          : filterCountry === 'ALL'
          ? true
          : col.countryCode === filterCountry || (filterCountry === 'GLOBAL' && col.countryCode === 'GLOBAL');

      const matchesCategory =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Spotify Official'
          ? col.isOfficialSpotify
          : col.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
            (col.tags && col.tags.some(t => t.toLowerCase().includes(selectedCategory.toLowerCase())));

      const q = searchQuery.toLowerCase().trim();
      const songs = getCollectionSongs(col);
      const matchesSearch =
        !q ||
        getDisplayTitle(col, activeTab).toLowerCase().includes(q) ||
        col.title.toLowerCase().includes(q) ||
        (col.titleArabic && col.titleArabic.toLowerCase().includes(q)) ||
        (col.nativeTitle && col.nativeTitle.toLowerCase().includes(q)) ||
        col.description.toLowerCase().includes(q) ||
        col.category.toLowerCase().includes(q) ||
        (col.tags && col.tags.some((t) => t.toLowerCase().includes(q))) ||
        songs.some((song) => (
          song.title.toLowerCase().includes(q) ||
          song.artist.toLowerCase().includes(q) ||
          song.genre.toLowerCase().includes(q)
        ));

      return matchesTab && matchesCanonical && matchesCountry && matchesCategory && matchesSearch;
    });
  }, [activeTab, filterCountry, selectedCategory, searchQuery, songById]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterCountry, selectedCategory, searchQuery, viewMode]);

  const pageSize = viewMode === 'grid' ? 24 : 40;
  const totalPages = Math.max(1, Math.ceil(filteredCollections.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const visibleCollections = filteredCollections.slice(pageStart, pageStart + pageSize);

  const renderSongPreview = (songs: Song[], limit: number) => {
    const visibleSongs = songs.slice(0, limit);
    if (visibleSongs.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        {visibleSongs.map((song) => (
          <div key={song.id} className="flex min-w-0 items-center gap-1.5 text-[10px] text-white/50">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e676]/70 shrink-0" />
            <span className="truncate">
              <span className="text-white/70">{song.title}</span>
              <span className="text-white/35"> - {song.artist}</span>
            </span>
          </div>
        ))}
        {songs.length > visibleSongs.length && (
          <div className="text-[10px] font-mono text-[#00e676]/75">
            +{songs.length - visibleSongs.length} more included
          </div>
        )}
      </div>
    );
  };

  const handleSelectTab = (tab: LibraryTab) => {
    setActiveTab(tab);
    setSelectedCategory('All');
    if (tab !== 'countries') {
      setFilterCountry('ALL');
    } else {
      setFilterCountry(selectedCountryCode || 'ALL');
    }
  };

  const handleSelectPack = (collection: QuizCollection) => {
    onSelectCollection(collection);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden select-none">
      <div
        id="quiz-collections-modal"
        className="relative w-full max-w-5xl h-[94vh] max-h-[850px] bg-[#0c120f] border border-white/15 rounded-lg p-3 sm:p-6 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-3 shrink-0">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#00e676]/20 border border-[#00e676]/40 flex items-center justify-center text-[#00e676] shrink-0 text-lg sm:text-xl">
              🎵
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="text-base sm:text-2xl font-black text-white tracking-tight leading-tight">
                  <span className="sm:hidden">Packs</span>
                  <span className="hidden sm:inline">Global Playlists & Quizzes</span>
                </h2>
                <span className="shrink-0 text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-[#00e676]/20 border border-[#00e676]/40 text-[#00e676] font-mono font-bold">
                  {filteredCollections.length} Packs
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5 hidden sm:block">
                Choose any official Spotify playlist or country pack to play in Song Guess Game.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-[#151d18] border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#00e676] text-black font-bold' : 'text-white/50 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#00e676] text-black font-bold' : 'text-white/50 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              id="close-collections-modal-btn"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Library Tabs */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 py-3 border-b border-white/5 shrink-0">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex h-10 sm:h-11 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border px-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#00e676] bg-[#00e676] text-black shadow-lg shadow-[#00e676]/15'
                    : 'border-white/10 bg-[#141c17] text-white/65 hover:border-white/20 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label.slice(0, 8)}</span>
                <span className={`hidden sm:inline rounded-full px-1.5 py-0.5 text-[10px] font-mono ${
                  isActive ? 'bg-black/15 text-black' : 'bg-white/5 text-white/35'
                }`}>
                  {tabCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === 'countries' && (
          <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar border-b border-white/5 shrink-0 text-xs">
            <button
              onClick={() => {
                setFilterCountry('ALL');
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterCountry === 'ALL'
                  ? 'bg-[#00e676] text-black shadow-md'
                  : 'bg-[#141c17] text-white/70 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              <span>🌎</span>
              <span>All Countries</span>
            </button>

            {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setFilterCountry(c.code);
                if (onSelectCountryCode) onSelectCountryCode(c.code);
              }}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterCountry === c.code
                  ? 'bg-[#00e676] text-black shadow-md'
                  : 'bg-[#141c17] text-white/70 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.name}</span>
            </button>
            ))}
          </div>
        )}

        {/* Search & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 pb-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by artist, song, playlist name or genre..."
              className="w-full bg-[#131b16] border border-white/15 rounded-lg pl-10 pr-10 py-2 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00e676] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/50 hover:text-white px-1 py-0.5"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setSelectedCategory(selectedCategory === 'Spotify Official' ? 'All' : 'Spotify Official');
            }}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
              selectedCategory === 'Spotify Official'
                ? 'bg-[#1DB954] text-black font-black shadow-lg shadow-[#1DB954]/25'
                : 'bg-[#131b16] border border-[#1DB954]/50 text-[#1DB954] hover:bg-[#1DB954]/10'
            }`}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            <span className="sm:hidden">Spotify</span>
            <span className="hidden sm:inline">Official Spotify Playlists</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 py-1.5 overflow-x-auto no-scrollbar border-b border-white/5 shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? cat === 'Spotify Official'
                    ? 'bg-[#1DB954] text-black shadow-md'
                    : 'bg-[#00e676] text-black shadow-md'
                  : 'bg-[#141c17] text-white/70 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Scrollable Cards Area */}
        <div className="flex-1 min-h-0 overflow-y-auto pt-3 sm:pt-4 pr-1 pb-4">
          {filteredCollections.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-white/50">
              <Music className="w-10 h-10 mb-3 opacity-40 text-[#00e676]" />
              <p className="text-base font-bold text-white mb-1">No collections match your filter</p>
              <p className="text-xs text-white/50 max-w-sm mb-4">
                Try switching country or resetting filters.
              </p>
              <button
                onClick={() => {
                  setFilterCountry('ALL');
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-[#00e676] text-black font-black rounded-xl text-xs transition-transform active:scale-95 cursor-pointer shadow-md"
              >
                Reset All Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Responsive Grid with unconstrained cards */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {visibleCollections.map((col) => {
                const diffMeta = DIFFICULTY_COLORS[col.difficulty];
                const countryMeta = activeTab === 'countries' ? COUNTRIES.find((c) => c.code === col.countryCode) : null;
                const songs = getCollectionSongs(col);
                const displayTitle = getDisplayTitle(col, activeTab);

                return (
                  <div
                    key={col.id}
                    className="group relative flex flex-row gap-2.5 sm:gap-3.5 p-2.5 sm:p-3.5 bg-[#121915] hover:bg-[#18221c] border border-white/10 hover:border-[#00e676]/50 rounded-lg transition-all shadow-md min-h-[118px] sm:min-h-[145px]"
                  >
                    {/* Left: Thumbnail with badge */}
                    <div
                      onClick={() => handleSelectPack(col)}
                      className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-black/60 shrink-0 relative cursor-pointer border border-white/10 group-hover:border-[#00e676]/40 transition-colors my-auto"
                    >
                      <img
                        src={col.coverImage}
                        alt={displayTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      {col.isHot && (
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-orange-500 rounded-md text-[9px] font-black text-black flex items-center gap-1 shadow-md">
                          <Flame className="w-2.5 h-2.5 fill-black" />
                          <span>HOT</span>
                        </div>
                      )}
                      {col.isOfficialSpotify && (
                        <div className="absolute bottom-1.5 right-1.5 p-1 bg-[#1DB954] rounded-full text-black shadow-lg">
                          <svg className="w-3 h-3 fill-black" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Right: Info & Controls */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3
                            onClick={() => handleSelectPack(col)}
                            className="text-xs sm:text-base font-black text-white group-hover:text-[#00e676] transition-colors leading-tight cursor-pointer line-clamp-1"
                          >
                            {displayTitle}
                          </h3>
                        </div>
                        {col.titleArabic && (
                          <p className="text-[11px] text-[#00e676]/90 font-medium leading-tight mt-0.5" dir="rtl">
                            {col.titleArabic}
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs text-white/60 leading-relaxed mt-1 line-clamp-1 sm:line-clamp-2">
                          {col.description}
                        </p>
                        <div className="hidden sm:block">{renderSongPreview(songs, 4)}</div>
                      </div>

                      {/* Card Footer: Metadata & Buttons */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {countryMeta && (
                            <span className="text-xs mr-0.5" title={countryMeta.name}>
                              {countryMeta.flag}
                            </span>
                          )}
                          <span
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border"
                            style={{
                              backgroundColor: `${diffMeta.accent}20`,
                              borderColor: `${diffMeta.accent}40`,
                              color: diffMeta.accent
                            }}
                          >
                            {col.difficulty}
                          </span>
                          <span className="text-[10px] text-white/50 bg-white/5 px-1.5 py-0.5 rounded">
                            {songs.length || col.songsCount || col.songIds.length} songs
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {col.spotifyPlaylistUrl && (
                            <a
                              href={col.spotifyPlaylistUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-[#1DB954]/15 hover:bg-[#1DB954]/25 border border-[#1DB954]/40 hover:border-[#1DB954] rounded-lg text-[11px] font-bold text-[#1DB954] transition-colors cursor-pointer"
                              title="Open playlist in Spotify"
                            >
                              <span>Spotify</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          )}
                          <button
                            onClick={() => handleSelectPack(col)}
                            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 bg-[#00e676] hover:bg-[#1de980] text-black font-black rounded-lg text-[11px] transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            <span>Play</span>
                            <Play className="w-2.5 h-2.5 fill-current" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Detailed List View */
            <div className="flex flex-col space-y-2.5">
              {visibleCollections.map((col) => {
                const diffMeta = DIFFICULTY_COLORS[col.difficulty];
                const countryMeta = activeTab === 'countries' ? COUNTRIES.find((c) => c.code === col.countryCode) : null;
                const songs = getCollectionSongs(col);
                const songLine = songs.slice(0, 8).map((song) => `${song.title} - ${song.artist}`).join(', ');
                const displayTitle = getDisplayTitle(col, activeTab);

                return (
                  <div
                    key={col.id}
                    className="group relative flex items-center justify-between gap-3 p-3 bg-[#121915] hover:bg-[#18221c] border border-white/10 hover:border-[#00e676]/50 rounded-xl transition-all"
                  >
                    <div
                      onClick={() => handleSelectPack(col)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/60 shrink-0 relative border border-white/10">
                        <img
                          src={col.coverImage}
                          alt={col.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {countryMeta && <span>{countryMeta.flag}</span>}
                          <h3 className="text-sm font-bold text-white group-hover:text-[#00e676] truncate">
                            {displayTitle}
                          </h3>
                          {col.titleArabic && (
                            <span className="text-xs text-[#00e676]/90 font-medium hidden sm:inline" dir="rtl">
                              {col.titleArabic}
                            </span>
                          )}
                          {col.isHot && (
                            <span className="px-1.5 py-0.5 bg-orange-500 text-black text-[9px] font-black rounded">
                              HOT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 truncate max-w-lg mt-0.5">
                          {col.description}
                        </p>
                        {songLine && (
                          <p className="text-[11px] text-white/35 truncate max-w-2xl mt-1">
                            {songLine}{songs.length > 8 ? `, +${songs.length - 8} more` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border hidden sm:inline-block"
                        style={{
                          backgroundColor: `${diffMeta.accent}20`,
                          borderColor: `${diffMeta.accent}40`,
                          color: diffMeta.accent
                        }}
                      >
                        {col.difficulty}
                      </span>
                      <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded hidden sm:inline-block">
                        {songs.length || col.songsCount || col.songIds.length} tracks
                      </span>
                      {col.spotifyPlaylistUrl && (
                        <a
                          href={col.spotifyPlaylistUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-[#1DB954]/15 hover:bg-[#1DB954]/25 text-[#1DB954] border border-[#1DB954]/30"
                          title="Open in Spotify"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleSelectPack(col)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00e676] hover:bg-[#1de980] text-black font-black rounded-lg text-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <span>Play</span>
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {filteredCollections.length > pageSize && (
          <div className="shrink-0 border-t border-white/10 pt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
              className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-white/70 disabled:opacity-35 cursor-pointer"
            >
              Previous
            </button>
            <span className="rounded-lg border border-white/10 bg-[#131b16] px-3 py-2 font-mono text-white/55">
              Page {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
              className={`h-9 rounded-lg border px-3 font-black cursor-pointer ${
                safePage === totalPages
                  ? 'border-white/10 bg-white/5 text-white/35'
                  : 'border-[#00e676] bg-[#00e676] text-black hover:bg-[#1fe682]'
              }`}
            >
              Next
            </button>
            <span className="text-white/35 font-mono">
              {pageStart + 1}-{Math.min(pageStart + pageSize, filteredCollections.length)} of {filteredCollections.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
