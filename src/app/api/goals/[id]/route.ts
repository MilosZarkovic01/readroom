import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { goalsToCelebrate, validateGoalInput } from "@/lib/goals";
import { listGoalsWithProgress } from "@/lib/reading-goals";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  const existing = await prisma.readingGoal.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const [before, openEntries] = await Promise.all([
    listGoalsWithProgress(userId, { persist: false }),
    prisma.libraryEntry.findMany({
      where: { userId, status: { not: "READ" } },
      select: { bookId: true },
    }),
  ]);
  const others = before.active.filter((goal) => goal.id !== id);
  const openBookIds = new Set(openEntries.map((entry) => entry.bookId));
  if (existing.bookId) openBookIds.add(existing.bookId);

  const result = validateGoalInput(body, {
    activeCount: others.length,
    openBookIds,
    activeBookIds: new Set(others.flatMap((goal) => (goal.bookId ? [goal.bookId] : []))),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    await prisma.readingGoal.update({
      where: { id },
      data: { ...result.value, completedAt: null },
    });
    const after = await listGoalsWithProgress(userId);
    const beforeViews = [...before.active, ...before.completed, ...before.ended];
    return NextResponse.json({
      completedGoals: goalsToCelebrate(beforeViews, after).filter((goal) => goal.id === id),
    });
  } catch (error) {
    console.error("Failed to update reading goal", error);
    return NextResponse.json({ error: "Could not save your goal. Try again." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.readingGoal.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.readingGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
