"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReadingStatus } from "@prisma/client";
import { BadgeUnlockModal } from "@/components/BadgeUnlockModal";
import { BookCover } from "@/components/BookCover";
import { IconChevron, IconClose } from "@/components/Icons";
import { ShelfPicker } from "@/components/ShelfPicker";
import { StarRating } from "@/components/StarRating";
import { GoalCompleteModal } from "@/components/GoalCompleteModal";
import { readUnlockedFromApi, type BadgeAward } from "@/lib/badges";
import { readCompletedGoalsFromApi, type GoalView } from "@/lib/goals";
import { formatRating } from "@/lib/rating";
import { STATUSES, STATUS_SHORT } from "@/lib/status";
import { CategoryChips } from "@/components/CategoryChips";
import { notify } from "@/components/AppToaster";
import { EditionPageField, PageProgressBar, PageProgressForm, type ProgressSaveResult } from "@/components/ReadingProgress";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

export type LibraryCardEntry = {
  id: string;
  status: ReadingStatus;
  rating: number | null;
  review: string | null;
  book: {
    title: string;
    author: string;
    coverId: number | null;
    firstPublishYear: number | null;
    description: string | null;
    subjects: string[];
    pageCount: number | null;
  };
  currentPage: number | null;
};

export function LibraryCard({ entry }: { entry: LibraryCardEntry }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(entry.status);
  const [rating, setRating] = useState<number | null>(entry.rating);
  const [review, setReview] = useState(entry.review ?? "");
  const [unlocked, setUnlocked] = useState<BadgeAward[]>([]);
  const [completedGoals, setCompletedGoals] = useState<GoalView[]>([]);
  const [leaving, setLeaving] = useState(false);
  useBodyScrollLock(open);

  async function patch(body: {
    status?: ReadingStatus;
    rating?: number | null;
    review?: string | null;
  }) {
    setBusy(true);
    try {
      const response = await fetch(`/api/library/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not save your review.");
      }
      celebrateThenRefresh(readUnlockedFromApi(payload), readCompletedGoalsFromApi(payload));
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save your review.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function celebrateThenRefresh(awards: BadgeAward[], goals: GoalView[]) {
    if (awards.length || goals.length) {
      setOpen(false);
      setUnlocked(awards);
      setCompletedGoals(goals);
      return;
    }
    router.refresh();
  }

  function progressSaved(result: ProgressSaveResult) {
    setStatus(result.status);
    if (result.finished) setOpen(false);
    celebrateThenRefresh(result.unlocked, result.completedGoals);
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

  async function remove() {
    setOpen(false);
    setLeaving(true);
    setBusy(true);
    try {
      const [response] = await Promise.all([
        fetch(`/api/library/${entry.id}`, { method: "DELETE" }),
        new Promise((resolve) => window.setTimeout(resolve, 180)),
      ]);
      if (!response.ok) throw new Error("Could not remove that book.");
      router.refresh();
    } catch (error) {
      setLeaving(false);
      notify(error instanceof Error ? error.message : "Could not remove that book.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-3 py-3 text-left xl:border-b xl:border-beige xl:transition-colors xl:hover:bg-cream/70 ${leaving ? "item-leave" : ""}`}
      >
        <BookCover coverId={entry.book.coverId} title={entry.book.title} size="XS" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-espresso">{entry.book.title}</span>
          <span className="mt-0.5 block truncate text-sm text-warm-gray">{entry.book.author}</span>
          {entry.status === "READING" ? (
            <PageProgressBar
              currentPage={entry.currentPage}
              pageCount={entry.book.pageCount}
              className="mt-1.5 max-w-64"
            />
          ) : (
            <span className="mt-1 flex items-center gap-2">
              <StarRating value={rating} size="sm" />
              {rating ? <span className="text-xs text-warm-gray">{formatRating(rating)}</span> : null}
            </span>
          )}
        </span>
        <IconChevron className="h-5 w-5 shrink-0 text-dusty-peach" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-espresso/35 lg:items-center lg:p-6">
          <div className="max-h-[90dvh] w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-t-3xl bg-ivory px-5 pb-8 pt-4 lg:max-h-[min(85vh,760px)] lg:max-w-lg lg:rounded-3xl lg:shadow-[0_24px_80px_rgba(45,33,27,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-espresso">Edit library</h2>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cream"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-5 flex gap-3">
              <BookCover coverId={entry.book.coverId} title={entry.book.title} size="S" />
              <div>
                <p className="font-medium text-espresso">{entry.book.title}</p>
                <p className="text-sm text-warm-gray">{entry.book.author}</p>
                <p className="mt-1 text-xs text-warm-gray">{STATUS_SHORT[entry.status]}</p>
              </div>
            </div>
            {entry.book.description ? (
              <p className="mb-5 text-sm leading-relaxed text-warm-gray">{entry.book.description}</p>
            ) : null}
            {status === "READING" ? (
              <div className="mb-5">
                <p className="mb-2 text-sm font-medium text-espresso">Reading progress</p>
                <PageProgressForm
                  key={entry.book.pageCount ?? "unknown"}
                  entryId={entry.id}
                  currentPage={entry.currentPage}
                  pageCount={entry.book.pageCount}
                  onSaved={progressSaved}
                />
              </div>
            ) : (
              <EditionPageField
                key={entry.book.pageCount ?? "unknown"}
                entryId={entry.id}
                pageCount={entry.book.pageCount}
                onSaved={(completed) => celebrateThenRefresh([], completed)}
              />
            )}
            <CategoryChips subjects={entry.book.subjects} />
            <p className="mb-2 text-sm font-medium text-espresso">Status</p>
            <ShelfPicker
              value={status}
              onChange={(next) => {
                setStatus(next);
                void patch({ status: next }).then((saved) => {
                  if (!saved) setStatus(entry.status);
                });
              }}
            />
            <p className="mt-5 mb-2 text-sm font-medium text-espresso">Rating</p>
            <StarRating value={rating} disabled={busy} onChange={setRating} />
            <label className="mt-5 block text-sm font-medium text-espresso">
              Review
              <textarea
                value={review}
                maxLength={500}
                onChange={(event) => setReview(event.target.value)}
                placeholder="What did you think about this book?"
                className="mt-2 h-24 w-full rounded-2xl border border-beige bg-cream px-3 py-2 text-sm font-normal text-espresso outline-none"
              />
              <span className="mt-1 block text-xs font-normal text-warm-gray">{review.length}/500</span>
            </label>
            <button
              type="button"
              className="mt-4 w-full rounded-full bg-deep-brown py-3.5 text-sm font-medium text-ivory disabled:opacity-50"
              disabled={busy}
              onClick={() => void patch({ rating, review })}
            >
              Save review
            </button>
            <button
              type="button"
              className="mt-3 w-full text-sm text-terracotta"
              disabled={busy}
              onClick={() => void remove()}
            >
              Remove from library
            </button>
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

export function LibraryTabs({
  entries,
  initial,
}: {
  entries: LibraryCardEntry[];
  initial?: ReadingStatus;
}) {
  const [tab, setTab] = useState<ReadingStatus>(initial ?? "READ");
  const shelf = entries.filter((entry) => entry.status === tab);

  return (
    <div>
      <div className="flex gap-6 border-b border-beige">
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setTab(status)}
            className={`-mb-px pb-2 text-sm ${
              tab === status
                ? "border-b-2 border-espresso font-medium text-espresso"
                : "text-warm-gray"
            }`}
          >
            {STATUS_SHORT[status]}
          </button>
        ))}
      </div>
      {shelf.length === 0 ? (
        <p className="pt-10 text-center text-sm text-warm-gray">Nothing on this shelf yet.</p>
      ) : (
        <div className="divide-y divide-beige xl:grid xl:grid-cols-2 xl:gap-x-8 xl:divide-y-0">
          {shelf.map((entry) => (
            <div key={entry.id} className="xl:min-w-0">
              <LibraryCard entry={entry} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
