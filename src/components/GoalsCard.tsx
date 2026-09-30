"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { notify } from "@/components/AppToaster";
import { GoalCompleteModal } from "@/components/GoalCompleteModal";
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
  GOAL_PERIODS,
  goalTitle,
  MAX_ACTIVE_GOALS,
  motivationLine,
  periodNowLabel,
  streakLabel,
  readCompletedGoalsFromApi,
  type GoalLists,
  type GoalPeriod,
  type GoalType,
  type GoalView,
} from "@/lib/goals";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

export type GoalShelfBook = { id: string; title: string };

type Timeframe = "open" | "month" | "year" | "custom";

const TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "PAGE_COUNT", label: "Pages" },
  { value: "BOOK_COUNT", label: "Books" },
  { value: "BOOK", label: "A book" },
];

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  TOTAL: "In total",
  DAILY: "Per day",
  WEEKLY: "Per week",
};

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "open", label: "From today" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
];

const DEFAULT_TARGETS: Record<Exclude<GoalType, "BOOK">, Record<GoalPeriod, string>> = {
  PAGE_COUNT: { TOTAL: "3000", DAILY: "20", WEEKLY: "150" },
  BOOK_COUNT: { TOTAL: "12", DAILY: "1", WEEKLY: "1" },
};

const inputClass =
  "mt-1.5 block w-full min-w-0 rounded-2xl border border-beige bg-cream px-4 py-2.5 text-sm text-espresso outline-none focus:border-walnut";

function chipClass(selected: boolean) {
  return `rounded-full border px-3 py-1.5 text-xs font-medium ${
    selected ? "border-espresso bg-cream text-espresso" : "border-beige text-warm-gray"
  }`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function timeframeLabel(goal: GoalView) {
  const repeat = goal.period === "DAILY" ? " · resets daily" : goal.period === "WEEKLY" ? " · resets Mondays" : "";
  if (goal.endsAt) return `By ${formatDate(goal.endsAt)}${repeat}`;
  return `Since ${formatDate(goal.startsAt)}${repeat}`;
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
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
      startsAt: customStart ? fromDateInput(customStart, false) : today,
      endsAt: customEnd ? fromDateInput(customEnd, true) : null,
    };
  }
  return { startsAt: today, endsAt: null };
}

function GoalTypeIcon({ type, className }: { type: GoalType; className?: string }) {
  if (type === "BOOK") return <IconBookMark className={className} />;
  if (type === "PAGE_COUNT") return <IconOpenBook className={className} />;
  return <IconLibrary className={className} />;
}

function ProgressBar({ goal }: { goal: GoalView }) {
  const { percent, done, metThisPeriod } = goal.progress;
  const complete = done || metThisPeriod;
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
        className={`h-full rounded-full transition-[width] duration-500 ${complete ? "bg-sage" : "bg-dusty-peach"}`}
        style={{ width: `${complete ? 100 : Math.max(percent, 3)}%` }}
      />
    </div>
  );
}

function progressCount(goal: GoalView) {
  const { current, target, done } = goal.progress;
  if (goal.type === "BOOK") return done ? "Finished" : "Not finished yet";
  const now = periodNowLabel(goal.period);
  return `${current.toLocaleString("en-US")} / ${formatAmount(goal.type, target)}${now ? ` ${now}` : ""}`;
}

function GoalRow({
  goal,
  onDelete,
  onEdit,
  leaving,
  busy,
}: {
  goal: GoalView;
  onDelete?: (goal: GoalView) => void;
  onEdit?: (goal: GoalView) => void;
  leaving?: boolean;
  busy?: boolean;
}) {
  const muted = goal.progress.expired;
  const streak = streakLabel(goal.period, goal.progress.streak);
  const complete = goal.progress.done || goal.progress.metThisPeriod;
  const identity = (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          complete ? "bg-sage/15 text-walnut" : "bg-dusty-peach/35 text-deep-brown"
        }`}
      >
        <GoalTypeIcon type={goal.type} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block font-medium ${muted ? "text-warm-gray" : "text-espresso"}`}>{goalTitle(goal)}</span>
        <span className="mt-0.5 block text-xs text-walnut">{timeframeLabel(goal)}</span>
      </span>
    </>
  );
  return (
    <li className={`rounded-2xl border border-beige bg-cream/70 px-3 py-3 ${leaving ? "item-leave" : ""}`}>
      <div className="flex items-start gap-3">
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(goal)}
            aria-label={`Edit goal: ${goalTitle(goal)}`}
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            {identity}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-start gap-3">{identity}</div>
        )}
        {streak && !muted ? (
          <span className="mt-0.5 shrink-0 rounded-full bg-dusty-peach/35 px-2 py-0.5 text-[11px] font-medium text-deep-brown">
            {streak}
          </span>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(goal)}
            className="-mt-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-warm-gray hover:bg-beige disabled:opacity-50"
            aria-label={`Remove goal: ${goalTitle(goal)}`}
          >
            <IconClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-3">
        <ProgressBar goal={goal} />
        <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
          <span className="text-warm-gray">{motivationLine(goal.type, goal.progress, goal.period)}</span>
          <span className="shrink-0 font-medium text-espresso">{progressCount(goal)}</span>
        </div>
      </div>
    </li>
  );
}

function AddGoalForm({
  shelfBooks,
  goal,
  onCreated,
}: {
  shelfBooks: GoalShelfBook[];
  goal?: GoalView;
  onCreated: (completed: GoalView[]) => void;
}) {
  const [type, setType] = useState<GoalType>(goal?.type ?? "PAGE_COUNT");
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? "DAILY");
  const [target, setTarget] = useState(
    goal?.target ? String(goal.target) : DEFAULT_TARGETS.PAGE_COUNT.DAILY,
  );
  const [bookId, setBookId] = useState(goal?.bookId ?? shelfBooks[0]?.id ?? "");
  const [timeframe, setTimeframe] = useState<Timeframe>(goal ? "custom" : "open");
  const [customStart, setCustomStart] = useState(() =>
    toDateInput(goal ? new Date(goal.startsAt) : new Date()),
  );
  const [customEnd, setCustomEnd] = useState(() => (goal?.endsAt ? toDateInput(new Date(goal.endsAt)) : ""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function chooseType(next: GoalType) {
    setType(next);
    const nextPeriod = GOAL_PERIODS[next].includes(period) ? period : "TOTAL";
    setPeriod(nextPeriod);
    if (next !== "BOOK") setTarget(DEFAULT_TARGETS[next][nextPeriod]);
  }

  function choosePeriod(next: GoalPeriod) {
    setPeriod(next);
    if (!goal && type !== "BOOK") setTarget(DEFAULT_TARGETS[type][next]);
    if (!goal) setTimeframe(next === "TOTAL" ? "year" : "open");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { startsAt, endsAt } = timeframeRange(timeframe, customStart, customEnd);
    try {
      const response = await fetch(goal ? `/api/goals/${goal.id}` : "/api/goals", {
        method: goal ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          period,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          target: type === "BOOK" ? null : Number(target),
          bookId: type === "BOOK" ? bookId : null,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt?.toISOString() ?? null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not save your goal.");
      onCreated(readCompletedGoalsFromApi(payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your goal.");
    } finally {
      setBusy(false);
    }
  }

  const periods = GOAL_PERIODS[type];
  const targetLabel = type === "PAGE_COUNT" ? "Pages" : "Books";
  const targetSuffix = period === "DAILY" ? "a day" : period === "WEEKLY" ? "a week" : "in total";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Goal type">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={type === option.value}
            onClick={() => chooseType(option.value)}
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
          <p className="text-sm text-warm-gray">Add a book to your Want to read or Reading shelf first.</p>
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
        <>
          <div>
            <p className="text-sm font-medium text-espresso">Repeat</p>
            <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Repeat">
              {periods.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={period === option}
                  onClick={() => choosePeriod(option)}
                  className={chipClass(period === option)}
                >
                  {PERIOD_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm font-medium text-espresso">
            {targetLabel} {targetSuffix}
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
                Pages count when you save your current page on a book you&apos;re reading, and when you finish
                a book.
              </span>
            ) : null}
          </label>
        </>
      )}

      <div>
        <p className="text-sm font-medium text-espresso">{period === "TOTAL" ? "Timeframe" : "Runs"}</p>
        <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Timeframe">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={timeframe === option.value}
              onClick={() => setTimeframe(option.value)}
              className={chipClass(timeframe === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {timeframe === "custom" ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
            <label className="block min-w-0 text-xs font-medium text-walnut">
              Start
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block min-w-0 text-xs font-medium text-walnut">
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
        {busy ? "Saving..." : goal ? "Save changes" : "Set goal"}
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
  const [editing, setEditing] = useState<GoalView | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<GoalView[]>([]);
  const [busy, setBusy] = useState(false);
  useBodyScrollLock(open);
  const past = [...goals.completed, ...goals.ended];
  const canAdd = editable && goals.active.length < MAX_ACTIVE_GOALS;
  const bookGoalIds = new Set(goals.active.flatMap((goal) => (goal.bookId ? [goal.bookId] : [])));
  const availableBooks = shelfBooks.filter((book) => !bookGoalIds.has(book.id));
  const formBooks = editing
    ? [
        ...(editing.bookId && !shelfBooks.some((book) => book.id === editing.bookId)
          ? [{ id: editing.bookId, title: editing.bookTitle ?? "This book" }]
          : []),
        ...shelfBooks.filter((book) => !bookGoalIds.has(book.id) || book.id === editing.bookId),
      ]
    : availableBooks;

  async function remove(goal: GoalView) {
    setLeavingId(goal.id);
    setBusy(true);
    try {
      const [response] = await Promise.all([
        fetch(`/api/goals/${goal.id}`, { method: "DELETE" }),
        new Promise((resolve) => window.setTimeout(resolve, 180)),
      ]);
      if (!response.ok) throw new Error("Could not remove that goal.");
      router.refresh();
    } catch (error) {
      setLeavingId(null);
      notify(error instanceof Error ? error.message : "Could not remove that goal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
          <div className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-t-3xl bg-ivory px-5 pb-8 pt-4 text-left lg:max-h-[min(85vh,760px)] lg:max-w-lg lg:rounded-3xl lg:shadow-[0_24px_80px_rgba(45,33,27,0.18)]">
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
                  ? "Pick something to aim for. Every page moves you forward."
                  : "No active goals right now."}
            </p>

            {goals.active.length ? (
              <ul className="space-y-2">
                {goals.active.map((goal) => (
                  <GoalRow
                    key={goal.id}
                    goal={goal}
                    busy={busy}
                    leaving={leavingId === goal.id}
                    onEdit={editable ? setEditing : undefined}
                    onDelete={editable ? remove : undefined}
                  />
                ))}
              </ul>
            ) : null}

            {editable ? (
              <div className="mt-4">
                {canAdd ? (
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
                    <GoalRow
                    key={goal.id}
                    goal={goal}
                    busy={busy}
                    leaving={leavingId === goal.id}
                    onEdit={editable ? setEditing : undefined}
                    onDelete={editable ? remove : undefined}
                  />
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}

      {adding || editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/35 lg:items-center lg:p-6">
          <div className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-t-3xl bg-ivory px-5 pb-8 pt-4 text-left lg:max-h-[min(85vh,760px)] lg:max-w-lg lg:rounded-3xl lg:shadow-[0_24px_80px_rgba(45,33,27,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-espresso">{editing ? "Edit goal" : "New goal"}</h2>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cream"
                onClick={() => {
                  setAdding(false);
                  setEditing(null);
                }}
                aria-label="Close"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            <AddGoalForm
              key={editing?.id ?? "new"}
              shelfBooks={formBooks}
              goal={editing ?? undefined}
              onCreated={(completed) => {
                setAdding(false);
                setEditing(null);
                if (completed.length) setCelebrating(completed);
                router.refresh();
              }}
            />
          </div>
        </div>
      ) : null}

      {celebrating.length ? (
        <GoalCompleteModal goals={celebrating} onDone={() => setCelebrating([])} />
      ) : null}
    </>
  );
}
