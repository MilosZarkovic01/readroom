import { expect, test } from "vitest";
import {
  computeGoalProgress,
  finishedAtFor,
  goalTitle,
  MAX_ACTIVE_GOALS,
  motivationLine,
  validateGoalInput,
  type GoalEntrySnapshot,
  type GoalRecord,
} from "../../src/lib/goals";

const now = new Date("2026-06-15T12:00:00.000Z");

function goal(partial: Partial<GoalRecord>): GoalRecord {
  return {
    type: "BOOK_COUNT",
    target: 4,
    bookId: null,
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    endsAt: null,
    completedAt: null,
    ...partial,
  };
}

function read(bookId: string, finishedAt: string, pageCount: number | null = null): GoalEntrySnapshot {
  return { bookId, status: "READ", finishedAt: new Date(finishedAt), pageCount };
}

const context = {
  activeCount: 0,
  openBookIds: new Set(["book-open"]),
  activeBookIds: new Set<string>(),
  now,
};

test("counts finished books inside the goal window only", () => {
  const entries = [
    read("a", "2025-12-31T23:00:00.000Z"),
    read("b", "2026-02-01T00:00:00.000Z"),
    read("c", "2026-05-01T00:00:00.000Z"),
    { bookId: "d", status: "READING" as const, finishedAt: null, pageCount: 300 },
  ];
  const progress = computeGoalProgress(goal({}), entries, now);
  expect(progress).toMatchObject({ current: 2, target: 4, percent: 50, done: false, expired: false });
});

test("respects the end of the window", () => {
  const entries = [read("a", "2026-02-01T00:00:00.000Z"), read("b", "2026-04-01T00:00:00.000Z")];
  const progress = computeGoalProgress(
    goal({ endsAt: new Date("2026-03-01T00:00:00.000Z"), target: 2 }),
    entries,
    now,
  );
  expect(progress.current).toBe(1);
  expect(progress.expired).toBe(true);
  expect(progress.daysLeft).toBeNull();
});

test("sums page counts for page goals and caps progress at the target", () => {
  const entries = [
    read("a", "2026-02-01T00:00:00.000Z", 400),
    read("b", "2026-03-01T00:00:00.000Z", null),
    read("c", "2026-04-01T00:00:00.000Z", 700),
  ];
  const progress = computeGoalProgress(goal({ type: "PAGE_COUNT", target: 1000 }), entries, now);
  expect(progress).toMatchObject({ current: 1000, percent: 100, done: true });
});

test("completes a book goal when that book is finished in the window", () => {
  const bookGoal = goal({ type: "BOOK", target: null, bookId: "dune" });
  expect(computeGoalProgress(bookGoal, [read("other", "2026-03-01T00:00:00.000Z")], now).done).toBe(false);
  expect(computeGoalProgress(bookGoal, [read("dune", "2026-03-01T00:00:00.000Z")], now).done).toBe(true);
});

test("a completed goal stays done even if progress later drops", () => {
  const progress = computeGoalProgress(goal({ completedAt: new Date("2026-05-01T00:00:00.000Z") }), [], now);
  expect(progress).toMatchObject({ done: true, percent: 100, expired: false });
});

test("reports days left until the deadline", () => {
  const progress = computeGoalProgress(goal({ endsAt: new Date("2026-06-25T12:00:00.000Z") }), [], now);
  expect(progress.daysLeft).toBe(10);
});

test("keeps the original finish date when an entry stays read", () => {
  const first = new Date("2026-01-10T00:00:00.000Z");
  expect(finishedAtFor(null, "READ", now)).toEqual(now);
  expect(finishedAtFor({ status: "READING", finishedAt: null }, "READ", now)).toEqual(now);
  expect(finishedAtFor({ status: "READ", finishedAt: first }, "READ", now)).toEqual(first);
  expect(finishedAtFor({ status: "READ", finishedAt: first }, "WANT_TO_READ", now)).toBeNull();
});

test("writes motivating copy for each stage", () => {
  const base = { current: 0, target: 10, percent: 0, done: false, expired: false, daysLeft: null };
  expect(motivationLine("BOOK_COUNT", base)).toBe("Fresh start, 10 books to go");
  expect(motivationLine("BOOK_COUNT", { ...base, current: 5, percent: 50 })).toBe("Halfway there, 5 books to go");
  expect(motivationLine("PAGE_COUNT", { ...base, current: 800, target: 1000, percent: 80, daysLeft: 12 })).toBe(
    "Almost there, 200 pages to go · 12 days left",
  );
  expect(motivationLine("BOOK_COUNT", { ...base, done: true, percent: 100 })).toBe("Goal reached!");
  expect(motivationLine("BOOK_COUNT", { ...base, current: 3, expired: true })).toBe("Ended at 3 books");
});

test("titles goals by type", () => {
  expect(goalTitle({ type: "BOOK", target: null, bookTitle: "Dune" })).toBe("Finish Dune");
  expect(goalTitle({ type: "BOOK_COUNT", target: 1, bookTitle: null })).toBe("Read 1 book");
  expect(goalTitle({ type: "PAGE_COUNT", target: 5000, bookTitle: null })).toBe("Read 5,000 pages");
});

test("validates count goals", () => {
  expect(validateGoalInput({ type: "BOOK_COUNT", target: 12 }, context)).toMatchObject({
    ok: true,
    value: { type: "BOOK_COUNT", target: 12, bookId: null, startsAt: now, endsAt: null },
  });
  expect(validateGoalInput({ type: "BOOK_COUNT", target: 0 }, context).ok).toBe(false);
  expect(validateGoalInput({ type: "BOOK_COUNT", target: 1001 }, context).ok).toBe(false);
  expect(validateGoalInput({ type: "PAGE_COUNT", target: 2.5 }, context).ok).toBe(false);
  expect(validateGoalInput({ type: "PAGE_COUNT", target: 1_000_000 }, context).ok).toBe(true);
  expect(validateGoalInput({ type: "NOPE", target: 3 }, context).ok).toBe(false);
});

test("validates book goals against open shelves", () => {
  expect(validateGoalInput({ type: "BOOK", bookId: "book-open" }, context).ok).toBe(true);
  expect(validateGoalInput({ type: "BOOK", bookId: "book-read" }, context).ok).toBe(false);
  expect(
    validateGoalInput({ type: "BOOK", bookId: "book-open" }, { ...context, activeBookIds: new Set(["book-open"]) }).ok,
  ).toBe(false);
});

test("validates the timeframe", () => {
  const ok = validateGoalInput(
    { type: "BOOK_COUNT", target: 3, startsAt: "2026-06-01T00:00:00.000Z", endsAt: "2026-06-30T23:59:59.999Z" },
    context,
  );
  expect(ok.ok).toBe(true);
  expect(
    validateGoalInput({ type: "BOOK_COUNT", target: 3, startsAt: "2026-06-10", endsAt: "2026-06-05" }, context).ok,
  ).toBe(false);
  expect(validateGoalInput({ type: "BOOK_COUNT", target: 3, endsAt: "2026-06-01" }, context).ok).toBe(false);
  expect(validateGoalInput({ type: "BOOK_COUNT", target: 3, endsAt: "not a date" }, context).ok).toBe(false);
});

test("limits the number of active goals", () => {
  const result = validateGoalInput({ type: "BOOK_COUNT", target: 3 }, { ...context, activeCount: MAX_ACTIVE_GOALS });
  expect(result).toEqual({ ok: false, error: `You can have up to ${MAX_ACTIVE_GOALS} active goals.` });
});
