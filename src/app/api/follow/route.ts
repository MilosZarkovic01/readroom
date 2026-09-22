import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const userId = String(body?.userId ?? "");
  if (!userId || userId === session.user.id) {
    return NextResponse.json({ error: "Choose someone else to follow." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "Reader not found." }, { status: 404 });
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: session.user.id, followingId: userId },
    },
  });
  if (!existing) {
    await prisma.follow.create({
      data: { followerId: session.user.id, followingId: userId },
    });
    await notify({
      userId,
      actorId: session.user.id,
      type: "FOLLOW",
    });
  }

  return NextResponse.json({ following: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const userId = String(body?.userId ?? "");
  if (!userId) {
    return NextResponse.json({ error: "Reader is required." }, { status: 400 });
  }

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: userId },
  });

  return NextResponse.json({ following: false });
}
