import { NextResponse } from "next/server";
import type { ReadingStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STATUSES } from "@/lib/status";
import { isValidRating } from "@/lib/rating";
import { parsePageCount } from "@/lib/badges";
import { pickSubjects, serializeSubjects } from "@/lib/subjects";
import { unlockEarnedBadges } from "@/lib/unlock-badges";
import { finishedAtFor, goalsToCelebrate } from "@/lib/goals";
import { listGoalsWithProgress } from "@/lib/reading-goals";
import { saveReadingProgress } from "@/lib/reading-progress";
import { entryPageCount } from "@/lib/progress";

const STATUSES_SET = new Set<ReadingStatus>(STATUSES);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.libraryEntry.findMany({
    where: { userId: session.user.id },
    include: { book: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const openLibraryKey = String(body?.openLibraryKey ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const author = String(body?.author ?? "Unknown author").trim();
  const coverId =
    typeof body?.coverId === "number" ? body.coverId : body?.coverId === null ? null : Number(body?.coverId) || null;
  const firstPublishYear =
    typeof body?.firstPublishYear === "number"
      ? body.firstPublishYear
      : body?.firstPublishYear
        ? Number(body.firstPublishYear)
        : null;
  const description = body?.description ? String(body.description).slice(0, 1000) : null;
  const subjects = serializeSubjects(pickSubjects(body?.subjects));
  const pageCount = parsePageCount(body?.pageCount);
  const status = body?.status as ReadingStatus;
  const review = body?.review != null ? String(body.review).slice(0, 500).trim() || null : undefined;
  const rating = body?.rating === null || body?.rating === undefined ? undefined : body.rating;

  if (!openLibraryKey || !title) {
    return NextResponse.json({ error: "Book details are required." }, { status: 400 });
  }
  if (!STATUSES_SET.has(status)) {
    return NextResponse.json({ error: "Choose a valid shelf." }, { status: 400 });
  }
  if (rating !== undefined && !isValidRating(rating)) {
    return NextResponse.json({ error: "Rating must be between 0.5 and 5 in half-star steps." }, { status: 400 });
  }

  try {
    const book = await prisma.book.upsert({
      where: { openLibraryKey },
      create: {
        openLibraryKey,
        title,
        author,
        coverId,
        firstPublishYear,
        description,
        subjects,
        pageCount,
      },
      update: {
        title,
        author,
        coverId,
        firstPublishYear,
        description,
        subjects,
        ...(pageCount != null ? { pageCount } : {}),
      },
    });

    const where = { userId_bookId: { userId: session.user.id, bookId: book.id } };
    const previous = await prisma.libraryEntry.findUnique({
      where,
      select: { status: true, finishedAt: true },
    });
    const finishedAt = finishedAtFor(previous, status);
    const before =
      status === "READ" ? await listGoalsWithProgress(session.user.id, { persist: false }) : null;

    const entry = await prisma.libraryEntry.upsert({
      where,
      create: {
        userId: session.user.id,
        bookId: book.id,
        status,
        rating: rating ?? null,
        review: review ?? null,
        finishedAt,
      },
      update: {
        status,
        finishedAt,
        ...(rating !== undefined ? { rating } : {}),
        ...(review !== undefined ? { review } : {}),
      },
      include: { book: true },
    });

    const entryPages = entryPageCount(entry);
    if (status === "READ" && previous?.status !== "READ" && entryPages) {
      await saveReadingProgress(session.user.id, entry.id, entryPages);
    }

    const unlocked = await unlockEarnedBadges(session.user.id);
    const after = status === "READ" ? await listGoalsWithProgress(session.user.id) : null;
    const completedGoals =
      before && after ? goalsToCelebrate([...before.active, ...before.completed, ...before.ended], after) : [];

    return NextResponse.json({ entry, unlocked, completedGoals }, { status: 201 });
  } catch (error) {
    console.error("Failed to add library book", error);
    return NextResponse.json({ error: "Could not add that book. Try again." }, { status: 500 });
  }
}
