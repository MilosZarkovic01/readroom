import { expect, test } from "vitest";
import {
  computeGoalProgress,
  finishedAtFor,
  goalsToCelebrate,
  goalTitle,
  MAX_ACTIVE_GOALS,
  motivationLine,
  validateGoalInput,
  type GoalEntrySnapshot,
  type GoalLogSnapshot,
  type GoalRecord,
  type GoalView,
} from "../../src/lib/goals";

const now = new Date("2026-06-15T12:00:00.000Z");

function goal(partial: Partial<GoalRecord>): GoalRecord {
  const startsAt = partial.startsAt ?? new Date("2026-01-01T00:00:00.000Z");
  return {
    type: "BOOK_COUNT",
    period: "TOTAL",
    timeZone: "UTC",
    target: 4,
    bookId: null,
    startsAt,
    createdAt: startsAt,
    endsAt: null,
    completedAt: null,
    ...partial,
  };
}

function read(bookId: string, finishedAt: string): GoalEntrySnapshot {
  return { bookId, status: "READ", finishedAt: new Date(finishedAt) };
}

function log(createdAt: string, pagesRead: number): GoalLogSnapshot {
  return { createdAt: new Date(createdAt), pagesRead };
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
    { bookId: "d", status: "READING" as const, finishedAt: null },
  ];
  const progress = computeGoalProgress(goal({}), entries, [], now);
  expect(progress).toMatchObject({ current: 2, target: 4, percent: 50, done: false, expired: false });
});

test("respects the end of the window", () => {
  const entries = [read("a", "2026-02-01T00:00:00.000Z"), read("b", "2026-04-01T00:00:00.000Z")];
  const progress = computeGoalProgress(
    goal({ endsAt: new Date("2026-03-01T00:00:00.000Z"), target: 2 }),
    entries,
    [],
    now,
  );
  expect(progress.current).toBe(1);
  expect(progress.expired).toBe(true);
  expect(progress.daysLeft).toBeNull();
});

test("ignores pages logged before the goal was created", () => {
  const daily = goal({
    type: "PAGE_COUNT",
    period: "DAILY",
    target: 20,
    startsAt: new Date("2026-06-15T00:00:00.000Z"),
    createdAt: new Date("2026-06-15T10:00:00.000Z"),
  });
  const logs = [log("2026-06-15T08:00:00.000Z", 107), log("2026-06-15T11:30:00.000Z", 8)];
  const progress = computeGoalProgress(daily, [], logs, now);
  expect(progress).toMatchObject({
    current: 8,
    target: 20,
    percent: 40,
    done: false,
    metThisPeriod: false,
  });
  expect(motivationLine("PAGE_COUNT", progress, "DAILY")).toBe("12 pages to go today");
});

test("ignores books finished before the goal was created", () => {
  const yearly = goal({
    type: "BOOK_COUNT",
    target: 4,
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
  });
  const entries = [read("early", "2026-03-01T00:00:00.000Z"), read("after", "2026-06-10T00:00:00.000Z")];
  const progress = computeGoalProgress(yearly, entries, [], now);
  expect(progress).toMatchObject({ current: 1, target: 4, done: false });
});

test("sums logged pages for page goals and caps progress at the target", () => {
  const logs = [
    log("2025-12-20T00:00:00.000Z", 500),
    log("2026-02-01T00:00:00.000Z", 400),
    log("2026-03-01T00:00:00.000Z", 0),
    log("2026-04-01T00:00:00.000Z", 700),
  ];
  const progress = computeGoalProgress(goal({ type: "PAGE_COUNT", target: 1000 }), [], logs, now);
  expect(progress).toMatchObject({ current: 1000, percent: 100, done: true });
});

test("completes a book goal when that book is finished in the window", () => {
  const bookGoal = goal({ type: "BOOK", target: null, bookId: "dune" });
  expect(computeGoalProgress(bookGoal, [read("other", "2026-03-01T00:00:00.000Z")], [], now).done).toBe(false);
  expect(computeGoalProgress(bookGoal, [read("dune", "2026-03-01T00:00:00.000Z")], [], now).done).toBe(true);
});

test("a completed goal stays done even if progress later drops", () => {
  const progress = computeGoalProgress(goal({ completedAt: new Date("2026-05-01T00:00:00.000Z") }), [], [], now);
  expect(progress).toMatchObject({ done: true, percent: 100, expired: false });
});

test("reports days left until the deadline", () => {
  const progress = computeGoalProgress(goal({ endsAt: new Date("2026-06-25T12:00:00.000Z") }), [], [], now);
  expect(progress.daysLeft).toBe(10);
});

test("daily page goals track today's pages and the running streak", () => {
  const daily = goal({ type: "PAGE_COUNT", period: "DAILY", target: 20, startsAt: new Date("2026-06-10T00:00:00.000Z") });
  const logs = [
    log("2026-06-12T08:00:00.000Z", 25),
    log("2026-06-13T20:00:00.000Z", 12),
    log("2026-06-13T21:00:00.000Z", 10),
    log("2026-06-14T09:00:00.000Z", 30),
    log("2026-06-15T07:00:00.000Z", 8),
  ];
  const progress = computeGoalProgress(daily, [], logs, now);
  expect(progress).toMatchObject({
    current: 8,
    target: 20,
    percent: 40,
    done: false,
    metThisPeriod: false,
    streak: 3,
    bestStreak: 3,
  });
  expect(motivationLine("PAGE_COUNT", progress, "DAILY")).toBe("12 pages to go today · keep your 3-day streak going");

  const met = computeGoalProgress(daily, [], [...logs, log("2026-06-15T11:00:00.000Z", 15)], now);
  expect(met).toMatchObject({ current: 20, metThisPeriod: true, streak: 4 });
  expect(motivationLine("PAGE_COUNT", met, "DAILY")).toBe("Done for today!");
});

test("daily goals use the reader's time zone for day boundaries", () => {
  const daily = goal({
    type: "PAGE_COUNT",
    period: "DAILY",
    timeZone: "Europe/Belgrade",
    target: 10,
    startsAt: new Date("2026-06-01T00:00:00.000Z"),
  });
  const late = new Date("2026-06-15T22:30:00.000Z");
  const progress = computeGoalProgress(daily, [], [log("2026-06-15T21:45:00.000Z", 10)], late);
  expect(progress.current).toBe(0);
  const utc = computeGoalProgress({ ...daily, timeZone: "UTC" }, [], [log("2026-06-15T21:45:00.000Z", 10)], late);
  expect(utc.current).toBe(10);
});

test("weekly book goals count books finished since Monday", () => {
  const weekly = goal({ type: "BOOK_COUNT", period: "WEEKLY", target: 2 });
  const entries = [read("a", "2026-06-14T12:00:00.000Z"), read("b", "2026-06-15T08:00:00.000Z")];
  const progress = computeGoalProgress(weekly, entries, [], now);
  expect(progress).toMatchObject({ current: 1, target: 2, metThisPeriod: false });
});

test("expired recurring goals report their best streak", () => {
  const daily = goal({
    type: "PAGE_COUNT",
    period: "DAILY",
    target: 5,
    startsAt: new Date("2026-06-01T00:00:00.000Z"),
    endsAt: new Date("2026-06-05T23:59:59.999Z"),
  });
  const logs = [log("2026-06-02T10:00:00.000Z", 5), log("2026-06-03T10:00:00.000Z", 6)];
  const progress = computeGoalProgress(daily, [], logs, now);
  expect(progress).toMatchObject({ expired: true, streak: 0, bestStreak: 2 });
  expect(motivationLine("PAGE_COUNT", progress, "DAILY")).toBe("Ended · best streak 2 days");
});

test("keeps the original finish date when an entry stays read", () => {
  const first = new Date("2026-01-10T00:00:00.000Z");
  expect(finishedAtFor(null, "READ", now)).toEqual(now);
  expect(finishedAtFor({ status: "READING", finishedAt: null }, "READ", now)).toEqual(now);
  expect(finishedAtFor({ status: "READ", finishedAt: first }, "READ", now)).toEqual(first);
  expect(finishedAtFor({ status: "READ", finishedAt: first }, "WANT_TO_READ", now)).toBeNull();
});

test("writes motivating copy for each stage", () => {
  const base = {
    current: 0,
    target: 10,
    percent: 0,
    done: false,
    expired: false,
    daysLeft: null,
    metThisPeriod: false,
    streak: 0,
    bestStreak: 0,
  };
  expect(motivationLine("BOOK_COUNT", base)).toBe("Fresh start, 10 books to go");
  expect(motivationLine("BOOK_COUNT", { ...base, current: 5, percent: 50 })).toBe("Halfway there, 5 books to go");
  expect(motivationLine("PAGE_COUNT", { ...base, current: 800, target: 1000, percent: 80, daysLeft: 12 })).toBe(
    "Almost there, 200 pages to go · 12 days left",
  );
  expect(motivationLine("BOOK_COUNT", { ...base, done: true, percent: 100 })).toBe("Goal reached!");
  expect(motivationLine("BOOK_COUNT", { ...base, current: 3, expired: true })).toBe("Ended at 3 books");
});

test("titles goals by type and period", () => {
  expect(goalTitle({ type: "BOOK", target: null, bookTitle: "Dune" })).toBe("Finish Dune");
  expect(goalTitle({ type: "BOOK_COUNT", target: 1, bookTitle: null })).toBe("Read 1 book");
  expect(goalTitle({ type: "PAGE_COUNT", target: 5000, bookTitle: null })).toBe("Read 5,000 pages");
  expect(goalTitle({ type: "PAGE_COUNT", period: "DAILY", target: 20, bookTitle: null })).toBe("Read 20 pages per day");
  expect(goalTitle({ type: "BOOK_COUNT", period: "WEEKLY", target: 2, bookTitle: null })).toBe("Read 2 books per week");
});

test("validates count goals", () => {
  expect(validateGoalInput({ type: "BOOK_COUNT", target: 12, timeZone: "Europe/Belgrade" }, context)).toMatchObject({
    ok: true,
    value: {
      type: "BOOK_COUNT",
      period: "TOTAL",
      timeZone: "Europe/Belgrade",
      target: 12,
      bookId: null,
      startsAt: now,
      endsAt: null,
    },
  });
  expect(validateGoalInput({ type: "BOOK_COUNT", target: 0 }, context).ok).toBe(false);
  expect(validateGoalInput({ type: "BOOK_COUNT", target: 1001 }, context).ok).toBe(false);
  expect(validateGoalInput({ type: "PAGE_COUNT", target: 2.5 }, context).ok).toBe(false);
  expect(validateGoalInput({ type: "PAGE_COUNT", target: 1_000_000 }, context).ok).toBe(true);
  expect(validateGoalInput({ type: "NOPE", target: 3 }, context).ok).toBe(false);
});

test("validates goal periods per type and falls back to UTC for unknown zones", () => {
  const daily = validateGoalInput({ type: "PAGE_COUNT", period: "DAILY", target: 20, timeZone: "Mars/Olympus" }, context);
  expect(daily).toMatchObject({ ok: true, value: { period: "DAILY", timeZone: "UTC" } });
  expect(validateGoalInput({ type: "BOOK_COUNT", period: "DAILY", target: 1 }, context).ok).toBe(false);
  expect(validateGoalInput({ type: "BOOK", period: "WEEKLY", bookId: "book-open" }, context).ok).toBe(false);
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

function dailyView(met: boolean): GoalView {
  return {
    id: "daily",
    type: "PAGE_COUNT",
    period: "DAILY",
    target: 20,
    bookId: null,
    bookTitle: null,
    startsAt: "2026-06-15T00:00:00.000Z",
    endsAt: null,
    completedAt: null,
    progress: {
      current: met ? 20 : 10,
      target: 20,
      percent: met ? 100 : 50,
      done: false,
      expired: false,
      daysLeft: null,
      metThisPeriod: met,
      streak: met ? 1 : 0,
      bestStreak: 1,
    },
  };
}

test("celebrates a daily goal the first time it is met", () => {
  const lists = { active: [dailyView(true)], completed: [], ended: [], newlyCompleted: [] };
  expect(goalsToCelebrate([dailyView(false)], lists).map((goal) => goal.id)).toEqual(["daily"]);
  expect(goalsToCelebrate([dailyView(true)], lists)).toEqual([]);
});
