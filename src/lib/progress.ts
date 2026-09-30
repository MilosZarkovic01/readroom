export const MAX_PAGES = 100_000;

export type LatestLog = { id: string; page: number; pagesRead: number } | null;

export type ProgressPlan =
  | { kind: "create"; page: number; pagesRead: number }
  | { kind: "update"; id: string; page: number; pagesRead: number }
  | { kind: "none" };

/**
 * Moving back within the pages of the latest update is treated as a correction of that
 * update; moving back further (e.g. starting a re-read) records the new page without
 * counting any pages.
 */
export function planProgressUpdate(latest: LatestLog, nextPage: number): ProgressPlan {
  const current = latest?.page ?? 0;
  if (nextPage === current) return { kind: "none" };
  if (nextPage > current) return { kind: "create", page: nextPage, pagesRead: nextPage - current };
  if (latest && latest.pagesRead > 0) {
    const start = latest.page - latest.pagesRead;
    if (nextPage >= start) {
      return { kind: "update", id: latest.id, page: nextPage, pagesRead: nextPage - start };
    }
  }
  return { kind: "create", page: nextPage, pagesRead: 0 };
}

export function parsePage(value: unknown, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const page = Number(value);
  if (!Number.isInteger(page) || page < 0 || page > max) return null;
  return page;
}

/** A reader's edition total wins over the shared catalog count. The catalog value stays unchanged. */
export function entryPageCount(entry: { pageCountOverride: number | null; book: { pageCount: number | null } }) {
  return entry.pageCountOverride ?? entry.book.pageCount;
}

export function progressPercent(currentPage: number | null, pageCount: number | null) {
  if (!currentPage || !pageCount) return 0;
  return Math.min(100, Math.round((currentPage / pageCount) * 100));
}
