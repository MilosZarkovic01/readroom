"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReadingStatus } from "@prisma/client";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { IconComment, IconHeart } from "@/components/Icons";
import { StarRating } from "@/components/StarRating";
import { activityVerb, displayName, formatRelativeTime } from "@/lib/social";

export type ActivityComment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
};

export type ActivityItem = {
  id: string;
  status: ReadingStatus;
  rating: number | null;
  review: string | null;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  user: { id: string; name: string | null; email: string };
  book: { title: string; author: string; coverId: number | null };
  comments: ActivityComment[];
};

export function ActivityCard({
  item,
  highlight = false,
}: {
  item: ActivityItem;
  highlight?: boolean;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLElement>(null);
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [comments, setComments] = useState(item.comments);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [showComments, setShowComments] = useState(highlight || item.comments.length > 0);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [when, setWhen] = useState("");
  const name = displayName(item.user);
  const tops = comments.filter((comment) => !comment.parentId);
  const repliesOf = (id: string) => comments.filter((comment) => comment.parentId === id);

  useEffect(() => {
    setWhen(formatRelativeTime(new Date(item.updatedAt)));
  }, [item.updatedAt]);

  useEffect(() => {
    if (highlight) {
      setShowComments(true);
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [highlight]);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => count + (next ? 1 : -1));
    const response = await fetch(`/api/activity/${item.id}/like`, {
      method: next ? "POST" : "DELETE",
    });
    if (!response.ok) {
      setLiked(!next);
      setLikeCount((count) => count + (next ? -1 : 1));
    } else {
      router.refresh();
    }
  }

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/activity/${item.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, parentId: replyTo?.id ?? null }),
      });
      if (!response.ok) return;
      const payload = await response.json();
      setComments((current) => [...current, payload.comment]);
      setBody("");
      setReplyTo(null);
      setShowComments(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function renderComment(comment: ActivityComment, nested = false) {
    return (
      <div key={comment.id} className={nested ? "mt-2 ml-6" : ""}>
        <p className="text-sm">
          <Link href={`/u/${comment.user.id}`} className="font-medium">
            {displayName(comment.user)}
          </Link>{" "}
          <span className="text-warm-gray">{comment.body}</span>
        </p>
        {!nested ? (
          <button
            type="button"
            className="mt-0.5 text-xs text-warm-gray"
            onClick={() => {
              setReplyTo({ id: comment.id, name: displayName(comment.user) });
              setShowComments(true);
            }}
          >
            Reply
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <article
      ref={cardRef}
      id={`activity-${item.id}`}
      className={`border-b border-beige py-5 font-sans ${highlight ? "rounded-2xl bg-ivory px-3" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Link href={`/u/${item.user.id}`}>
          <Avatar name={name} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">
            <Link href={`/u/${item.user.id}`} className="font-medium text-espresso">
              {name}
            </Link>{" "}
            <span className="text-warm-gray">{activityVerb(item)}</span>{" "}
            <span className="font-medium text-espresso">{item.book.title}</span>
          </p>
          <p className="mt-0.5 text-xs text-warm-gray">{when || "\u00a0"}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        <BookCover coverId={item.book.coverId} title={item.book.title} size="XS" />
        <div className="min-w-0">
          <p className="truncate font-medium">{item.book.title}</p>
          <p className="truncate text-sm text-warm-gray">{item.book.author}</p>
          {item.rating != null ? (
            <span className="mt-1 flex items-center gap-1">
              <StarRating value={item.rating} size="sm" />
            </span>
          ) : null}
        </div>
      </div>
      {item.review ? (
        <p className="mt-3 text-sm leading-relaxed text-espresso">&ldquo;{item.review}&rdquo;</p>
      ) : null}
      <div className="mt-3 flex items-center gap-4 text-sm text-warm-gray">
        <button type="button" onClick={() => void toggleLike()} className="flex items-center gap-1.5" aria-label="Like">
          <IconHeart className={`h-5 w-5 ${liked ? "text-terracotta" : ""}`} filled={liked} />
          {likeCount}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((open) => !open)}
          className="flex items-center gap-1.5"
          aria-label="Comments"
        >
          <IconComment className="h-5 w-5" />
          {comments.length}
        </button>
      </div>
      {showComments ? (
        <div className="mt-3 space-y-3">
          {tops.map((comment) => (
            <div key={comment.id}>
              {renderComment(comment)}
              {repliesOf(comment.id).map((reply) => renderComment(reply, true))}
            </div>
          ))}
          <form onSubmit={(event) => void submitComment(event)} className="space-y-2">
            {replyTo ? (
              <p className="flex items-center justify-between text-xs text-warm-gray">
                Replying to {replyTo.name}
                <button type="button" className="text-espresso" onClick={() => setReplyTo(null)}>
                  Cancel
                </button>
              </p>
            ) : null}
            <div className="flex gap-2">
              <input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={280}
                placeholder={replyTo ? `Reply to ${replyTo.name}` : "Add a comment"}
                className="min-w-0 flex-1 rounded-full border border-beige bg-cream px-3 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={busy || !body.trim()}
                className="rounded-full bg-deep-brown px-3 py-2 text-xs font-medium text-ivory disabled:opacity-50"
              >
                {replyTo ? "Reply" : "Post"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </article>
  );
}
