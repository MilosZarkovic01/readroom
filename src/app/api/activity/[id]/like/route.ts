import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const entry = await prisma.libraryEntry.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!entry) return NextResponse.json({ error: "Activity not found." }, { status: 404 });

  const existing = await prisma.activityLike.findUnique({
    where: { userId_entryId: { userId: session.user.id, entryId: id } },
  });
  if (!existing) {
    await prisma.activityLike.create({
      data: { userId: session.user.id, entryId: id },
    });
    await notify({
      userId: entry.userId,
      actorId: session.user.id,
      type: "LIKE",
      entryId: id,
    });
  }
  return NextResponse.json({ liked: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.activityLike.deleteMany({
    where: { userId: session.user.id, entryId: id },
  });
  await prisma.notification.deleteMany({
    where: { actorId: session.user.id, entryId: id, type: "LIKE" },
  });
  return NextResponse.json({ liked: false });
}
