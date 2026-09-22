import { prisma } from "@/lib/prisma";
import type { ActivityComment, ActivityItem } from "@/components/ActivityCard";

const activityInclude = {
  user: { select: { id: true, name: true, email: true } },
  book: { select: { title: true, author: true, coverId: true } },
  likes: { select: { userId: true } },
  comments: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

type FeedEntry = {
  id: string;
  status: ActivityItem["status"];
  rating: number | null;
  review: string | null;
  updatedAt: Date;
  user: { id: string; name: string | null; email: string };
  book: { title: string; author: string; coverId: number | null };
  likes: { userId: string }[];
  comments: {
    id: string;
    parentId: string | null;
    body: string;
    createdAt: Date;
    user: { id: string; name: string | null; email: string };
  }[];
};

function latestActivityAt(entry: FeedEntry) {
  const times = [entry.updatedAt.getTime(), ...entry.comments.map((comment) => comment.createdAt.getTime())];
  return Math.max(...times);
}

export function serializeActivity(entry: FeedEntry, viewerId: string): ActivityItem {
  return {
    id: entry.id,
    status: entry.status,
    rating: entry.rating,
    review: entry.review,
    updatedAt: entry.updatedAt.toISOString(),
    likeCount: entry.likes.length,
    commentCount: entry.comments.length,
    liked: entry.likes.some((like) => like.userId === viewerId),
    user: entry.user,
    book: entry.book,
    comments: entry.comments.map(
      (comment): ActivityComment => ({
        id: comment.id,
        parentId: comment.parentId,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        user: comment.user,
      }),
    ),
  };
}

export async function getFriendsFeed(viewerId: string, take = 40) {
  const follows = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const authorIds = [...new Set([viewerId, ...follows.map((row) => row.followingId)])];

  const entries = await prisma.libraryEntry.findMany({
    where: { userId: { in: authorIds } },
    include: activityInclude,
    take: take * 2,
  });

  return entries
    .sort((a, b) => latestActivityAt(b) - latestActivityAt(a))
    .slice(0, take)
    .map((entry) => serializeActivity(entry, viewerId));
}
