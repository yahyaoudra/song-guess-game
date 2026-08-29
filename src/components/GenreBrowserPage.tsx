import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Music2, Search } from 'lucide-react';
import { getGenreChallenges } from '../utils/challengeCatalog';
import { getGenrePath } from '../utils/runtimeConfig';
import {
  ARCHIVE_PAGE_SIZE,
  getArchivePageFromLocation,
  getArchivePageHref,
  getCompactPaginationItems,
  pushArchivePage
} from '../utils/archivePagination';

interface GenreBrowserPageProps {
  onOpenGenre: (slug: string) => void;
}

export const GenreBrowserPage: React.FC<GenreBrowserPageProps> = ({
  onOpenGenre
}) => {
  const basePath = '/play/genre';
  const [query, setQuery] = useState('');
  const didMountRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(() => getArchivePageFromLocation(basePath));
  const genres = useMemo(() => getGenreChallenges(), []);
  const filteredGenres = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return genres;
    return genres.filter((genre) => (
      genre.name.toLowerCase().includes(cleanQuery) ||
      genre.description.toLowerCase().includes(cleanQuery) ||
      genre.keywords.some((keyword) => keyword.includes(cleanQuery))
    ));
  }, [genres, query]);
  const totalPages = Math.max(1, Math.ceil(filteredGenres.length / ARCHIVE_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ARCHIVE_PAGE_SIZE;
  const visibleGenres = filteredGenres.slice(pageStart, pageStart + ARCHIVE_PAGE_SIZE);
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
  }, [query]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
    pushArchivePage(basePath, totalPages, true);
  }, [currentPage, totalPages]);

  return (
    <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-16 text-white selection:bg-[#00e676] selection:text-black">
        <section className="mb-8">
          <p className="text-xs font-mono uppercase tracking-[0.28em] text-[#00e676]">Play by genre</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-black tracking-tight">Genre Song Guess Games</h1>
          <p className="mt-3 text-white/55 max-w-2xl">
            Pick a genre or era like K-Pop, Bollywood, American rap, country, 80s, 90s, Afrobeats, Reggaeton, and more.
          </p>

          <div className="relative mt-6 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search genres or eras..."
              className="w-full h-14 rounded-lg bg-white/[0.055] border border-white/12 focus:border-[#00e676]/70 outline-none pl-12 pr-4 text-sm text-white placeholder:text-white/35"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleGenres.map((genre) => (
            <article
              key={genre.slug}
              className="group rounded-lg border border-white/10 bg-[#101713] overflow-hidden hover:border-[#00e676]/55 transition-colors"
            >
              <div className="h-36 relative">
                <img
                  src={genre.coverImage}
                  alt={genre.name}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101713] to-transparent" />
                <div className="absolute left-4 bottom-4 flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-[#00e676] text-black flex items-center justify-center">
                    <Music2 className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-mono text-white/60">{genre.songsCount} tracks</span>
                </div>
              </div>

              <div className="p-5">
                <h2 className="text-2xl font-black">{genre.name}</h2>
                <p className="mt-2 text-xs text-white/55 leading-relaxed min-h-[48px]">
                  {genre.description}
                </p>
                <a
                  href={getGenrePath(genre.slug)}
                  onClick={(event) => {
                    event.preventDefault();
                    onOpenGenre(genre.slug);
                  }}
                  className="mt-5 flex w-full h-11 items-center justify-center rounded-lg bg-[#00e676] hover:bg-[#1fe682] text-black font-black text-sm cursor-pointer"
                >
                  Play Genre
                </a>
              </div>
            </article>
          ))}
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
                      ? 'border-[#00e676] bg-[#101713] text-[#00e676]'
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
