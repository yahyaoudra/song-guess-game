import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Play, Search } from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { QUIZ_COLLECTIONS } from '../data/quizCollections';
import { getCountryPath } from '../utils/runtimeConfig';
import {
  ARCHIVE_PAGE_SIZE,
  getArchivePageFromLocation,
  getArchivePageHref,
  getCompactPaginationItems,
  pushArchivePage
} from '../utils/archivePagination';

interface CountryBrowserPageProps {
  onOpenCountry: (countryCode: string) => void;
}

export const CountryBrowserPage: React.FC<CountryBrowserPageProps> = ({
  onOpenCountry
}) => {
  const basePath = '/play/country';
  const [query, setQuery] = useState('');
  const didMountRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(() => getArchivePageFromLocation(basePath));

  const packCounts = useMemo(() => {
    const counts = new Map<string, number>();
    QUIZ_COLLECTIONS.forEach((collection) => {
      counts.set(collection.countryCode, (counts.get(collection.countryCode) || 0) + 1);
    });
    counts.set('GLOBAL', QUIZ_COLLECTIONS.length);
    return counts;
  }, []);

  const filteredCountries = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return COUNTRIES;
    return COUNTRIES.filter((country) => (
      country.name.toLowerCase().includes(cleanQuery) ||
      country.code.toLowerCase().includes(cleanQuery) ||
      country.popularGenres.some((genre) => genre.toLowerCase().includes(cleanQuery))
    ));
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredCountries.length / ARCHIVE_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ARCHIVE_PAGE_SIZE;
  const visibleCountries = filteredCountries.slice(pageStart, pageStart + ARCHIVE_PAGE_SIZE);
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
    <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-16 text-white selection:bg-[#00e676] selection:text-black">
      <section className="mb-7">
        <p className="text-xs font-mono uppercase tracking-[0.28em] text-[#00e676]">Play by country</p>
        <div className="mt-2 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Browse Countries</h1>
            <p className="mt-3 text-white/55 max-w-2xl">
              Choose a music scene and start the country Heardle challenge.
            </p>
          </div>

          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search countries or genres..."
              className="w-full h-12 rounded-lg bg-white/[0.055] border border-white/12 focus:border-[#00e676]/70 outline-none pl-12 pr-4 text-sm text-white placeholder:text-white/35"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleCountries.map((country) => (
          <article
            key={country.code}
            className="group rounded-lg border border-white/10 bg-[#101713]/95 p-5 hover:border-[#00e676]/55 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-4xl leading-none">{country.flag}</span>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black truncate">{country.name}</h2>
                    <p className="text-[11px] font-mono text-white/40">{getCountryPath(country.code)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {country.popularGenres.slice(0, 4).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white/60"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-[#00e676]/25 bg-[#00e676]/10 px-2.5 py-2 text-center">
                <MapPin className="w-4 h-4 text-[#00e676] mx-auto mb-1" />
                <span className="block text-[10px] font-mono font-black text-[#00e676]">
                  {packCounts.get(country.code) || 0}
                </span>
              </div>
            </div>

            <a
              href={getCountryPath(country.code)}
              onClick={(event) => {
                event.preventDefault();
                onOpenCountry(country.code);
              }}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00e676] text-sm font-black text-black hover:bg-[#1fe682] active:scale-[0.99] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              Play Country
            </a>
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
