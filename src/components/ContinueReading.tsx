"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeUnlockModal } from "@/components/BadgeUnlockModal";
import { BookCover } from "@/components/BookCover";
import { GoalCompleteModal } from "@/components/GoalCompleteModal";
import { IconClose } from "@/components/Icons";
import { PageProgressBar, PageProgressForm, type ProgressSaveResult } from "@/components/ReadingProgress";
import type { BadgeAward } from "@/lib/badges";
import type { GoalView } from "@/lib/goals";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

export type ContinueReadingItem = {
  entryId: string;
  title: string;
  author: string;
  coverId: number | null;
  pageCount: number | null;
  currentPage: number | null;
};

export function ContinueReadingList({ items }: { items: ContinueReadingItem[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<BadgeAward[]>([]);
  const [completedGoals, setCompletedGoals] = useState<GoalView[]>([]);
  const open = items.find((item) => item.entryId === openId) ?? null;
  useBodyScrollLock(open != null);

  function saved(result: ProgressSaveResult) {
    setOpenId(null);
    if (result.unlocked.length || result.completedGoals.length) {
      setUnlocked(result.unlocked);
      setCompletedGoals(result.completedGoals);
      return;
    }
    router.refresh();
  }

  function finishCelebration() {
    if (unlocked.length) {
      setUnlocked([]);
      if (completedGoals.length) return;
    } else {
      setCompletedGoals([]);
    }
    router.refresh();
  }

  return (
    <>
      <ul className="mt-2 divide-y divide-beige lg:grid lg:grid-cols-3 lg:gap-x-6 lg:divide-y-0">
        {items.map((item) => (
          <li key={item.entryId}>
            <button
              type="button"
              onClick={() => setOpenId(item.entryId)}
              className="flex w-full items-center gap-3 py-3 text-left"
              aria-label={`Update progress for ${item.title}`}
            >
              <BookCover coverId={item.coverId} title={item.title} size="XS" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="block truncate text-sm text-warm-gray">{item.author}</span>
                <PageProgressBar currentPage={item.currentPage} pageCount={item.pageCount} className="mt-1.5" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-espresso/35 lg:items-center lg:p-6">
          <div className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-t-3xl bg-ivory px-5 pb-8 pt-4 lg:max-w-md lg:rounded-3xl lg:shadow-[0_24px_80px_rgba(45,33,27,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-espresso">Update progress</h2>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cream"
                onClick={() => setOpenId(null)}
                aria-label="Close"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3">
              <BookCover coverId={open.coverId} title={open.title} size="XS" />
              <div className="min-w-0">
                <p className="truncate font-medium text-espresso">{open.title}</p>
                <p className="truncate text-sm text-warm-gray">{open.author}</p>
              </div>
            </div>
            <PageProgressForm
              key={open.entryId}
              entryId={open.entryId}
              currentPage={open.currentPage}
              pageCount={open.pageCount}
              onSaved={saved}
            />
            <Link href="/library?shelf=READING" className="mt-4 block text-center text-sm text-warm-gray">
              Open in library
            </Link>
          </div>
        </div>
      ) : null}

      {unlocked.length ? (
        <BadgeUnlockModal badges={unlocked} onDone={finishCelebration} />
      ) : completedGoals.length ? (
        <GoalCompleteModal goals={completedGoals} onDone={finishCelebration} />
      ) : null}
    </>
  );
}
