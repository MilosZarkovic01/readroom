"use client";

import { useState, type FormEvent } from "react";
import type { ReadingStatus } from "@prisma/client";
import type { BadgeAward } from "@/lib/badges";
import { readUnlockedFromApi } from "@/lib/badges";
import { readCompletedGoalsFromApi, type GoalView } from "@/lib/goals";
import { progressPercent } from "@/lib/progress";

export type ProgressSaveResult = {
  currentPage: number;
  pageCount: number | null;
  status: ReadingStatus;
  finished: boolean;
  unlocked: BadgeAward[];
  completedGoals: GoalView[];
};

export function PageProgressBar({
  currentPage,
  pageCount,
  className = "",
}: {
  currentPage: number | null;
  pageCount: number | null;
  className?: string;
}) {
  const percent = progressPercent(currentPage, pageCount);
  const label = currentPage
    ? pageCount
      ? `Page ${currentPage.toLocaleString("en-US")} of ${pageCount.toLocaleString("en-US")}`
      : `Page ${currentPage.toLocaleString("en-US")}`
    : "Tap to log your page";

  return (
    <span className={`block ${className}`}>
      <span className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-warm-gray">{label}</span>
        {currentPage && pageCount ? <span className="shrink-0 font-medium text-walnut">{percent}%</span> : null}
      </span>
      <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-beige">
        <span
          className="block h-full rounded-full bg-dusty-peach transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </span>
    </span>
  );
}

const STEPS = [10, 25, 50];

const numberClass =
  "w-full min-w-0 rounded-2xl border border-beige bg-cream px-4 py-3 text-lg font-medium text-espresso outline-none focus:border-walnut";

export function PageProgressForm({
  entryId,
  currentPage,
  pageCount,
  onSaved,
}: {
  entryId: string;
  currentPage: number | null;
  pageCount: number | null;
  onSaved: (result: ProgressSaveResult) => void;
}) {
  const [page, setPage] = useState(currentPage ? String(currentPage) : "");
  const [total, setTotal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const knownTotal = pageCount ?? (Number(total) > 0 ? Number(total) : null);
  const value = Number(page);
  const delta = page !== "" && Number.isFinite(value) ? value - (currentPage ?? 0) : 0;

  function bump(step: number) {
    const base = page === "" ? (currentPage ?? 0) : Number(page) || 0;
    const next = knownTotal ? Math.min(knownTotal, base + step) : base + step;
    setPage(String(next));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/library/${entryId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: Number(page), totalPages: pageCount ? undefined : total || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not save your page.");
      onSaved({
        currentPage: payload.currentPage,
        pageCount: payload.pageCount,
        status: payload.status,
        finished: Boolean(payload.finished),
        unlocked: readUnlockedFromApi(payload),
        completedGoals: readCompletedGoalsFromApi(payload),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your page.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-beige bg-ivory p-4">
      <div className="flex items-end gap-2">
        <label className="block min-w-0 flex-1 text-sm font-medium text-espresso">
          I&apos;m on page
          <input
            type="number"
            inputMode="numeric"
            enterKeyHint="done"
            min={0}
            max={knownTotal ?? undefined}
            required
            value={page}
            onChange={(event) => setPage(event.target.value)}
            onFocus={(event) => event.target.select()}
            className={`mt-1.5 ${numberClass}`}
          />
        </label>
        {pageCount ? (
          <span className="pb-3.5 text-sm text-warm-gray">of {pageCount.toLocaleString("en-US")}</span>
        ) : (
          <label className="block w-28 shrink-0 text-sm font-medium text-espresso">
            of
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="pages"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              className={`mt-1.5 ${numberClass}`}
            />
          </label>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => bump(step)}
            className="rounded-full border border-beige px-3 py-1.5 text-xs font-medium text-walnut"
          >
            +{step}
          </button>
        ))}
        {knownTotal ? (
          <button
            type="button"
            onClick={() => setPage(String(knownTotal))}
            className="rounded-full border border-beige px-3 py-1.5 text-xs font-medium text-walnut"
          >
            Finished
          </button>
        ) : null}
      </div>

      <p className="mt-3 min-h-4 text-xs text-warm-gray">
        {delta > 0
          ? `+${delta.toLocaleString("en-US")} pages since last time`
          : knownTotal && value >= knownTotal
            ? "Saving the last page marks the book as read."
            : pageCount
              ? null
              : "Add the total once so we can show your progress."}
      </p>

      {error ? <p className="mt-2 text-sm text-terracotta">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || page === ""}
        className="mt-3 w-full rounded-full bg-deep-brown py-3 text-sm font-medium text-ivory disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save page"}
      </button>
    </form>
  );
}
