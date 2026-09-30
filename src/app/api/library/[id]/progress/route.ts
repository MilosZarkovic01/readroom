import { NextResponse } from "next/server";
import type { ReadingStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { finishedAtFor, goalsToCelebrate } from "@/lib/goals";
import { MAX_PAGES, entryPageCount, parsePage } from "@/lib/progress";
import { listGoalsWithProgress } from "@/lib/reading-goals";
import { saveReadingProgress } from "@/lib/reading-progress";
import { unlockEarnedBadges } from "@/lib/unlock-badges";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  const entry = await prisma.libraryEntry.findFirst({
    where: { id, userId },
    include: { book: { select: { id: true, pageCount: true } } },
  });
  if (!entry) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let suppliedTotal: number | null = null;
  if (body?.totalPages != null && body.totalPages !== "") {
    const total = parsePage(body.totalPages, MAX_PAGES);
    if (!total) {
      return NextResponse.json({ error: "Enter the book's total pages as a whole number." }, { status: 400 });
    }
    suppliedTotal = total;
  }

  const pageCount = suppliedTotal ?? entryPageCount(entry);
  const storedOverride = suppliedTotal == null ? undefined : suppliedTotal === entry.book.pageCount ? null : suppliedTotal;
  const overrideUpdate = storedOverride !== undefined && storedOverride !== entry.pageCountOverride ? storedOverride : undefined;

  const max = pageCount ?? MAX_PAGES;
  const page = parsePage(body?.page, max);
  if (page == null) {
    return NextResponse.json(
      {
        error: pageCount
          ? `Enter a page between 0 and ${pageCount.toLocaleString("en-US")}.`
          : "Enter the page you're on as a whole number.",
      },
      { status: 400 },
    );
  }

  const finished = pageCount != null && page >= pageCount && entry.status === "READING";
  let nextStatus: ReadingStatus = entry.status;
  if (page > 0 && entry.status === "WANT_TO_READ") nextStatus = "READING";
  else if (finished) nextStatus = "READ";

  try {
    const before = await listGoalsWithProgress(userId, { persist: false });
    await prisma.$transaction(async (tx) => {
      await saveReadingProgress(userId, entry.id, page, tx);
      if (nextStatus !== entry.status || overrideUpdate !== undefined) {
        await tx.libraryEntry.update({
          where: { id: entry.id },
          data: {
            ...(nextStatus !== entry.status
              ? { status: nextStatus, finishedAt: finishedAtFor(entry, nextStatus) }
              : {}),
            ...(overrideUpdate !== undefined ? { pageCountOverride: overrideUpdate } : {}),
          },
        });
      }
    });

    const unlocked = nextStatus !== entry.status ? await unlockEarnedBadges(userId) : [];
    const after = await listGoalsWithProgress(userId);

    return NextResponse.json({
      currentPage: page,
      pageCount,
      status: nextStatus,
      finished,
      unlocked,
      completedGoals: goalsToCelebrate([...before.active, ...before.completed, ...before.ended], after),
    });
  } catch (error) {
    console.error("Failed to save reading progress", error);
    return NextResponse.json({ error: "Could not save your page. Try again." }, { status: 500 });
  }
}
