import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { goalsToCelebrate, validateGoalInput } from "@/lib/goals";
import { listGoalsWithProgress } from "@/lib/reading-goals";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { active, completed, ended } = await listGoalsWithProgress(session.user.id);
  return NextResponse.json({ active, completed, ended });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  const [{ active }, openEntries] = await Promise.all([
    listGoalsWithProgress(userId),
    prisma.libraryEntry.findMany({
      where: { userId, status: { not: "READ" } },
      select: { bookId: true },
    }),
  ]);
  const result = validateGoalInput(body, {
    activeCount: active.length,
    openBookIds: new Set(openEntries.map((entry) => entry.bookId)),
    activeBookIds: new Set(active.flatMap((goal) => (goal.bookId ? [goal.bookId] : []))),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const goal = await prisma.readingGoal.create({ data: { userId, ...result.value } });
    const after = await listGoalsWithProgress(userId);
    const completedGoals = goalsToCelebrate([], after).filter((item) => item.id === goal.id);
    return NextResponse.json({ goal, completedGoals }, { status: 201 });
  } catch (error) {
    console.error("Failed to create reading goal", error);
    return NextResponse.json({ error: "Could not save your goal. Try again." }, { status: 500 });
  }
}
