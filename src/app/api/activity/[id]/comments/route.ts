import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const body = String(payload?.body ?? "").trim().slice(0, 280);
  const requestedParent = payload?.parentId ? String(payload.parentId) : null;
  if (!body) {
    return NextResponse.json({ error: "Write a comment first." }, { status: 400 });
  }

  const entry = await prisma.libraryEntry.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }

  let parentId: string | null = null;
  let parentAuthorId: string | null = null;
  if (requestedParent) {
    const parent = await prisma.activityComment.findFirst({
      where: { id: requestedParent, entryId: id },
      select: { id: true, parentId: true, userId: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    parentId = parent.parentId ?? parent.id;
    parentAuthorId = parent.userId;
  }

  const comment = await prisma.activityComment.create({
    data: { userId: session.user.id, entryId: id, parentId, body },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (parentAuthorId) {
    await notify({
      userId: parentAuthorId,
      actorId: session.user.id,
      type: "REPLY",
      entryId: id,
      commentId: comment.id,
    });
    if (entry.userId !== parentAuthorId) {
      await notify({
        userId: entry.userId,
        actorId: session.user.id,
        type: "COMMENT",
        entryId: id,
        commentId: comment.id,
      });
    }
  } else {
    await notify({
      userId: entry.userId,
      actorId: session.user.id,
      type: "COMMENT",
      entryId: id,
      commentId: comment.id,
    });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
