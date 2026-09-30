import { periodWindow, previousWindow, safeTimeZone, type RecurringPeriod } from "./zoned-time";

export type GoalType = "BOOK" | "BOOK_COUNT" | "PAGE_COUNT";
export type GoalPeriod = "TOTAL" | RecurringPeriod;

export const GOAL_TYPES: GoalType[] = ["BOOK_COUNT", "PAGE_COUNT", "BOOK"];

export const GOAL_PERIODS: Record<GoalType, GoalPeriod[]> = {
  PAGE_COUNT: ["TOTAL", "DAILY", "WEEKLY"],
  BOOK_COUNT: ["TOTAL", "WEEKLY"],
  BOOK: ["TOTAL"],
};

export const MAX_ACTIVE_GOALS = 5;

export const GOAL_LIMITS: Record<Exclude<GoalType, "BOOK">, number> = {
  BOOK_COUNT: 1000,
  PAGE_COUNT: 1_000_000,
};

const STREAK_LOOKBACK = 366;

export type GoalRecord = {
  type: GoalType;
  period: GoalPeriod;
  timeZone: string | null;
  target: number | null;
  bookId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  completedAt: Date | null;
};

export type GoalEntrySnapshot = {
  bookId: string;
  status: "WANT_TO_READ" | "READING" | "READ";
  finishedAt: Date | null;
};

export type GoalLogSnapshot = { createdAt: Date; pagesRead: number };

export type GoalProgress = {
  current: number;
  target: number;
  percent: number;
  done: boolean;
  expired: boolean;
  daysLeft: number | null;
  metThisPeriod: boolean;
  streak: number;
  bestStreak: number;
};

export type GoalView = {
  id: string;
  type: GoalType;
  period: GoalPeriod;
  target: number | null;
  bookId: string | null;
  bookTitle: string | null;
  startsAt: string;
  endsAt: string | null;
  completedAt: string | null;
  progress: GoalProgress;
};

export type GoalLists = {
  active: GoalView[];
  completed: GoalView[];
  ended: GoalView[];
};

/** Goals that just reached their target, including a recurring goal met for the first time this period. */
export function goalsToCelebrate(before: GoalView[], after: GoalLists & { newlyCompleted: GoalView[] }): GoalView[] {
  const already = new Set(
    before.filter((goal) => goal.progress.done || goal.progress.metThisPeriod).map((goal) => goal.id),
  );
  const seen = new Set<string>();
  const result: GoalView[] = [];
  for (const goal of after.newlyCompleted) {
    seen.add(goal.id);
    result.push(goal);
  }
  for (const goal of [...after.active, ...after.completed]) {
    if (seen.has(goal.id) || goal.period === "TOTAL" || already.has(goal.id)) continue;
    if (goal.progress.metThisPeriod) {
      seen.add(goal.id);
      result.push(goal);
    }
  }
  return result;
}

export function readCompletedGoalsFromApi(payload: unknown): GoalView[] {
  if (!payload || typeof payload !== "object" || !("completedGoals" in payload)) return [];
  const goals = (payload as { completedGoals?: unknown }).completedGoals;
  if (!Array.isArray(goals)) return [];
  return goals.filter((item): item is GoalView => {
    if (!item || typeof item !== "object") return false;
    const goal = item as GoalView;
    return Boolean(goal.id && goal.type && goal.progress);
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function withinGoal(goal: GoalRecord, date: Date | null): date is Date {
  if (!date) return false;
  if (date < goal.startsAt) return false;
  return !goal.endsAt || date <= goal.endsAt;
}

function goalTarget(goal: GoalRecord) {
  return goal.type === "BOOK" ? 1 : Math.max(1, goal.target ?? 1);
}

function amountEvents(goal: GoalRecord, entries: GoalEntrySnapshot[], logs: GoalLogSnapshot[]) {
  if (goal.type === "PAGE_COUNT") {
    return logs
      .filter((log) => withinGoal(goal, log.createdAt))
      .map((log) => ({ at: log.createdAt, amount: log.pagesRead }));
  }
  return entries
    .filter((entry) => entry.status === "READ" && withinGoal(goal, entry.finishedAt))
    .filter((entry) => goal.type !== "BOOK" || entry.bookId === goal.bookId)
    .map((entry) => ({ at: entry.finishedAt as Date, amount: 1 }));
}

function daysUntil(goal: GoalRecord, now: Date) {
  if (!goal.endsAt) return null;
  return Math.max(0, Math.ceil((goal.endsAt.getTime() - now.getTime()) / DAY_MS));
}

function streaks(results: boolean[]) {
  let best = 0;
  let run = 0;
  for (const met of results) {
    run = met ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const from = results[0] ? 0 : 1;
  let streak = 0;
  for (let index = from; index < results.length && results[index]; index += 1) streak += 1;
  return { streak, best };
}

export function computeGoalProgress(
  goal: GoalRecord,
  entries: GoalEntrySnapshot[],
  logs: GoalLogSnapshot[],
  now: Date = new Date(),
): GoalProgress {
  const target = goalTarget(goal);
  const events = amountEvents(goal, entries, logs);

  if (goal.period === "TOTAL") {
    const total = Math.max(0, events.reduce((sum, event) => sum + event.amount, 0));
    const done = goal.completedAt != null || total >= target;
    const expired = !done && goal.endsAt != null && now > goal.endsAt;
    return {
      current: Math.min(total, target),
      target,
      percent: done ? 100 : Math.min(100, Math.floor((total / target) * 100)),
      done,
      expired,
      daysLeft: done || expired ? null : daysUntil(goal, now),
      metThisPeriod: done,
      streak: 0,
      bestStreak: 0,
    };
  }

  const period = goal.period;
  const timeZone = safeTimeZone(goal.timeZone);
  const expired = goal.endsAt != null && now > goal.endsAt;
  const reference = expired && goal.endsAt ? goal.endsAt : now;

  const buckets = new Map<string, number>();
  for (const event of events) {
    const key = periodWindow(event.at, period, timeZone).key;
    buckets.set(key, (buckets.get(key) ?? 0) + event.amount);
  }

  const results: boolean[] = [];
  let window = periodWindow(reference, period, timeZone);
  const current = Math.max(0, buckets.get(window.key) ?? 0);
  for (let index = 0; index < STREAK_LOOKBACK && window.end > goal.startsAt; index += 1) {
    results.push((buckets.get(window.key) ?? 0) >= target);
    window = previousWindow(window, period, timeZone);
  }
  const { streak, best } = streaks(results);
  const metThisPeriod = current >= target;

  return {
    current: Math.min(current, target),
    target,
    percent: Math.min(100, Math.floor((current / target) * 100)),
    done: false,
    expired,
    daysLeft: expired ? null : daysUntil(goal, now),
    metThisPeriod: !expired && metThisPeriod,
    streak: expired ? 0 : streak,
    bestStreak: best,
  };
}

export function finishedAtFor(
  previous: { status: GoalEntrySnapshot["status"]; finishedAt: Date | null } | null,
  nextStatus: GoalEntrySnapshot["status"],
  now: Date = new Date(),
): Date | null {
  if (nextStatus !== "READ") return null;
  if (previous?.status === "READ") return previous.finishedAt ?? now;
  return now;
}

export function formatAmount(type: GoalType, amount: number) {
  const value = amount.toLocaleString("en-US");
  if (type === "PAGE_COUNT") return `${value} ${amount === 1 ? "page" : "pages"}`;
  return `${value} ${amount === 1 ? "book" : "books"}`;
}

const PERIOD_SUFFIX: Record<GoalPeriod, string> = {
  TOTAL: "",
  DAILY: " per day",
  WEEKLY: " per week",
};

const PERIOD_NOW: Record<RecurringPeriod, string> = { DAILY: "today", WEEKLY: "this week" };
const PERIOD_UNIT: Record<RecurringPeriod, string> = { DAILY: "day", WEEKLY: "week" };

export function goalTitle(goal: {
  type: GoalType;
  period?: GoalPeriod;
  target: number | null;
  bookTitle: string | null;
}) {
  if (goal.type === "BOOK") return `Finish ${goal.bookTitle ?? "a book"}`;
  return `Read ${formatAmount(goal.type, goal.target ?? 0)}${PERIOD_SUFFIX[goal.period ?? "TOTAL"]}`;
}

export function periodNowLabel(period: GoalPeriod) {
  return period === "TOTAL" ? "" : PERIOD_NOW[period];
}

export function streakLabel(period: GoalPeriod, streak: number) {
  if (period === "TOTAL" || streak <= 0) return null;
  return `${streak}-${PERIOD_UNIT[period]} streak`;
}

function recurringMotivation(type: GoalType, period: RecurringPeriod, progress: GoalProgress) {
  const unit = PERIOD_UNIT[period];
  if (progress.expired) {
    return progress.bestStreak > 0
      ? `Ended · best streak ${progress.bestStreak} ${progress.bestStreak === 1 ? unit : `${unit}s`}`
      : "Ended";
  }
  const now = PERIOD_NOW[period];
  const streak = streakLabel(period, progress.streak);
  if (progress.metThisPeriod) return `Done for ${now}!`;
  const remaining = `${formatAmount(type, progress.target - progress.current)} to go ${now}`;
  return streak ? `${remaining} · keep your ${streak} going` : remaining;
}

export function motivationLine(type: GoalType, progress: GoalProgress, period: GoalPeriod = "TOTAL") {
  if (period !== "TOTAL") return recurringMotivation(type, period, progress);
  if (progress.done) return "Goal reached!";
  if (progress.expired) {
    return type === "BOOK"
      ? "Time's up, but the book is still waiting"
      : `Ended at ${formatAmount(type, progress.current)}`;
  }

  const deadline =
    progress.daysLeft == null
      ? ""
      : progress.daysLeft <= 1
        ? " · last day"
        : ` · ${progress.daysLeft} days left`;

  if (type === "BOOK") return `Waiting on your shelf${deadline}`;

  const remaining = formatAmount(type, progress.target - progress.current);
  if (progress.percent >= 75) return `Almost there, ${remaining} to go${deadline}`;
  if (progress.percent >= 50) return `Halfway there, ${remaining} to go${deadline}`;
  if (progress.percent > 0) return `${remaining} to go${deadline}`;
  return `Fresh start, ${remaining} to go${deadline}`;
}

export type GoalInput = {
  type: GoalType;
  period: GoalPeriod;
  timeZone: string;
  target: number | null;
  bookId: string | null;
  startsAt: Date;
  endsAt: Date | null;
};

export type GoalValidationContext = {
  activeCount: number;
  openBookIds: Set<string>;
  activeBookIds: Set<string>;
  now?: Date;
};

function parseDate(value: unknown): Date | null | "invalid" {
  if (value == null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

export function validateGoalInput(
  body: unknown,
  context: GoalValidationContext,
): { ok: true; value: GoalInput } | { ok: false; error: string } {
  const now = context.now ?? new Date();
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const type = input.type as GoalType;

  if (!GOAL_TYPES.includes(type)) return { ok: false, error: "Choose a goal type." };
  if (context.activeCount >= MAX_ACTIVE_GOALS) {
    return { ok: false, error: `You can have up to ${MAX_ACTIVE_GOALS} active goals.` };
  }

  const period = (input.period ?? "TOTAL") as GoalPeriod;
  if (!GOAL_PERIODS[type].includes(period)) {
    return { ok: false, error: "Choose how often this goal repeats." };
  }

  let target: number | null = null;
  let bookId: string | null = null;
  if (type === "BOOK") {
    bookId = typeof input.bookId === "string" ? input.bookId : null;
    if (!bookId || !context.openBookIds.has(bookId)) {
      return { ok: false, error: "Pick a book from your Want to read or Reading shelf." };
    }
    if (context.activeBookIds.has(bookId)) {
      return { ok: false, error: "You already have a goal for that book." };
    }
  } else {
    const max = GOAL_LIMITS[type];
    const value = Number(input.target);
    if (!Number.isInteger(value) || value < 1 || value > max) {
      return { ok: false, error: `Target must be a whole number between 1 and ${max.toLocaleString("en-US")}.` };
    }
    target = value;
  }

  const startsAt = parseDate(input.startsAt);
  const endsAt = parseDate(input.endsAt);
  if (startsAt === "invalid" || endsAt === "invalid") {
    return { ok: false, error: "Choose valid dates." };
  }
  const start = startsAt ?? now;
  if (endsAt && endsAt <= start) return { ok: false, error: "End date must be after the start date." };
  if (endsAt && endsAt <= now) return { ok: false, error: "End date must be in the future." };

  return {
    ok: true,
    value: { type, period, timeZone: safeTimeZone(input.timeZone), target, bookId, startsAt: start, endsAt },
  };
}
