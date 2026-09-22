import { NextResponse } from "next/server";
import type { ReadingStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STATUSES } from "@/lib/status";
import { isValidRating } from "@/lib/rating";
import { pickSubjects, serializeSubjects } from "@/lib/subjects";

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
      },
      update: {
        title,
        author,
        coverId,
        firstPublishYear,
        description,
        subjects,
      },
    });

    const entry = await prisma.libraryEntry.upsert({
      where: {
        userId_bookId: { userId: session.user.id, bookId: book.id },
      },
      create: {
        userId: session.user.id,
        bookId: book.id,
        status,
        rating: rating ?? null,
        review: review ?? null,
      },
      update: {
        status,
        ...(rating !== undefined ? { rating } : {}),
        ...(review !== undefined ? { review } : {}),
      },
      include: { book: true },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Failed to add library book", error);
    return NextResponse.json({ error: "Could not add that book. Try again." }, { status: 500 });
  }
}
