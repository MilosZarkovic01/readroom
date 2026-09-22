import { prisma } from "@/lib/prisma";
import { publishNotification, type LiveNotification } from "@/lib/notification-bus";
import { actorLabel, notificationHeadline, notificationHref, notificationMessage } from "@/lib/notification-copy";

type NotificationRow = {
  id: string;
  type: string;
  actorId: string;
  entryId: string | null;
  commentId: string | null;
  createdAt: Date;
  actor: { id: string; name: string | null; email: string };
};

export async function toLiveNotification(row: NotificationRow): Promise<LiveNotification> {
  const [book, comment] = await Promise.all([
    row.entryId
      ? prisma.libraryEntry.findUnique({
          where: { id: row.entryId },
          include: { book: { select: { title: true } } },
        })
      : null,
    row.commentId
      ? prisma.activityComment.findUnique({
          where: { id: row.commentId },
          select: { body: true },
        })
      : null,
  ]);

  const actorName = actorLabel(row.actor);
  const bookTitle = book?.book.title ?? null;
  const quote = comment?.body ?? null;
  return {
    id: row.id,
    type: row.type,
    actorName,
    headline: notificationHeadline(row.type),
    bookTitle,
    quote,
    createdAt: row.createdAt.toISOString(),
    href: notificationHref({ type: row.type, actorId: row.actorId, entryId: row.entryId }),
    message: notificationMessage({
      type: row.type,
      actorName,
      bookTitle,
      commentBody: quote,
    }),
  };
}

export async function notify(input: {
  userId: string;
  actorId: string;
  type: "LIKE" | "COMMENT" | "REPLY" | "FOLLOW";
  entryId?: string | null;
  commentId?: string | null;
}) {
  if (input.userId === input.actorId) return;

  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      entryId: input.entryId ?? null,
      commentId: input.commentId ?? null,
    },
    include: { actor: { select: { id: true, name: true, email: true } } },
  });

  publishNotification(input.userId, await toLiveNotification(row));
}
