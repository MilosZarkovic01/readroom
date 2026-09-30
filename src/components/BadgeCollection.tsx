"use client";

import { useState } from "react";
import { BadgeIcon, badgeTileClass } from "@/components/BadgeIcon";
import { IconChevron, IconClose, IconLibrary } from "@/components/Icons";
import type { BadgeAward } from "@/lib/badges";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

function formatUnlocked(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function BadgeCollection({ badges }: { badges: BadgeAward[] }) {
  const [open, setOpen] = useState(false);
  const latest = badges.at(-1);
  useBodyScrollLock(open);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-beige bg-ivory px-3 py-3 text-left lg:w-fit lg:gap-2.5 lg:px-2.5 lg:py-2"
      >
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl lg:h-10 lg:w-10 ${
            latest ? badgeTileClass(latest.group) : "bg-beige text-espresso"
          }`}
        >
          {latest ? <BadgeIcon badgeKey={latest.key} /> : <IconLibrary className="h-6 w-6" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-espresso">Badges</span>
          <span className="mt-0.5 block text-sm text-warm-gray">
            {badges.length === 0
              ? "No badges yet"
              : `${badges.length} unlocked`}
          </span>
        </span>
        <IconChevron className="h-5 w-5 shrink-0 text-dusty-peach" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-espresso/35 lg:items-center lg:p-6">
          <div className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-t-3xl bg-ivory px-5 pb-8 pt-4 lg:max-h-[min(85vh,760px)] lg:max-w-lg lg:rounded-3xl lg:shadow-[0_24px_80px_rgba(45,33,27,0.18)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-espresso">Badges</h2>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cream"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-sm text-warm-gray">
              {badges.length === 0
                ? "Badges appear here as you read, rate, and review."
                : `${badges.length} unlocked`}
            </p>
            {badges.length === 0 ? null : (
              <ul className="space-y-2">
                {badges.map((badge, index) => (
                  <li
                    key={badge.key}
                    className="badge-in flex items-start gap-3 rounded-2xl border border-beige bg-cream/70 px-3 py-3"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${badgeTileClass(badge.group)}`}
                    >
                      <BadgeIcon badgeKey={badge.key} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-medium text-espresso">{badge.name}</p>
                      <p className="mt-0.5 text-sm text-warm-gray">{badge.description}</p>
                      <p className="mt-1 text-xs text-walnut">Unlocked {formatUnlocked(badge.unlockedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
