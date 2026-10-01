import { expect, test } from "vitest";
import { buildGoalReminderEmail } from "../../src/lib/goal-reminder-email";
import { planGoalReminders, type ReminderGoal } from "../../src/lib/goal-reminders";
import {
  DEFAULT_GOAL_REMINDER_SETTINGS,
  goalReminderSettings,
  type GoalReminderSettings,
} from "../../src/lib/goal-reminder-settings";
import type { GoalProgress } from "../../src/lib/goals";

const settings: GoalReminderSettings = { ...DEFAULT_GOAL_REMINDER_SETTINGS };

function progress(partial: Partial<GoalProgress>): GoalProgress {
  return {
    current: 15,
    target: 20,
    percent: 75,
    done: false,
    expired: false,
    daysLeft: null,
    metThisPeriod: false,
    streak: 1,
    bestStreak: 1,
    ...partial,
  };
}

function daily(partial: Partial<ReminderGoal> = {}): ReminderGoal {
  return {
    id: "goal-1",
    type: "PAGE_COUNT",
    period: "DAILY",
    timeZone: "Europe/Belgrade",
    bookTitle: null,
    startsAt: new Date("2026-09-01T00:00:00.000Z"),
    endsAt: null,
    completedAt: null,
    progress: progress({}),
    remindedPeriodKeys: [],
    ...partial,
  };
}

test("reminds a daily page goal in the last few hours when it is still short", () => {
  const planned = planGoalReminders([daily()], new Date("2026-09-30T19:30:00.000Z"), settings);
  expect(planned).toHaveLength(1);
  expect(planned[0]).toMatchObject({
    goalId: "goal-1",
    periodKey: "DAILY:2026-09-30",
    title: "Read 20 pages per day",
    subject: "5 pages left on today's reading goal",
    percent: 75,
  });
  expect(planned[0].line).toContain("15 of 20 pages today");
  expect(planned[0].line).toContain("5 pages to go before the day ends");
});

test("waits until the configurable lead window", () => {
  const now = new Date("2026-09-30T16:00:00.000Z");
  expect(planGoalReminders([daily()], now, settings)).toEqual([]);
  const sooner = planGoalReminders([daily()], now, { ...settings, dailyLeadHours: 6 });
  expect(sooner).toHaveLength(1);
});

test("skips a daily goal that is already met or already reminded", () => {
  const now = new Date("2026-09-30T19:30:00.000Z");
  expect(
    planGoalReminders([daily({ progress: progress({ current: 20, percent: 100, metThisPeriod: true }) })], now, settings),
  ).toEqual([]);
  expect(planGoalReminders([daily({ remindedPeriodKeys: ["DAILY:2026-09-30"] })], now, settings)).toEqual([]);
});

test("skips an open-ended total goal and reminds one inside its deadline window", () => {
  const open = daily({
    period: "TOTAL",
    endsAt: null,
    progress: progress({ metThisPeriod: false, daysLeft: null }),
  });
  const ending = daily({
    id: "year",
    period: "TOTAL",
    endsAt: new Date("2026-12-31T22:59:59.999Z"),
    progress: progress({ current: 80, target: 100, percent: 80 }),
  });
  const early = new Date("2026-12-28T22:00:00.000Z");
  const close = new Date("2026-12-30T22:00:00.000Z");
  expect(planGoalReminders([open, ending], early, settings)).toEqual([]);
  const planned = planGoalReminders([ending], close, settings);
  expect(planned).toHaveLength(1);
  expect(planned[0].periodKey).toBe("TOTAL:2026-12-31T22:59:59.999Z");
  expect(planned[0].subject).toBe("20 pages left on your reading goal");
});

test("uses a weekly window and its own lead time", () => {
  const goal = daily({
    period: "WEEKLY",
    progress: progress({ current: 1, target: 3, percent: 33 }),
    type: "BOOK_COUNT",
  });
  const tooSoon = new Date("2026-10-02T18:00:00.000Z");
  const close = new Date("2026-10-04T18:00:00.000Z");
  expect(planGoalReminders([goal], tooSoon, settings)).toEqual([]);
  const planned = planGoalReminders([goal], close, settings);
  expect(planned[0]?.periodKey).toBe("WEEKLY:2026-09-28");
  expect(planned[0]?.subject).toBe("2 books left on this week's reading goal");
});

test("reminder settings fall back when values are missing or out of range", () => {
  expect(goalReminderSettings({})).toEqual(DEFAULT_GOAL_REMINDER_SETTINGS);
  expect(
    goalReminderSettings({
      GOAL_REMINDER_ENABLED: "false",
      GOAL_REMINDER_DAILY_LEAD_HOURS: "4",
      GOAL_REMINDER_WEEKLY_LEAD_HOURS: "nope",
      GOAL_REMINDER_TOTAL_LEAD_HOURS: "1000",
    }),
  ).toEqual({ ...DEFAULT_GOAL_REMINDER_SETTINGS, enabled: false, dailyLeadHours: 4 });
});

test("the reminder email matches the ReadRoom email layout", () => {
  const [goal] = planGoalReminders([daily()], new Date("2026-09-30T19:30:00.000Z"), settings);
  const message = buildGoalReminderEmail({
    name: "Claire",
    goals: [{ ...goal, title: `Finish <Circe>` }],
    profileUrl: "https://readroom-gamma.vercel.app/profile",
  });
  expect(message.subject).toBe("5 pages left on today's reading goal");
  expect(message.text).toContain("Claire, there's still time.");
  expect(message.text).toContain("https://readroom-gamma.vercel.app/profile");
  expect(message.html).toContain("background:#f7f1e7");
  expect(message.html).toContain("background:#fffdf8");
  expect(message.html).toContain("color:#b86f52");
  expect(message.html).toContain("Georgia");
  expect(message.html).toContain("Finish &lt;Circe&gt;");
  expect(message.html).toContain("https://readroom-gamma.vercel.app/profile");
  expect(message.html).not.toContain("Finish <Circe>");
});
