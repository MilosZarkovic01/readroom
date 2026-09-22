import { displayName } from "@/lib/social";

export function notificationHref(item: { type: string; actorId: string; entryId: string | null }) {
  if (item.type === "FOLLOW") return `/u/${item.actorId}`;
  if (item.entryId) return `/friends?post=${item.entryId}`;
  return `/u/${item.actorId}`;
}

export function notificationHeadline(type: string) {
  if (type === "LIKE") return "Liked your update";
  if (type === "REPLY") return "Replied to you";
  if (type === "COMMENT") return "Left a comment";
  return "Started following you";
}

export function notificationMessage(item: {
  type: string;
  actorName: string;
  bookTitle: string | null;
  commentBody: string | null;
}) {
  const headline = notificationHeadline(item.type).toLowerCase();
  if (item.type === "LIKE") {
    return `${item.actorName} liked your update${item.bookTitle ? ` on ${item.bookTitle}` : ""}`;
  }
  if (item.type === "REPLY") {
    return item.commentBody
      ? `${item.actorName} replied: “${item.commentBody}”`
      : `${item.actorName} replied to your comment`;
  }
  if (item.type === "COMMENT") {
    return item.commentBody
      ? `${item.actorName} commented${item.bookTitle ? ` on ${item.bookTitle}` : ""}: “${item.commentBody}”`
      : `${item.actorName} commented on your update`;
  }
  return `${item.actorName} ${headline}`;
}

export function actorLabel(user: { name?: string | null; email: string }) {
  return displayName(user);
}
