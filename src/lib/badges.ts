export type BadgeKey =
  | "first_chapter"
  | "getting_started"
  | "well_read"
  | "bookworm"
  | "avid_reader"
  | "bibliophile"
  | "first_impression"
  | "first_review"
  | "reviewer"
  | "critic"
  | "literary_voice"
  | "book_critic"
  | "thoughtful_reader"
  | "the_collector"
  | "long_journey"
  | "dedicated_reviewer"
  | "book_marathon"
  | "page_turner";

export type BadgeDefinition = {
  key: BadgeKey;
  name: string;
  description: string;
  group: "reading" | "review" | "special";
};

export const BADGES: BadgeDefinition[] = [
  {
    key: "first_chapter",
    name: "First Chapter",
    description: "You finished your first book.",
    group: "reading",
  },
  {
    key: "getting_started",
    name: "Getting Started",
    description: "Five books finished.",
    group: "reading",
  },
  {
    key: "well_read",
    name: "Well Read",
    description: "Ten books finished.",
    group: "reading",
  },
  {
    key: "bookworm",
    name: "Bookworm",
    description: "Twenty-five books finished.",
    group: "reading",
  },
  {
    key: "avid_reader",
    name: "Avid Reader",
    description: "Fifty books finished.",
    group: "reading",
  },
  {
    key: "bibliophile",
    name: "Bibliophile",
    description: "One hundred books finished.",
    group: "reading",
  },
  {
    key: "first_impression",
    name: "First Impression",
    description: "You rated a book.",
    group: "review",
  },
  {
    key: "first_review",
    name: "First Review",
    description: "You wrote a review.",
    group: "review",
  },
  {
    key: "reviewer",
    name: "Reviewer",
    description: "Five reviews written.",
    group: "review",
  },
  {
    key: "critic",
    name: "Critic",
    description: "Ten reviews written.",
    group: "review",
  },
  {
    key: "literary_voice",
    name: "Literary Voice",
    description: "Twenty-five reviews written.",
    group: "review",
  },
  {
    key: "book_critic",
    name: "Book Critic",
    description: "Fifty reviews written.",
    group: "review",
  },
  {
    key: "thoughtful_reader",
    name: "Thoughtful Reader",
    description: "You rated and reviewed five books.",
    group: "review",
  },
  {
    key: "the_collector",
    name: "The Collector",
    description: "Twenty titles on your want-to-read shelf.",
    group: "special",
  },
  {
    key: "long_journey",
    name: "Long Journey",
    description: "You finished a book of 500+ pages.",
    group: "special",
  },
  {
    key: "dedicated_reviewer",
    name: "Dedicated Reviewer",
    description: "Reviews on ten different books.",
    group: "special",
  },
  {
    key: "book_marathon",
    name: "Book Marathon",
    description: "Three finishes in one calendar month.",
    group: "special",
  },
  {
    key: "page_turner",
    name: "Page Turner",
    description: "You have read 1,000 pages.",
    group: "special",
  },
];

export type BadgeEntrySnapshot = {
  status: "WANT_TO_READ" | "READING" | "READ";
  rating: number | null;
  review: string | null;
  updatedAt: Date;
  pageCount: number | null;
};

function hasReview(review: string | null) {
  return Boolean(review?.trim());
}

function yearMonth(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function qualifyBadgeKeys(entries: BadgeEntrySnapshot[]): BadgeKey[] {
  const read = entries.filter((entry) => entry.status === "READ");
  const readCount = read.length;
  const ratedCount = entries.filter((entry) => entry.rating != null).length;
  const reviewedCount = entries.filter((entry) => hasReview(entry.review)).length;
  const ratedAndReviewedCount = entries.filter(
    (entry) => entry.rating != null && hasReview(entry.review),
  ).length;
  const wantCount = entries.filter((entry) => entry.status === "WANT_TO_READ").length;
  const longJourney = read.some((entry) => (entry.pageCount ?? 0) >= 500);
  const pagesRead = read.reduce((sum, entry) => sum + (entry.pageCount ?? 0), 0);
  const monthCounts = new Map<string, number>();
  for (const entry of read) {
    const key = yearMonth(entry.updatedAt);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const marathon = [...monthCounts.values()].some((count) => count >= 3);

  const earned: BadgeKey[] = [];
  if (readCount >= 1) earned.push("first_chapter");
  if (readCount >= 5) earned.push("getting_started");
  if (readCount >= 10) earned.push("well_read");
  if (readCount >= 25) earned.push("bookworm");
  if (readCount >= 50) earned.push("avid_reader");
  if (readCount >= 100) earned.push("bibliophile");
  if (ratedCount >= 1) earned.push("first_impression");
  if (reviewedCount >= 1) earned.push("first_review");
  if (reviewedCount >= 5) earned.push("reviewer");
  if (reviewedCount >= 10) earned.push("critic");
  if (reviewedCount >= 25) earned.push("literary_voice");
  if (reviewedCount >= 50) earned.push("book_critic");
  if (ratedAndReviewedCount >= 5) earned.push("thoughtful_reader");
  if (wantCount >= 20) earned.push("the_collector");
  if (longJourney) earned.push("long_journey");
  if (reviewedCount >= 10) earned.push("dedicated_reviewer");
  if (marathon) earned.push("book_marathon");
  if (pagesRead >= 1000) earned.push("page_turner");
  return earned;
}

export function parsePageCount(value: unknown): number | null {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return null;
  return Math.round(count);
}
