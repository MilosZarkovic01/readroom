import { prisma } from "@/lib/prisma";
import { computeGoalProgress, type GoalLists, type GoalView } from "@/lib/goals";

export async function listGoalsWithProgress(
  userId: string,
): Promise<GoalLists & { newlyCompleted: GoalView[] }> {
  const [goals, entries] = await Promise.all([
    prisma.readingGoal.findMany({
      where: { userId },
      include: { book: { select: { title: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.libraryEntry.findMany({
      where: { userId, status: "READ" },
      select: { bookId: true, status: true, finishedAt: true, book: { select: { pageCount: true } } },
    }),
  ]);

  const snapshots = entries.map((entry) => ({
    bookId: entry.bookId,
    status: entry.status,
    finishedAt: entry.finishedAt,
    pageCount: entry.book.pageCount,
  }));

  const now = new Date();
  const views: GoalView[] = [];
  const newlyCompleted: GoalView[] = [];
  for (const goal of goals) {
    const progress = computeGoalProgress(goal, snapshots, now);
    const completedAt = goal.completedAt ?? (progress.done ? now : null);
    const view: GoalView = {
      id: goal.id,
      type: goal.type,
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
