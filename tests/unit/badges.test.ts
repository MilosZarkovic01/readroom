import { expect, test } from "vitest";
import {
  BADGES,
  parsePageCount,
  qualifyBadgeKeys,
  readUnlockedFromApi,
  type BadgeEntrySnapshot,
} from "../../src/lib/badges";

function entry(partial: Partial<BadgeEntrySnapshot>): BadgeEntrySnapshot {
  return {
    status: "WANT_TO_READ",
    rating: null,
    review: null,
    updatedAt: new Date("2026-03-15T12:00:00.000Z"),
    pageCount: null,
    ...partial,
  };
}

test("catalog has every listed badge once", () => {
  expect(BADGES).toHaveLength(18);
  expect(new Set(BADGES.map((badge) => badge.key)).size).toBe(18);
});

test("starts with no badges", () => {
  expect(qualifyBadgeKeys([])).toEqual([]);
});

test("unlocks reading, rating, and review milestones", () => {
  const keys = qualifyBadgeKeys([
    entry({ status: "READ", rating: 4, review: "Loved it" }),
  ]);
  expect(keys).toEqual(["first_chapter", "first_impression", "first_review"]);
});

test("unlocks long journey and page turner from stored page counts", () => {
  const keys = qualifyBadgeKeys([
    entry({ status: "READ", pageCount: 520 }),
    entry({ status: "READ", pageCount: 480 }),
  ]);
  expect(keys).toContain("long_journey");
  expect(keys).toContain("page_turner");
  expect(keys).not.toContain("getting_started");
});

test("ignores unread pages for long journey and page turner", () => {
  const keys = qualifyBadgeKeys([
    entry({ status: "READING", pageCount: 900 }),
    entry({ status: "WANT_TO_READ", pageCount: 1200 }),
  ]);
  expect(keys).not.toContain("long_journey");
  expect(keys).not.toContain("page_turner");
});

test("unlocks collector and marathon from shelves and finish months", () => {
  const want = Array.from({ length: 20 }, () => entry({ status: "WANT_TO_READ" }));
  const march = [
    entry({ status: "READ", updatedAt: new Date("2026-03-02T00:00:00.000Z") }),
    entry({ status: "READ", updatedAt: new Date("2026-03-12T00:00:00.000Z") }),
    entry({ status: "READ", updatedAt: new Date("2026-03-28T00:00:00.000Z") }),
  ];
  const keys = qualifyBadgeKeys([...want, ...march]);
  expect(keys).toContain("the_collector");
  expect(keys).toContain("book_marathon");
  expect(keys).toContain("first_chapter");
});

test("counts one review per library book and needs both rating and review for thoughtful reader", () => {
  const five = Array.from({ length: 5 }, (_, index) =>
    entry({
      status: "READ",
      rating: index === 0 ? null : 4,
      review: "Notes",
    }),
  );
  const keys = qualifyBadgeKeys(five);
  expect(keys).toContain("reviewer");
  expect(keys).not.toContain("thoughtful_reader");
  expect(keys).not.toContain("dedicated_reviewer");
});

test("reads newly unlocked badges from a library response", () => {
  const award = {
    key: "first_chapter",
    name: "First Chapter",
    description: "You finished your first book.",
    group: "reading",
    unlockedAt: "2026-09-27T10:00:00.000Z",
  };
  expect(readUnlockedFromApi({ unlocked: [award] })).toEqual([award]);
  expect(readUnlockedFromApi({ error: "nope" })).toEqual([]);
});

test("parsePageCount keeps only positive finite counts", () => {
  expect(parsePageCount(412)).toBe(412);
  expect(parsePageCount("318")).toBe(318);
  expect(parsePageCount(0)).toBeNull();
  expect(parsePageCount(-12)).toBeNull();
  expect(parsePageCount("pages")).toBeNull();
});
