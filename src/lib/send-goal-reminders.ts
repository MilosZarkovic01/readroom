import type { GoalProgress } from "@/lib/goals";
import { computeGoalProgress } from "@/lib/goals";
import { appOrigin, buildGoalReminderEmail } from "@/lib/goal-reminder-email";
import { planGoalReminders, type ReminderGoal } from "@/lib/goal-reminders";
import { goalReminderSettings } from "@/lib/goal-reminder-settings";
import { isEmailConfigured, sendEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

type GoalRow = {
  id: string;
  userId: string;
  type: ReminderGoal["type"];
  period: ReminderGoal["period"];
  timeZone: string | null;
  target: number | null;
  bookId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  completedAt: Date | null;
  book: { title: string } | null;
  user: { id: string; email: string; name: string | null };
  reminders: { periodKey: string }[];
};

function isUniqueConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function releaseClaims(claimed: { goalId: string; periodKey: string }[]) {
  if (claimed.length === 0) return;
  await prisma.goalReminder.deleteMany({
    where: { OR: claimed.map((item) => ({ goalId: item.goalId, periodKey: item.periodKey })) },
  });
}

export async function sendDueGoalReminders(now = new Date()) {
  const settings = goalReminderSettings();
  if (!settings.enabled) return { enabled: false, sent: 0, goals: 0 };
  if (!isEmailConfigured()) return { enabled: true, sent: 0, goals: 0, reason: "email-not-configured" as const };

  await prisma.goalReminder.deleteMany({
    where: { sentAt: { lt: new Date(now.getTime() - RETENTION_MS) } },
  });

  const goals = await prisma.readingGoal.findMany({
    where: { completedAt: null, user: { emailVerifiedAt: { not: null } } },
    include: {
      book: { select: { title: true } },
      user: { select: { id: true, email: true, name: true } },
      reminders: { select: { periodKey: true } },
    },
  });
  if (goals.length === 0) return { enabled: true, sent: 0, goals: 0 };

  const userIds = [...new Set(goals.map((goal) => goal.userId))];
  const earliest = goals.reduce((min, goal) => (goal.startsAt < min ? goal.startsAt : min), goals[0].startsAt);
  const [entries, logs] = await Promise.all([
    prisma.libraryEntry.findMany({
      where: { userId: { in: userIds }, status: "READ" },
      select: { userId: true, bookId: true, status: true, finishedAt: true },
    }),
    prisma.readingLog.findMany({
      where: { userId: { in: userIds }, createdAt: { gte: earliest } },
      select: { userId: true, createdAt: true, pagesRead: true },
    }),
  ]);

  const entriesByUser = new Map<string, { bookId: string; status: "READ"; finishedAt: Date | null }[]>();
  for (const entry of entries) {
    const list = entriesByUser.get(entry.userId) ?? [];
    list.push({ bookId: entry.bookId, status: "READ", finishedAt: entry.finishedAt });
    entriesByUser.set(entry.userId, list);
  }
  const logsByUser = new Map<string, { createdAt: Date; pagesRead: number }[]>();
  for (const log of logs) {
    const list = logsByUser.get(log.userId) ?? [];
    list.push({ createdAt: log.createdAt, pagesRead: log.pagesRead });
    logsByUser.set(log.userId, list);
  }

  const byUser = new Map<string, { email: string; name: string | null; goals: GoalRow[] }>();
  for (const goal of goals) {
    const group = byUser.get(goal.userId) ?? { email: goal.user.email, name: goal.user.name, goals: [] };
    group.goals.push(goal);
    byUser.set(goal.userId, group);
  }

  let sent = 0;
  let reminded = 0;
  const profileUrl = `${appOrigin()}/profile`;

  for (const [userId, group] of byUser) {
    const planned = planGoalReminders(
      group.goals.map((goal) => toReminderGoal(goal, entriesByUser.get(userId) ?? [], logsByUser.get(userId) ?? [], now)),
      now,
      settings,
    );
    if (planned.length === 0) continue;

    const claimed = [];
    let claimFailed = false;
    for (const item of planned) {
      try {
        await prisma.goalReminder.create({ data: { goalId: item.goalId, periodKey: item.periodKey } });
        claimed.push(item);
      } catch (error) {
        if (isUniqueConflict(error)) continue;
        claimFailed = true;
        console.error("Failed to reserve goal reminder", error);
        break;
      }
    }
    if (claimFailed) {
      await releaseClaims(claimed);
      continue;
    }
    if (claimed.length === 0) continue;

    try {
      const message = buildGoalReminderEmail({ name: group.name, goals: claimed, profileUrl });
      await sendEmail({ to: group.email, ...message });
      sent += 1;
      reminded += claimed.length;
    } catch (error) {
      await releaseClaims(claimed);
      console.error("Failed to send goal reminder", error);
    }
  }

  return { enabled: true, sent, goals: reminded };
}

function toReminderGoal(
  goal: GoalRow,
  entries: { bookId: string; status: "READ"; finishedAt: Date | null }[],
  logs: { createdAt: Date; pagesRead: number }[],
  now: Date,
): ReminderGoal {
  const progress: GoalProgress = computeGoalProgress(goal, entries, logs, now);
  return {
    id: goal.id,
    type: goal.type,
    period: goal.period,
    timeZone: goal.timeZone,
    bookTitle: goal.book?.title ?? null,
    startsAt: goal.startsAt,
    endsAt: goal.endsAt,
    completedAt: goal.completedAt,
    progress,
    remindedPeriodKeys: goal.reminders.map((reminder) => reminder.periodKey),
  };
}
