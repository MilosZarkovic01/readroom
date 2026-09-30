export type GoalType = "BOOK" | "BOOK_COUNT" | "PAGE_COUNT";

export const GOAL_TYPES: GoalType[] = ["BOOK_COUNT", "PAGE_COUNT", "BOOK"];

export const MAX_ACTIVE_GOALS = 5;

export const GOAL_LIMITS: Record<Exclude<GoalType, "BOOK">, number> = {
  BOOK_COUNT: 1000,
  PAGE_COUNT: 1_000_000,
};

export type GoalRecord = {
  type: GoalType;
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
  pageCount: number | null;
};

export type GoalProgress = {
  current: number;
  target: number;
  percent: number;
  done: boolean;
  expired: boolean;
  daysLeft: number | null;
};

export type GoalView = {
  id: string;
  type: GoalType;
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

function inWindow(goal: GoalRecord, finishedAt: Date | null) {
  if (!finishedAt) return false;
  if (finishedAt < goal.startsAt) return false;
  return !goal.endsAt || finishedAt <= goal.endsAt;
}

export function computeGoalProgress(
  goal: GoalRecord,
  entries: GoalEntrySnapshot[],
  now: Date = new Date(),
): GoalProgress {
  const finished = entries.filter(
    (entry) => entry.status === "READ" && inWindow(goal, entry.finishedAt),
  );

  let current: number;
  let target: number;
  if (goal.type === "BOOK") {
    target = 1;
    current = finished.some((entry) => entry.bookId === goal.bookId) ? 1 : 0;
  } else if (goal.type === "BOOK_COUNT") {
    target = goal.target ?? 1;
    current = finished.length;
  } else {
    target = goal.target ?? 1;
    current = finished.reduce((sum, entry) => sum + (entry.pageCount ?? 0), 0);
  }

  const done = goal.completedAt != null || current >= target;
  const expired = !done && goal.endsAt != null && now > goal.endsAt;
  const daysLeft =
    !done && !expired && goal.endsAt
      ? Math.max(0, Math.ceil((goal.endsAt.getTime() - now.getTime()) / DAY_MS))
      : null;
  const percent = done ? 100 : Math.min(100, Math.floor((current / target) * 100));

  return { current: Math.min(current, target), target, percent, done, expired, daysLeft };
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

export function goalTitle(goal: { type: GoalType; target: number | null; bookTitle: string | null }) {
  if (goal.type === "BOOK") return `Finish ${goal.bookTitle ?? "a book"}`;
  return `Read ${formatAmount(goal.type, goal.target ?? 0)}`;
}

export function motivationLine(type: GoalType, progress: GoalProgress) {
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

  return { ok: true, value: { type, target, bookId, startsAt: start, endsAt } };
}
