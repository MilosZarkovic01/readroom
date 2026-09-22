import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id },
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const following = await prisma.follow.findMany({
    where: { followerId: session.user.id, followingId: { in: users.map((user) => user.id) } },
    select: { followingId: true },
  });
  const followingIds = new Set(following.map((row) => row.followingId));

  return NextResponse.json({
    users: users.map((user) => ({ ...user, following: followingIds.has(user.id) })),
  });
}
