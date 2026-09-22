"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { IconClose, IconComment, IconFriends, IconHeart } from "@/components/Icons";
import type { LiveNotification } from "@/lib/notification-bus";
import { notificationHeadline } from "@/lib/notification-copy";

function TypeMark({ type }: { type: string }) {
  return (
    <span className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full bg-deep-brown text-ivory">
      {type === "LIKE" ? (
        <IconHeart className="h-3 w-3" filled />
      ) : type === "FOLLOW" ? (
        <IconFriends className="h-3 w-3" />
      ) : (
        <IconComment className="h-3 w-3" />
      )}
    </span>
  );
}

export function NotificationCard({
  item,
  compact = false,
  onDismiss,
}: {
  item: LiveNotification;
  compact?: boolean;
  onDismiss?: () => void;
}) {
  const headline = item.headline || notificationHeadline(item.type);

  return (
    <Link
      href={item.href}
      onClick={onDismiss}
      className={`block font-sans ${
        compact
          ? "rounded-[1.35rem] bg-ivory/95 shadow-[0_18px_40px_rgba(45,33,27,0.14)] ring-1 ring-beige/80 backdrop-blur-sm"
          : "rounded-[1.5rem] bg-cream/70 ring-1 ring-beige/70"
      }`}
    >
      <div className={`relative flex items-start gap-3 ${compact ? "px-4 py-3.5 pl-[1.35rem] pr-4" : "px-5 py-4 pl-[1.4rem]"}`}>
        <span className="absolute inset-y-3 left-2.5 w-[3px] rounded-full bg-gradient-to-b from-terracotta to-dusty-peach" />
        <div className="relative shrink-0">
          <Avatar name={item.actorName} size="sm" />
          <TypeMark type={item.type} />
        </div>
        <div className="min-w-0 flex-1 pr-1">
          <p className="truncate text-[13px] font-medium tracking-tight text-espresso">{item.actorName}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-warm-gray">{headline}</p>
          {item.bookTitle ? (
            <p className="mt-1.5 truncate text-xs font-medium text-walnut">{item.bookTitle}</p>
          ) : null}
          {item.quote ? (
            <p className="mt-2 break-words rounded-xl bg-ivory px-3 py-2 text-[13px] leading-relaxed text-espresso/90 ring-1 ring-beige/60">
              “{item.quote}”
            </p>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            aria-label="Dismiss"
            className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-warm-gray/70 hover:bg-cream hover:text-espresso"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDismiss();
            }}
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </Link>
  );
}
