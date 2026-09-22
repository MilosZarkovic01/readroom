import type { ReadingStatus } from "@prisma/client";

export function displayName(user: { name?: string | null; email: string }) {
  if (user.name?.trim()) return user.name.trim();
  return user.email.split("@")[0];
}

export function activityVerb(entry: {
  status: ReadingStatus;
  rating: number | null;
  review: string | null;
}) {
  if (entry.review) return "reviewed";
  if (entry.rating != null) return "rated";
  if (entry.status === "READING") return "is reading";
  if (entry.status === "WANT_TO_READ") return "wants to read";
  return "finished";
}

export function formatRelativeTime(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
