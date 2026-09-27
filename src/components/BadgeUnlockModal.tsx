"use client";

import { useEffect, useState } from "react";
import { BadgeConfetti } from "@/components/BadgeConfetti";
import { BadgeIcon, badgeTileClass } from "@/components/BadgeIcon";
import type { BadgeAward } from "@/lib/badges";

export function BadgeUnlockModal({
  badges,
  onDone,
}: {
  badges: BadgeAward[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const badge = badges[index];

  useEffect(() => {
    setIndex(0);
  }, [badges]);

  if (!badge) return null;

  const last = index === badges.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 px-6">
      <div
        role="dialog"
        aria-labelledby="badge-unlock-title"
        aria-describedby="badge-unlock-copy"
        className="badge-unlock-in w-full max-w-[360px] rounded-[28px] border border-beige bg-ivory px-6 py-8 text-center"
      >
        <p className="text-xs tracking-[0.18em] text-walnut uppercase">New badge</p>
        <span className="relative mx-auto mt-5 block h-28 w-full">
          <BadgeConfetti burstKey={`${badge.key}-${index}`} />
          <span
            className={`badge-unlock-glow relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-[22px] ${badgeTileClass(badge.group)}`}
          >
            <span className="badge-unlock-mark inline-flex">
              <BadgeIcon badgeKey={badge.key} className="h-9 w-9" />
            </span>
          </span>
        </span>
        <h2 id="badge-unlock-title" className="mt-5 font-serif text-3xl text-espresso">
          {badge.name}
        </h2>
        <p id="badge-unlock-copy" className="mt-2 text-sm leading-relaxed text-warm-gray">
          {badge.description}
        </p>
        {badges.length > 1 ? (
          <p className="mt-3 text-xs text-walnut">
            {index + 1} of {badges.length}
          </p>
        ) : null}
        <button
          type="button"
          className="mt-7 w-full rounded-full bg-deep-brown py-3.5 text-sm font-medium text-ivory"
          onClick={() => {
            if (last) onDone();
            else setIndex((current) => current + 1);
          }}
        >
          {last ? "Continue" : "Next"}
        </button>
      </div>
    </div>
  );
}
