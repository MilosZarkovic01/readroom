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

export function coverUrl(coverId: number | null | undefined, size: "S" | "M" | "L" = "M") {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}
