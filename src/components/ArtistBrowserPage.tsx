import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Search, Star } from 'lucide-react';
import { getArtistChallenges, orderArtistsByFeaturedPriority } from '../utils/challengeCatalog';
import { getArtistPath } from '../utils/runtimeConfig';
import { ArtistRequestResponse, RequestedArtist, SpotifyArtistSuggestion } from '../adminTypes';
import { searchSpotifyArtists } from '../utils/authApi';
import { ALL_SONGS } from '../data/moroccanSongs';
import { Song } from '../types';
import {
  ARCHIVE_PAGE_SIZE,
  getArchivePageFromLocation,
  getArchivePageHref,
  getCompactPaginationItems,
  pushArchivePage
} from '../utils/archivePagination';

const spotifySuffixPattern = /-[a-z0-9]{8}$/;

function baseArtistSlug(slug: string): string {
  return slug.replace(spotifySuffixPattern, '');
}

interface ArtistBrowserPageProps {
  onOpenArtist: (slug: string) => void;
  requestedArtists?: RequestedArtist[];
  onRequestArtist?: (artistName: string, spotifyArtistId?: string, spotifyArtistImageUrl?: string) => Promise<ArtistRequestResponse>;
}

interface ArtistBrowserCard {
  slug: string;
  name: string;
  songIds: string[];
  songs?: Song[];
  songsCount: number;
  countryCodes: string[];
  coverImage: string;
}

export const ArtistBrowserPage: React.FC<ArtistBrowserPageProps> = ({
  onOpenArtist,
  requestedArtists = [],
  onRequestArtist
}) => {
  const basePath = '/artist';
  const [query, setQuery] = useState('');
  const [requestStatus, setRequestStatus] = useState<'idle' | 'searching' | 'building' | 'queued' | 'done'>('idle');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const [spotifySuggestions, setSpotifySuggestions] = useState<SpotifyArtistSuggestion[]>([]);
  const [selectedSpotifyArtist, setSelectedSpotifyArtist] = useState<SpotifyArtistSuggestion | null>(null);
  const didMountRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(() => getArchivePageFromLocation(basePath));
  const songById = useMemo(() => new Map(ALL_SONGS.map((song) => [song.id, song])), []);
  const artists = useMemo(() => {
    const baseArtists = getArtistChallenges();
    const persistedArtists = requestedArtists
      .filter((artist) => artist.status === 'ready' && artist.songsCount > 0)
      .map((artist) => ({
        slug: artist.slug,
        name: artist.name,
        songIds: artist.songIds,
        songs: artist.songs || [],
        songsCount: artist.songsCount,
        countryCodes: ['GLOBAL'],
        coverImage: artist.coverImage
      } satisfies ArtistBrowserCard));
    const rebuiltBaseSlugs = new Set(persistedArtists.map((artist) => baseArtistSlug(artist.slug)));
    return orderArtistsByFeaturedPriority([
      ...persistedArtists,
      ...baseArtists.filter((artist) => !rebuiltBaseSlugs.has(artist.slug))
    ]) as ArtistBrowserCard[];
  }, [requestedArtists]);

  const getArtistSongs = (artist: ArtistBrowserCard): Song[] => {
    if (artist.songs?.length) return artist.songs;
    return artist.songIds
      .map((songId) => songById.get(songId))
      .filter((song): song is Song => Boolean(song));
  };

  const renderCoverStrip = (songs: Song[]) => {
    const covers = Array.from(new Map(songs.map((song) => [song.artworkUrl, song])).values()).slice(0, 6);
    if (covers.length === 0) return null;
    return (
      <div className="mt-4 flex items-center gap-1.5">
        {covers.map((song) => (
          <img
            key={`${song.id}-${song.artworkUrl}`}
            src={song.artworkUrl}
            alt=""
            className="h-8 w-8 rounded-md border border-white/10 object-cover"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>
    );
  };
  const filteredArtists = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return artists;
    return artists.filter((artist) => artist.name.toLowerCase().includes(cleanQuery));
  }, [artists, query]);
  const totalPages = Math.max(1, Math.ceil(filteredArtists.length / ARCHIVE_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ARCHIVE_PAGE_SIZE;
  const visibleArtists = filteredArtists.slice(pageStart, pageStart + ARCHIVE_PAGE_SIZE);
  const paginationItems = useMemo(
    () => getCompactPaginationItems(safePage, totalPages),
    [safePage, totalPages]
  );

  const handlePageLink = (event: React.MouseEvent<HTMLAnchorElement>, page: number) => {
    event.preventDefault();
    const nextPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(nextPage);
    pushArchivePage(basePath, nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const shouldShowSpotifySearch = query.trim().length >= 2 && filteredArtists.length === 0;
  const handleRequestArtist = async (artistToBuild = selectedSpotifyArtist) => {
    if (!artistToBuild || !onRequestArtist) return;
    setSelectedSpotifyArtist(artistToBuild);
    setRequestStatus('building');
    setRequestError(null);
    setRequestNotice(null);
    try {
      const result = await onRequestArtist(artistToBuild.name, artistToBuild.id, artistToBuild.imageUrl);
      const artist = result.artist;
      if (result.queued || artist.status === 'queued' || artist.status === 'pending') {
        setRequestStatus('queued');
        setRequestNotice(result.message || `${artist.name} has been added to the queue. We will email you when it is ready to play.`);
        return;
      }
      setRequestStatus('done');
      onOpenArtist(artist.slug);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not request artist');
      setRequestStatus('idle');
    }
  };

  useEffect(() => {
    const handlePopState = () => setCurrentPage(getArchivePageFromLocation(basePath));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setCurrentPage(1);
    pushArchivePage(basePath, 1, true);
    setSelectedSpotifyArtist(null);
    setRequestError(null);
    setRequestNotice(null);
    setRequestStatus('idle');
  }, [query]);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!shouldShowSpotifySearch) {
      setSpotifySuggestions([]);
      return;
    }
    let cancelled = false;
    setRequestStatus('searching');
    const timeout = window.setTimeout(() => {
      searchSpotifyArtists(cleanQuery)
        .then((artists) => {
          if (cancelled) return;
          setSpotifySuggestions(artists);
          setRequestStatus('idle');
        })
        .catch((error) => {
          if (cancelled) return;
          setSpotifySuggestions([]);
          setRequestError(error instanceof Error ? error.message : 'Could not search Spotify artists');
          setRequestStatus('idle');
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, shouldShowSpotifySearch]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
    pushArchivePage(basePath, totalPages, true);
  }, [currentPage, totalPages]);

  return (
    <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-16 text-white selection:bg-yellow-300 selection:text-black">
        <section className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Browse all artists</h1>
          <p className="mt-3 text-white/55 text-base sm:text-lg">
            Search all {artists.length} artist games and choose your next challenge.
          </p>

          <div className="relative mt-8 mx-auto max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search artists..."
              className="w-full h-16 rounded-lg bg-white/[0.055] border border-white/12 focus:border-yellow-300/70 outline-none pl-14 pr-5 text-lg text-white placeholder:text-white/35 shadow-2xl"
            />
          </div>
        </section>

        {shouldShowSpotifySearch && (
          <section className="mx-auto mb-8 max-w-6xl rounded-lg border border-[#00e676]/25 bg-[#101713] p-4 sm:p-5 shadow-2xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Choose the exact Spotify artist</h2>
                <p className="mt-1 text-sm text-white/55">
                  Select the right match first. Song Guess will only add the artist after the Spotify pack is fully built.
                </p>
              </div>
              {requestStatus === 'searching' && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin text-[#00e676]" />
                  Searching Spotify
                </div>
              )}
            </div>
            {requestError && (
              <p className="mt-3 rounded-lg border border-red-400/25 bg-red-400/10 p-2 text-xs text-red-100">{requestError}</p>
            )}
            {requestNotice && (
              <p className="mt-3 rounded-lg border border-[#00e676]/25 bg-[#00e676]/10 p-3 text-sm font-bold text-[#b8ffd7]">{requestNotice}</p>
            )}
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {spotifySuggestions.map((artist) => {
                const selected = selectedSpotifyArtist?.id === artist.id;
                return (
                  <div
                    key={artist.id}
                    className={`group relative grid min-h-28 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 rounded-lg border p-3 text-left transition-all sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:p-4 ${
                      selected
                        ? 'border-[#00e676] bg-[#00e676]/10 shadow-[0_0_0_1px_rgba(0,230,118,0.25)]'
                        : 'border-white/12 bg-white/[0.045] hover:border-[#00e676]/55 hover:bg-white/[0.075]'
                    }`}
                  >
                    <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-black/35 sm:h-[88px] sm:w-[88px]">
                      {artist.imageUrl ? (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-black text-white/30">
                          {artist.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-lg font-black text-white sm:text-xl">{artist.name}</span>
                        {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00e676]" />}
                      </div>
                      {artist.spotifyUrl && (
                        <a
                          href={artist.spotifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-xs font-black text-[#00e676] hover:text-[#35ff98] sm:text-sm"
                        >
                          <span className="truncate">Spotify profile</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRequestArtist(artist)}
                      disabled={requestStatus === 'building' || !onRequestArtist}
                      className="hidden h-10 min-w-20 shrink-0 items-center justify-center rounded-lg bg-[#00e676] px-4 text-sm font-black text-black hover:bg-[#1fe682] disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
                    >
                      {requestStatus === 'building' && selected ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : 'Play'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestArtist(artist)}
                      disabled={requestStatus === 'building' || !onRequestArtist}
                      className="inline-flex h-9 min-w-16 shrink-0 items-center justify-center rounded-lg bg-[#00e676] px-3 text-xs font-black text-black hover:bg-[#1fe682] disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
                    >
                      {requestStatus === 'building' && selected ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : 'Play'}
                    </button>
                  </div>
                );
              })}
            </div>
            {requestStatus !== 'searching' && spotifySuggestions.length === 0 && (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-center text-sm text-white/55">
                No Spotify artists found for this search.
              </div>
            )}
            {requestStatus === 'building' && selectedSpotifyArtist && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#00e676]/25 bg-[#00e676]/10 px-4 py-2 text-sm font-black text-[#b8ffd7]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Building {selectedSpotifyArtist.name} pack before opening the game...
              </div>
            )}
            {requestStatus === 'queued' && selectedSpotifyArtist && (
              <div className="mt-5 rounded-lg border border-[#00e676]/25 bg-[#00e676]/10 px-4 py-3 text-sm font-black text-[#b8ffd7]">
                {selectedSpotifyArtist.name} is queued. Keep browsing; we will email you with a Play Now link when the Spotify pack is ready.
              </div>
            )}
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleArtists.map((artist, index) => {
            const songs = getArtistSongs(artist);
            const songCount = songs.length || artist.songsCount || artist.songIds.length;
            const previewLine = songs.slice(0, 4).map((song) => song.title).join(' • ');

            return (
              <article
                key={artist.slug}
                className="overflow-hidden rounded-lg border border-yellow-500/65 bg-[#252318] shadow-[0_18px_55px_rgba(245,180,0,0.14)]"
              >
                <div className="relative h-60 bg-[#171717]">
                  <img
                    src={artist.coverImage || songs[0]?.artworkUrl}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#252318] via-transparent to-transparent" />
                  {pageStart + index < 9 && (
                    <div className="absolute left-5 top-5 w-11 h-11 rounded-lg bg-yellow-300 text-black flex items-center justify-center shadow-xl">
                      <Star className="w-5 h-5 fill-black" />
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4 rounded-lg border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
                    {songCount} songs
                  </div>
                </div>

                <div className="p-7">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h2 className="text-3xl font-black text-yellow-200 drop-shadow-sm truncate">
                      {artist.name}
                    </h2>
                  </div>
                  {renderCoverStrip(songs)}
                  {previewLine && (
                    <p className="mt-3 min-h-[2.25rem] text-xs leading-relaxed text-white/45 line-clamp-2">
                      {previewLine}{songs.length > 4 ? ` • +${songs.length - 4} more` : ''}
                    </p>
                  )}
                  <a
                    href={getArtistPath(artist.slug)}
                    onClick={(event) => {
                      event.preventDefault();
                      onOpenArtist(artist.slug);
                    }}
                    className="mt-6 flex w-full h-14 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-black text-base cursor-pointer"
                  >
                    Play Heardle
                  </a>
                  <div className="mt-5 text-center text-white/35">
                    <p className="text-sm">Choose your mode on the next page</p>
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                      <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5">Daily Challenge</span>
                      <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5">Practice Mode</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
            <a
              href={getArchivePageHref(basePath, Math.max(1, safePage - 1))}
              onClick={(event) => handlePageLink(event, safePage - 1)}
              aria-disabled={safePage === 1}
              className={`h-10 rounded-lg border border-white/10 bg-white/5 px-4 font-bold text-white/70 flex items-center ${
                safePage === 1 ? 'pointer-events-none opacity-35' : 'hover:bg-white/10'
              }`}
            >
              Previous
            </a>
            <div className="flex max-w-[52vw] items-center gap-1 px-1">
              {paginationItems.map((item) => (
                typeof item === 'number' ? (
                <a
                  key={item}
                  href={getArchivePageHref(basePath, item)}
                  onClick={(event) => handlePageLink(event, item)}
                  aria-current={safePage === item ? 'page' : undefined}
                  className={`flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 font-mono text-xs font-black ${
                    safePage === item
                      ? 'border-yellow-300 bg-[#19170f] text-yellow-200'
                      : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item}
                </a>
                ) : (
                  <span
                    key={item}
                    className="flex h-10 min-w-8 items-center justify-center rounded-lg text-white/35 font-mono text-xs font-black"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                )
              ))}
            </div>
            <a
              href={getArchivePageHref(basePath, Math.min(totalPages, safePage + 1))}
              onClick={(event) => handlePageLink(event, safePage + 1)}
              aria-disabled={safePage === totalPages}
              className={`h-10 rounded-lg border px-4 font-black flex items-center ${
                safePage === totalPages
                  ? 'pointer-events-none border-white/10 bg-white/5 text-white/35'
                  : 'border-[#00e676] bg-[#00e676] text-black hover:bg-[#1fe682]'
              }`}
            >
              Next
            </a>
          </nav>
        )}
    </main>
  );
};
