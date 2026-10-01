"use client";

import { useState, type FormEvent } from "react";
import { notify } from "@/components/AppToaster";
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
  "w-full min-w-0 rounded-xl border border-beige bg-cream px-3 py-2 text-sm font-medium text-espresso outline-none focus:border-walnut";

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
  const [total, setTotal] = useState(pageCount ? String(pageCount) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const knownTotal = Number(total) > 0 ? Number(total) : pageCount;
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
        body: JSON.stringify({ page: Number(page), totalPages: total || undefined }),
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
    <form onSubmit={submit} className="rounded-2xl border border-beige bg-ivory p-3">
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
            className={`mt-1 ${numberClass}`}
          />
        </label>
        <label className="block w-24 shrink-0 text-sm font-medium text-espresso">
          of
          <input
            type="number"
            inputMode="numeric"
            min={1}
            required
            placeholder="pages"
            value={total}
            onChange={(event) => setTotal(event.target.value)}
            className={`mt-1 ${numberClass}`}
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => bump(step)}
            className="rounded-full border border-beige px-2.5 py-1 text-xs font-medium text-walnut"
          >
            +{step}
          </button>
        ))}
        {knownTotal ? (
          <button
            type="button"
            onClick={() => setPage(String(knownTotal))}
            className="rounded-full border border-beige px-2.5 py-1 text-xs font-medium text-walnut"
          >
            Finished
          </button>
        ) : null}
      </div>

      <p className="mt-2 min-h-4 text-xs text-warm-gray">
        {delta > 0
          ? `+${delta.toLocaleString("en-US")} pages since last time`
          : knownTotal && value >= knownTotal
            ? "Saving the last page marks the book as read."
            : !knownTotal
              ? "Add the total for your edition so we can show your progress."
              : null}
      </p>

      {error ? <p className="mt-1.5 text-sm text-terracotta">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || page === ""}
        className="mt-2 w-full rounded-full bg-deep-brown py-2 text-sm font-medium text-ivory disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save page"}
      </button>
    </form>
  );
}

export function EditionPageField({
  entryId,
  pageCount,
  onSaved,
}: {
  entryId: string;
  pageCount: number | null;
  onSaved: (completed: GoalView[]) => void;
}) {
  const [total, setTotal] = useState(pageCount ? String(pageCount) : "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch(`/api/library/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageCountOverride: total === "" ? null : Number(total) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not save the page count.");
      onSaved(readCompletedGoalsFromApi(payload));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save the page count.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-espresso">
        Pages in your edition
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={total}
          onChange={(event) => setTotal(event.target.value)}
          placeholder="Total pages"
          className={`mt-1 ${numberClass}`}
        />
      </label>
      <p className="mt-1 text-xs text-warm-gray">
        Different editions can have different page counts. This stays on your shelf.
      </p>
      <button
        type="button"
        disabled={busy || total === String(pageCount ?? "")}
        onClick={() => void save()}
        className="mt-2 w-full rounded-full border border-beige py-2 text-sm font-medium text-walnut disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save page count"}
      </button>
    </div>
  );
}
