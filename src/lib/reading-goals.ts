import { prisma } from "@/lib/prisma";
import { computeGoalProgress, type GoalLists, type GoalView } from "@/lib/goals";

export async function listGoalsWithProgress(
  userId: string,
): Promise<GoalLists & { newlyCompleted: GoalView[] }> {
  const goals = await prisma.readingGoal.findMany({
    where: { userId },
    include: { book: { select: { title: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (goals.length === 0) return { active: [], completed: [], ended: [], newlyCompleted: [] };

  const earliest = goals.reduce((min, goal) => (goal.startsAt < min ? goal.startsAt : min), goals[0].startsAt);
  const [entries, logs] = await Promise.all([
    prisma.libraryEntry.findMany({
      where: { userId, status: "READ" },
      select: { bookId: true, status: true, finishedAt: true },
    }),
    goals.some((goal) => goal.type === "PAGE_COUNT")
      ? prisma.readingLog.findMany({
          where: { userId, createdAt: { gte: earliest } },
          select: { createdAt: true, pagesRead: true },
        })
      : Promise.resolve([]),
  ]);

  const now = new Date();
  const views: GoalView[] = [];
  const newlyCompleted: GoalView[] = [];
  for (const goal of goals) {
    const progress = computeGoalProgress(goal, entries, logs, now);
    const completedAt = goal.completedAt ?? (progress.done ? now : null);
    const view: GoalView = {
      id: goal.id,
      type: goal.type,
      period: goal.period,
      target: goal.target,
      bookId: goal.bookId,
      bookTitle: goal.book?.title ?? null,
      startsAt: goal.startsAt.toISOString(),
      endsAt: goal.endsAt?.toISOString() ?? null,
      completedAt: completedAt?.toISOString() ?? null,
      progress,
    };
    views.push(view);
    if (!goal.completedAt && progress.done) newlyCompleted.push(view);
  }

  if (newlyCompleted.length > 0) {
    await prisma.readingGoal.updateMany({
      where: { id: { in: newlyCompleted.map((goal) => goal.id) }, completedAt: null },
      data: { completedAt: now },
    });
  }

  return {
    active: views.filter((goal) => !goal.progress.done && !goal.progress.expired),
    completed: views.filter((goal) => goal.progress.done).reverse(),
    ended: views.filter((goal) => goal.progress.expired).reverse(),
    newlyCompleted,
  };
}
