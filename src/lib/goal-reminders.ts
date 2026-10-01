import { formatAmount, type GoalPeriod, type GoalProgress, type GoalType } from "./goals";
import type { GoalReminderSettings } from "./goal-reminder-settings";
import { periodWindow, safeTimeZone, type RecurringPeriod } from "./zoned-time";

const HOUR_MS = 60 * 60 * 1000;

export type ReminderGoal = {
  id: string;
  type: GoalType;
  period: GoalPeriod;
  timeZone: string | null;
  bookTitle: string | null;
  startsAt: Date;
  endsAt: Date | null;
  completedAt: Date | null;
  progress: GoalProgress;
  remindedPeriodKeys: string[];
};

export type PlannedReminder = {
  goalId: string;
  periodKey: string;
  title: string;
  line: string;
  percent: number;
  subject: string;
};

function leadMs(period: GoalPeriod, settings: GoalReminderSettings) {
  const hours =
    period === "DAILY"
      ? settings.dailyLeadHours
      : period === "WEEKLY"
        ? settings.weeklyLeadHours
        : settings.totalLeadHours;
  return hours * HOUR_MS;
}

function deadline(goal: ReminderGoal, now: Date): { at: Date; periodKey: string } | null {
  if (goal.completedAt || now < goal.startsAt) return null;

  if (goal.period === "TOTAL") {
    if (!goal.endsAt || now >= goal.endsAt) return null;
    return { at: goal.endsAt, periodKey: `TOTAL:${goal.endsAt.toISOString()}` };
  }

  const timeZone = safeTimeZone(goal.timeZone);
  const window = periodWindow(now, goal.period, timeZone);
  if (now < window.start || now >= window.end) return null;
  if (goal.endsAt && goal.endsAt <= window.start) return null;
  const at = goal.endsAt && goal.endsAt < window.end ? goal.endsAt : window.end;
  if (now >= at) return null;
  return { at, periodKey: `${goal.period}:${window.key}` };
}

function unfinished(goal: ReminderGoal) {
  if (goal.progress.expired || goal.progress.current >= goal.progress.target) return false;
  if (goal.period === "TOTAL") return !goal.progress.done;
  return !goal.progress.metThisPeriod;
}

function noun(type: GoalType, amount: number) {
  if (type === "PAGE_COUNT") return amount === 1 ? "page" : "pages";
  return amount === 1 ? "book" : "books";
}

function progressLabel(type: GoalType, current: number, target: number) {
  return `${current.toLocaleString("en-US")} of ${target.toLocaleString("en-US")} ${noun(type, target)}`;
}

function when(period: GoalPeriod) {
  if (period === "DAILY") return "before the day ends";
  if (period === "WEEKLY") return "before the week ends";
  return "before the deadline";
}

function scope(period: RecurringPeriod) {
  return period === "DAILY" ? " today" : " this week";
}

function reminderCopy(goal: ReminderGoal): { title: string; line: string; subject: string } {
  if (goal.type === "BOOK") {
    const title = goal.bookTitle?.trim() || "Your book";
    return {
      title: `Finish ${title}`,
      subject: `Finish ${title} before the deadline`,
      line: `${title} is still open. There's time ${when("TOTAL")}.`,
    };
  }

  const target = goal.progress.target;
  const current = goal.progress.current;
  const left = formatAmount(goal.type, target - current);
  const title =
    goal.period === "TOTAL"
      ? `Read ${formatAmount(goal.type, target)}`
      : `Read ${formatAmount(goal.type, target)}${goal.period === "DAILY" ? " per day" : " per week"}`;
  const where =
    goal.period === "DAILY" ? "today's reading goal" : goal.period === "WEEKLY" ? "this week's reading goal" : "your reading goal";
  const placed = goal.period === "TOTAL" ? "" : scope(goal.period);
  const line =
    current === 0
      ? `Nothing logged${placed} yet. ${left} to go ${when(goal.period)}.`
      : `You're at ${progressLabel(goal.type, current, target)}${placed}. ${left} to go ${when(goal.period)}.`;

  return { title, line, subject: `${left} left on ${where}` };
}

/** Goals that are still short of the target and inside the configurable lead window. */
export function planGoalReminders(
  goals: ReminderGoal[],
  now: Date,
  settings: GoalReminderSettings,
): PlannedReminder[] {
  if (!settings.enabled) return [];

  const planned: PlannedReminder[] = [];
  for (const goal of goals) {
    if (!unfinished(goal)) continue;
    const due = deadline(goal, now);
    if (!due) continue;
    const lead = leadMs(goal.period, settings);
    if (now.getTime() < due.at.getTime() - lead) continue;
    if (goal.remindedPeriodKeys.includes(due.periodKey)) continue;
    const copy = reminderCopy(goal);
    planned.push({
      goalId: goal.id,
      periodKey: due.periodKey,
      title: copy.title,
      line: copy.line,
      percent: goal.progress.percent,
      subject: copy.subject,
    });
  }
  return planned;
}

export function reminderSubject(reminders: PlannedReminder[]) {
  if (reminders.length === 1) return reminders[0].subject;
  return "Your reading goals are close";
}
