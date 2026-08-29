export const ARCHIVE_PAGE_SIZE = 12;

export type CompactPaginationItem = number | 'dots-left' | 'dots-right';

export function getArchivePageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

export function parseArchivePage(search: string): number {
  const rawPage = new URLSearchParams(search).get('page') || '1';
  const page = Number.parseInt(rawPage, 10);
  return Number.isFinite(page) && page > 1 ? page : 1;
}

export function getArchivePageFromLocation(basePath: string): number {
  if (typeof window === 'undefined') return 1;
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return path === basePath ? parseArchivePage(window.location.search) : 1;
}

export function pushArchivePage(basePath: string, page: number, replace = false): void {
  if (typeof window === 'undefined') return;
  const href = getArchivePageHref(basePath, page);
  if (replace) {
    window.history.replaceState({}, document.title, href);
  } else {
    window.history.pushState({}, document.title, href);
  }
}

export function getCompactPaginationItems(currentPage: number, totalPages: number): CompactPaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const visiblePages = new Set<number>([1, totalPages, safePage - 1, safePage, safePage + 1]);

  if (safePage <= 4) {
    [2, 3, 4, 5].forEach((page) => visiblePages.add(page));
  }

  if (safePage >= totalPages - 3) {
    [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1].forEach((page) => visiblePages.add(page));
  }

  const pages = Array.from(visiblePages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const items: CompactPaginationItem[] = [];
  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous > 1) {
      items.push(previous === 1 ? 'dots-left' : 'dots-right');
    }
    items.push(page);
  });

  return items;
}
