import { NextResponse } from "next/server";
import type { ReadingStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STATUSES } from "@/lib/status";
import { isValidRating } from "@/lib/rating";

const STATUSES_SET = new Set<ReadingStatus>(STATUSES);

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  const data: { status?: ReadingStatus; rating?: number | null; review?: string | null } = {};

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

  try {
    const entry = await prisma.libraryEntry.update({
      where: { id },
      data,
      include: { book: true },
    });

    return NextResponse.json({ entry });
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
