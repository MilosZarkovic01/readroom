"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  IconBookMark,
  IconChevron,
  IconClose,
  IconLibrary,
  IconOpenBook,
  IconTarget,
} from "@/components/Icons";
import {
  formatAmount,
  goalTitle,
  MAX_ACTIVE_GOALS,
  motivationLine,
  type GoalLists,
  type GoalType,
  type GoalView,
} from "@/lib/goals";

export type GoalShelfBook = { id: string; title: string };

type Timeframe = "open" | "month" | "year" | "custom";

const TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "BOOK_COUNT", label: "Books" },
  { value: "PAGE_COUNT", label: "Pages" },
  { value: "BOOK", label: "A book" },
];

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "open", label: "From today" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
];

const inputClass =
  "mt-1.5 w-full rounded-full border border-beige bg-cream px-4 py-2.5 text-sm text-espresso outline-none focus:border-walnut";

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function timeframeLabel(goal: GoalView) {
  if (goal.endsAt) return `By ${formatDate(goal.endsAt)}`;
  return `Since ${formatDate(goal.startsAt)}`;
}

function toDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromDateInput(value: string, endOfDay: boolean) {
  const [year, month, day] = value.split("-").map(Number);
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day);
}

function timeframeRange(timeframe: Timeframe, customStart: string, customEnd: string) {
  const now = new Date();
  if (timeframe === "month") {
    return {
      startsAt: new Date(now.getFullYear(), now.getMonth(), 1),
      endsAt: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (timeframe === "year") {
    return {
      startsAt: new Date(now.getFullYear(), 0, 1),
      endsAt: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  if (timeframe === "custom") {
    return {
      startsAt: customStart ? fromDateInput(customStart, false) : new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      endsAt: customEnd ? fromDateInput(customEnd, true) : null,
    };
  }
  return { startsAt: new Date(now.getFullYear(), now.getMonth(), now.getDate()), endsAt: null };
}

function GoalTypeIcon({ type, className }: { type: GoalType; className?: string }) {
  if (type === "BOOK") return <IconBookMark className={className} />;
  if (type === "PAGE_COUNT") return <IconOpenBook className={className} />;
  return <IconLibrary className={className} />;
}

function ProgressBar({ goal }: { goal: GoalView }) {
  const { percent, done } = goal.progress;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-beige"
      role="progressbar"
      aria-label={goalTitle(goal)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${done ? "bg-sage" : "bg-dusty-peach"}`}
        style={{ width: `${Math.max(percent, done ? 100 : 3)}%` }}
      />
    </div>
  );
}

function progressCount(goal: GoalView) {
  const { current, target, done } = goal.progress;
  if (goal.type === "BOOK") return done ? "Finished" : "Not finished yet";
  return `${current.toLocaleString("en-US")} / ${formatAmount(goal.type, target)}`;
}

function GoalRow({
  goal,
  onDelete,
  busy,
}: {
  goal: GoalView;
  onDelete?: (goal: GoalView) => void;
  busy?: boolean;
}) {
  const muted = goal.progress.expired;
  return (
    <li className="rounded-2xl border border-beige bg-cream/70 px-3 py-3">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            goal.progress.done ? "bg-sage/15 text-walnut" : "bg-dusty-peach/35 text-deep-brown"
          }`}
        >
          <GoalTypeIcon type={goal.type} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${muted ? "text-warm-gray" : "text-espresso"}`}>{goalTitle(goal)}</p>
          <p className="mt-0.5 text-xs text-walnut">{timeframeLabel(goal)}</p>
        </div>
        {onDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(goal)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-warm-gray hover:bg-beige disabled:opacity-50"
            aria-label={`Remove goal: ${goalTitle(goal)}`}
          >
            <IconClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-3">
        <ProgressBar goal={goal} />
        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
          <span className="text-warm-gray">{motivationLine(goal.type, goal.progress)}</span>
          <span className="shrink-0 font-medium text-espresso">{progressCount(goal)}</span>
        </div>
      </div>
    </li>
  );
}

function AddGoalForm({ shelfBooks, onCreated }: { shelfBooks: GoalShelfBook[]; onCreated: () => void }) {
  const [type, setType] = useState<GoalType>("BOOK_COUNT");
  const [target, setTarget] = useState("12");
  const [bookId, setBookId] = useState(shelfBooks[0]?.id ?? "");
  const [timeframe, setTimeframe] = useState<Timeframe>("year");
  const [customStart, setCustomStart] = useState(() => toDateInput(new Date()));
  const [customEnd, setCustomEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { startsAt, endsAt } = timeframeRange(timeframe, customStart, customEnd);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          target: type === "BOOK" ? null : Number(target),
          bookId: type === "BOOK" ? bookId : null,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt?.toISOString() ?? null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not save your goal.");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your goal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-beige bg-ivory p-4">
      <p className="font-medium text-espresso">New goal</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Goal type">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={type === option.value}
            onClick={() => setType(option.value)}
            className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-xs font-medium ${
              type === option.value ? "border-espresso bg-cream text-espresso" : "border-beige text-warm-gray"
            }`}
          >
            <GoalTypeIcon type={option.value} className="h-5 w-5" />
            {option.label}
          </button>
        ))}
      </div>

      {type === "BOOK" ? (
        shelfBooks.length === 0 ? (
          <p className="text-sm text-warm-gray">
            Add a book to your Want to read or Reading shelf first.
          </p>
        ) : (
          <label className="block text-sm font-medium text-espresso">
            Book
            <select
              value={bookId}
              onChange={(event) => setBookId(event.target.value)}
              className={`${inputClass} appearance-none`}
            >
              {shelfBooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>
        )
      ) : (
        <label className="block text-sm font-medium text-espresso">
          {type === "PAGE_COUNT" ? "Pages to read" : "Books to finish"}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={type === "PAGE_COUNT" ? 1_000_000 : 1000}
            required
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className={inputClass}
          />
          {type === "PAGE_COUNT" ? (
            <span className="mt-1 block text-xs font-normal text-warm-gray">
              Books without a page count don&apos;t add pages.
            </span>
          ) : null}
        </label>
      )}

      <div>
        <p className="text-sm font-medium text-espresso">Timeframe</p>
        <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Timeframe">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={timeframe === option.value}
              onClick={() => setTimeframe(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                timeframe === option.value ? "border-espresso bg-cream text-espresso" : "border-beige text-warm-gray"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {timeframe === "custom" ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block text-xs font-medium text-walnut">
              Start
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-medium text-walnut">
              End (optional)
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(event) => setCustomEnd(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-terracotta">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || (type === "BOOK" && shelfBooks.length === 0)}
        className="w-full rounded-full bg-deep-brown py-3 text-sm font-medium text-ivory disabled:opacity-50"
      >
        {busy ? "Saving..." : "Set goal"}
      </button>
    </form>
  );
}

function summary(goals: GoalLists, editable: boolean) {
  const parts: string[] = [];
  if (goals.active.length) parts.push(`${goals.active.length} active`);
  if (goals.completed.length) parts.push(`${goals.completed.length} completed`);
  if (parts.length) return parts.join(" · ");
  return editable ? "Set your first goal" : "No goals yet";
}

export function GoalsCard({
  goals,
  editable,
  shelfBooks = [],
}: {
  goals: GoalLists;
  editable: boolean;
  shelfBooks?: GoalShelfBook[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const past = [...goals.completed, ...goals.ended];
  const canAdd = editable && goals.active.length < MAX_ACTIVE_GOALS;
  const bookGoalIds = new Set(goals.active.flatMap((goal) => (goal.bookId ? [goal.bookId] : [])));
  const availableBooks = shelfBooks.filter((book) => !bookGoalIds.has(book.id));

  async function remove(goal: GoalView) {
    if (!confirm(`Remove the goal “${goalTitle(goal)}”?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Remove failed");
      router.refresh();
    } catch {
      alert("Could not remove that goal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setAdding(editable && goals.active.length === 0 && past.length === 0);
        }}
        className="flex w-full items-center gap-3 rounded-2xl border border-beige bg-ivory px-3 py-3 text-left lg:w-fit lg:gap-2.5 lg:px-2.5 lg:py-2"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dusty-peach/35 text-deep-brown lg:h-10 lg:w-10">
          <IconTarget className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-espresso">Goals</span>
          <span className="mt-0.5 block text-sm text-warm-gray">{summary(goals, editable)}</span>
        </span>
        <IconChevron className="h-5 w-5 shrink-0 text-dusty-peach" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-espresso/35 lg:items-center lg:p-6">
          <div className="max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-ivory px-5 pb-8 pt-4 text-left lg:max-h-[min(85vh,760px)] lg:max-w-lg lg:rounded-3xl lg:shadow-[0_24px_80px_rgba(45,33,27,0.18)]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-espresso">Reading goals</h2>
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
              {goals.active.length
                ? `${goals.active.length} in progress`
                : editable
                  ? "Pick something to aim for. Every finished book moves you forward."
                  : "No active goals right now."}
            </p>

            {goals.active.length ? (
              <ul className="space-y-2">
                {goals.active.map((goal) => (
                  <GoalRow key={goal.id} goal={goal} busy={busy} onDelete={editable ? remove : undefined} />
                ))}
              </ul>
            ) : null}

            {editable ? (
              <div className="mt-4">
                {adding ? (
                  <AddGoalForm
                    shelfBooks={availableBooks}
                    onCreated={() => {
                      setAdding(false);
                      router.refresh();
                    }}
                  />
                ) : canAdd ? (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="w-full rounded-full border border-dashed border-walnut/40 py-3 text-sm font-medium text-walnut"
                  >
                    Add goal
                  </button>
                ) : (
                  <p className="text-center text-xs text-warm-gray">
                    You have {MAX_ACTIVE_GOALS} active goals. Finish or remove one to add another.
                  </p>
                )}
              </div>
            ) : null}

            {past.length ? (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium text-espresso">
                  Past goals ({past.length})
                </summary>
                <ul className="mt-3 space-y-2">
                  {past.map((goal) => (
                    <GoalRow key={goal.id} goal={goal} busy={busy} onDelete={editable ? remove : undefined} />
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function GoalsStrip({ goals }: { goals: GoalView[] }) {
  if (goals.length === 0) return null;
  return (
    <ul className="mt-3 grid gap-2 lg:grid-cols-2">
      {goals.slice(0, 2).map((goal) => (
        <li key={goal.id} className="rounded-2xl border border-beige bg-ivory px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-espresso">
              <GoalTypeIcon type={goal.type} className="h-4 w-4 shrink-0 text-walnut" />
              <span className="truncate">{goalTitle(goal)}</span>
            </span>
            <span className="shrink-0 text-xs font-medium text-walnut">{goal.progress.percent}%</span>
          </div>
          <div className="mt-2">
            <ProgressBar goal={goal} />
          </div>
          <p className="mt-1.5 text-xs text-warm-gray">{motivationLine(goal.type, goal.progress)}</p>
        </li>
      ))}
    </ul>
  );
}
