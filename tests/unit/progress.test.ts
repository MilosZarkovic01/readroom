import { expect, test } from "vitest";
import { entryPageCount, parsePage, planProgressUpdate, progressPercent } from "../../src/lib/progress";
import { periodWindow, previousWindow, safeTimeZone } from "../../src/lib/zoned-time";

test("records pages read when moving forward", () => {
  expect(planProgressUpdate(null, 120)).toEqual({ kind: "create", page: 120, pagesRead: 120 });
  expect(planProgressUpdate({ id: "a", page: 120, pagesRead: 120 }, 150)).toEqual({
    kind: "create",
    page: 150,
    pagesRead: 30,
  });
  expect(planProgressUpdate({ id: "a", page: 150, pagesRead: 30 }, 150)).toEqual({ kind: "none" });
});

test("treats small backwards moves as a correction of the last update", () => {
  expect(planProgressUpdate({ id: "a", page: 210, pagesRead: 90 }, 150)).toEqual({
    kind: "update",
    id: "a",
    page: 150,
    pagesRead: 30,
  });
});

test("starting over records the new page without counting pages", () => {
  expect(planProgressUpdate({ id: "a", page: 400, pagesRead: 50 }, 10)).toEqual({
    kind: "create",
    page: 10,
    pagesRead: 0,
  });
});

test("parses pages within bounds", () => {
  expect(parsePage("42", 400)).toBe(42);
  expect(parsePage(0, 400)).toBe(0);
  expect(parsePage(401, 400)).toBeNull();
  expect(parsePage(-1, 400)).toBeNull();
  expect(parsePage(3.5, 400)).toBeNull();
  expect(parsePage("", 400)).toBeNull();
});

test("computes reading percent", () => {
  expect(progressPercent(120, 400)).toBe(30);
  expect(progressPercent(null, 400)).toBe(0);
  expect(progressPercent(120, null)).toBe(0);
  expect(progressPercent(500, 400)).toBe(100);
});

test("builds day windows in the reader's time zone", () => {
  const window = periodWindow(new Date("2026-06-15T22:30:00.000Z"), "DAILY", "Europe/Belgrade");
  expect(window.key).toBe("2026-06-16");
  expect(window.start.toISOString()).toBe("2026-06-15T22:00:00.000Z");
  expect(window.end.toISOString()).toBe("2026-06-16T22:00:00.000Z");
  expect(previousWindow(window, "DAILY", "Europe/Belgrade").key).toBe("2026-06-15");
});

test("handles daylight saving transitions", () => {
  const window = periodWindow(new Date("2026-03-29T12:00:00.000Z"), "DAILY", "Europe/Belgrade");
  expect(window.start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
  expect(window.end.toISOString()).toBe("2026-03-29T22:00:00.000Z");
});

test("weeks start on Monday", () => {
  const window = periodWindow(new Date("2026-06-14T12:00:00.000Z"), "WEEKLY", "UTC");
  expect(window.key).toBe("2026-06-08");
  expect(window.end.toISOString()).toBe("2026-06-15T00:00:00.000Z");
});

test("uses a reader's edition page count ahead of the shared catalog count", () => {
  expect(entryPageCount({ pageCountOverride: 410, book: { pageCount: 393 } })).toBe(410);
  expect(entryPageCount({ pageCountOverride: null, book: { pageCount: 393 } })).toBe(393);
  expect(entryPageCount({ pageCountOverride: 320, book: { pageCount: null } })).toBe(320);
});

test("falls back to UTC for unknown time zones", () => {
  expect(safeTimeZone("Europe/Belgrade")).toBe("Europe/Belgrade");
  expect(safeTimeZone("Nowhere/Land")).toBe("UTC");
  expect(safeTimeZone(undefined)).toBe("UTC");
});
