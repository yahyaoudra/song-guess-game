import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Music2, Search, Sparkles } from 'lucide-react';
import { PublicRuntimeConfig } from '../adminTypes';
import { QuizCollection } from '../types';
import { getGenreChallenges } from '../utils/challengeCatalog';
import { getRuntimeCustomPacks, getCollectionSongs } from '../utils/customCatalog';
import { getDecadePath, getGenrePath, getThemePath } from '../utils/runtimeConfig';
import {
  ARCHIVE_PAGE_SIZE,
  getArchivePageFromLocation,
  getArchivePageHref,
  getCompactPaginationItems,
  pushArchivePage
} from '../utils/archivePagination';

type BrowserMode = 'genres' | 'decades' | 'themes';

interface GenreBrowserPageProps {
  mode?: BrowserMode;
  publicConfig: PublicRuntimeConfig;
  onOpenGenre: (slug: string) => void;
  onOpenCollection?: (collection: QuizCollection) => void;
}

const DECADE_SLUGS = new Set(['70s', '80s', '90s', '2000s', '2010s', '2020s']);

function getModeConfig(mode: BrowserMode) {
  if (mode === 'decades') {
    return {
      basePath: '/play/decade',
      eyebrow: 'Play by decade',
      title: 'Decade Song Guess Games',
      intro: 'Choose an era and play a focused song quiz from short audio snippets.',
      placeholder: 'Search decades...',
      button: 'Play Decade',
      icon: CalendarDays,
      pathForSlug: getDecadePath
    };
  }
  if (mode === 'themes') {
    return {
      basePath: '/play/theme',
      eyebrow: 'Play by theme',
      title: 'Theme Song Guess Games',
      intro: 'Choose a manually curated theme pack for holidays, movies, moods, and special music challenges.',
      placeholder: 'Search themes...',
      button: 'Play Theme',
      icon: Sparkles,
      pathForSlug: getThemePath
    };
  }
  return {
    basePath: '/play/genre',
    eyebrow: 'Play by genre',
    title: 'Genre Song Guess Games',
    intro: 'Pick a genre like K-Pop, Bollywood, American rap, country, Afrobeats, Reggaeton, and more.',
    placeholder: 'Search genres...',
    button: 'Play Genre',
    icon: Music2,
    pathForSlug: getGenrePath
  };
}

export const GenreBrowserPage: React.FC<GenreBrowserPageProps> = ({
  mode: selectedMode = 'genres',
  publicConfig,
  onOpenGenre,
  onOpenCollection
}) => {
  const mode: BrowserMode = selectedMode === 'decades' || selectedMode === 'themes' ? selectedMode : 'genres';
  const modeConfig = getModeConfig(mode);
  const [query, setQuery] = useState('');
  const didMountRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(() => getArchivePageFromLocation(modeConfig.basePath));

  const rows = useMemo(() => {
    const staticRows = getGenreChallenges()
      .filter((genre) => (mode === 'decades' ? DECADE_SLUGS.has(genre.slug) : mode === 'genres' ? !DECADE_SLUGS.has(genre.slug) : false))
      .map((genre) => ({
        key: `static-${genre.slug}`,
        slug: genre.slug,
        title: genre.name,
        description: genre.description,
        category: mode === 'decades' ? 'Decade' : 'Genre',
        coverImage: genre.coverImage,
        songsCount: genre.songsCount,
        keywords: genre.keywords,
        collection: null as QuizCollection | null
      }));

    const customRows = getRuntimeCustomPacks(publicConfig)
      .filter((pack) => {
        if (mode === 'genres') return pack.packType === 'genre';
        if (mode === 'decades') return pack.packType === 'decade';
        return pack.packType === 'theme';
      })
      .map((pack) => {
        const songs = getCollectionSongs(pack);
        return {
          key: pack.id,
          slug: pack.genreSlug || pack.id,
          title: pack.genreName || pack.title,
          description: pack.description,
          category: pack.category,
          coverImage: pack.coverImage || songs[0]?.artworkUrl || '',
          songsCount: songs.length || pack.songsCount || pack.songIds.length,
          keywords: pack.tags || [],
          collection: pack as QuizCollection
        };
      });

    const seen = new Set<string>();
    return [...staticRows, ...customRows].filter((row) => {
      const key = `${row.slug}-${row.title}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [mode, publicConfig]);

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return rows;
    return rows.filter((row) => (
      row.title.toLowerCase().includes(cleanQuery) ||
      row.description.toLowerCase().includes(cleanQuery) ||
      row.category.toLowerCase().includes(cleanQuery) ||
      row.keywords.some((keyword) => keyword.toLowerCase().includes(cleanQuery))
    ));
  }, [query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ARCHIVE_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ARCHIVE_PAGE_SIZE;
  const visibleRows = filteredRows.slice(pageStart, pageStart + ARCHIVE_PAGE_SIZE);
  const paginationItems = useMemo(
    () => getCompactPaginationItems(safePage, totalPages),
    [safePage, totalPages]
  );
  const Icon = modeConfig.icon;

  const handlePageLink = (event: React.MouseEvent<HTMLAnchorElement>, page: number) => {
    event.preventDefault();
    const nextPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(nextPage);
    pushArchivePage(modeConfig.basePath, nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpen = (row: (typeof rows)[number]) => {
    if (row.collection && onOpenCollection) {
      onOpenCollection(row.collection);
      return;
    }
    onOpenGenre(row.slug);
  };

  useEffect(() => {
    const handlePopState = () => setCurrentPage(getArchivePageFromLocation(modeConfig.basePath));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [modeConfig.basePath]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setCurrentPage(1);
    pushArchivePage(modeConfig.basePath, 1, true);
  }, [modeConfig.basePath, query]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
    pushArchivePage(modeConfig.basePath, totalPages, true);
  }, [currentPage, modeConfig.basePath, totalPages]);

  return (
    <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-6 text-white selection:bg-[#00e676] selection:text-black sm:px-8">
      <section className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#00e676]">{modeConfig.eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{modeConfig.title}</h1>
        <p className="mt-3 max-w-2xl text-white/55">{modeConfig.intro}</p>

        <div className="relative mt-6 max-w-lg">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={modeConfig.placeholder}
            className="h-14 w-full rounded-lg border border-white/12 bg-white/[0.055] pl-12 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#00e676]/70"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleRows.map((row) => (
          <article
            key={row.key}
            className="group overflow-hidden rounded-lg border border-white/10 bg-[#101713] transition-colors hover:border-[#00e676]/55"
          >
            <div className="relative h-36">
              {row.coverImage && (
                <img
                  src={row.coverImage}
                  alt={row.title}
                  className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-85"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#101713] to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00e676] text-black">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-mono text-xs text-white/60">{row.songsCount} tracks</span>
              </div>
            </div>

            <div className="p-5">
              <h2 className="text-2xl font-black">{row.title}</h2>
              <p className="mt-2 min-h-[48px] text-xs leading-relaxed text-white/55">{row.description}</p>
              <a
                href={modeConfig.pathForSlug(row.slug)}
                onClick={(event) => {
                  event.preventDefault();
                  handleOpen(row);
                }}
                className="mt-5 flex h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-[#00e676] text-sm font-black text-black hover:bg-[#1fe682]"
              >
                {modeConfig.button}
              </a>
            </div>
          </article>
        ))}
      </section>

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
          <a
            href={getArchivePageHref(modeConfig.basePath, Math.max(1, safePage - 1))}
            onClick={(event) => handlePageLink(event, safePage - 1)}
            aria-disabled={safePage === 1}
            className={`flex h-10 items-center rounded-lg border border-white/10 bg-white/5 px-4 font-bold text-white/70 ${
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
                  href={getArchivePageHref(modeConfig.basePath, item)}
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
                  className="flex h-10 min-w-8 items-center justify-center rounded-lg font-mono text-xs font-black text-white/35"
                  aria-hidden="true"
                >
                  ...
                </span>
              )
            ))}
          </div>
          <a
            href={getArchivePageHref(modeConfig.basePath, Math.min(totalPages, safePage + 1))}
            onClick={(event) => handlePageLink(event, safePage + 1)}
            aria-disabled={safePage === totalPages}
            className={`flex h-10 items-center rounded-lg border px-4 font-black ${
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
