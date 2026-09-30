import type { ReadingStatus } from "@prisma/client";

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  WANT_TO_READ: "Want to read",
  READING: "Currently reading",
  READ: "Already read",
};

export const STATUS_SHORT: Record<ReadingStatus, string> = {
  WANT_TO_READ: "Want to read",
  READING: "Reading",
  READ: "Read",
};

export const STATUSES: ReadingStatus[] = ["READ", "READING", "WANT_TO_READ"];

const NEXT_STATUS: Record<ReadingStatus, ReadingStatus | null> = {
  WANT_TO_READ: "READING",
  READING: "READ",
  READ: null,
};

/** Shelves only move one step forward: Want to read, then Currently reading, then Read. */
export function isForwardStatusMove(from: ReadingStatus, to: ReadingStatus) {
  return from === to || NEXT_STATUS[from] === to;
}

export function coverUrl(coverId: number | null | undefined, size: "S" | "M" | "L" = "M") {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}
