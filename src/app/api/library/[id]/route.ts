import { NextResponse } from "next/server";
import type { ReadingStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STATUSES } from "@/lib/status";
import { isValidRating } from "@/lib/rating";
import { unlockEarnedBadges } from "@/lib/unlock-badges";
import { finishedAtFor } from "@/lib/goals";
import { listGoalsWithProgress } from "@/lib/reading-goals";
import { saveReadingProgress } from "@/lib/reading-progress";

const STATUSES_SET = new Set<ReadingStatus>(STATUSES);

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  const data: {
    status?: ReadingStatus;
    rating?: number | null;
    review?: string | null;
    finishedAt?: Date | null;
  } = {};

  if (body?.status !== undefined) {
    if (!STATUSES_SET.has(body.status)) {
      return NextResponse.json({ error: "Choose a valid shelf." }, { status: 400 });
    }
    data.status = body.status;
  }

  if (body?.rating !== undefined) {
    if (body.rating === null) {
      data.rating = null;
    } else if (!isValidRating(body.rating)) {
      return NextResponse.json(
        { error: "Rating must be between 0.5 and 5 in half-star steps." },
        { status: 400 },
      );
    } else {
      data.rating = Number(body.rating);
    }
  }

  if (body?.review !== undefined) {
    data.review = body.review == null ? null : String(body.review).slice(0, 500).trim() || null;
  }

  const existing = await prisma.libraryEntry.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (data.status !== undefined) {
    data.finishedAt = finishedAtFor(existing, data.status);
  }

  try {
    const entry = await prisma.libraryEntry.update({
      where: { id },
      data,
      include: { book: true },
    });

    if (data.status === "READ" && existing.status !== "READ" && entry.book.pageCount) {
      await saveReadingProgress(session.user.id, entry.id, entry.book.pageCount);
    }

    const unlocked = await unlockEarnedBadges(session.user.id);
    const completedGoals =
      data.status === "READ" ? (await listGoalsWithProgress(session.user.id)).newlyCompleted : [];

    return NextResponse.json({ entry, unlocked, completedGoals });
  } catch (error) {
    console.error("Failed to update library entry", error);
    return NextResponse.json({ error: "Could not save your review. Try again." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.libraryEntry.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.libraryEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
