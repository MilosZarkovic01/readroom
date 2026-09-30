"use client";

import { useEffect, useRef, useState } from "react";
import { goalTitle, motivationLine, type GoalView } from "@/lib/goals";

export function GoalCompleteModal({ goals, onDone }: { goals: GoalView[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const goal = goals[index];

  useEffect(() => {
    setIndex(0);
  }, [goals]);

  useEffect(() => {
    buttonRef.current?.focus();
  }, [goal?.id]);

  if (!goal) return null;

  const last = index === goals.length - 1;

  return (
    <div className="goal-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-espresso/30 px-5">
      <div
        key={goal.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-complete-title"
        className="goal-card-in w-full max-w-[360px] overflow-hidden rounded-[1.75rem] border border-beige bg-ivory px-6 pt-7 pb-6 text-center shadow-[0_24px_70px_rgba(45,33,27,0.16)]"
      >
        <svg viewBox="0 0 48 48" className="mx-auto h-14 w-14" aria-hidden>
          <circle className="goal-mark-ring" cx="24" cy="24" r="20" />
          <path className="goal-mark-check" d="M15 25.2 21.2 31.2 33.5 17.5" />
        </svg>
        <p className="goal-line goal-line-1 mt-4 font-serif text-sm text-sage">Reached</p>
        <h2 id="goal-complete-title" className="goal-line goal-line-2 mt-2 font-serif text-[2rem] leading-tight text-espresso">
          {goalTitle(goal)}
        </h2>
        <p className="goal-line goal-line-3 mt-2 text-sm leading-relaxed text-warm-gray">
          {motivationLine(goal.type, goal.progress, goal.period)}
        </p>
        <div className="goal-line goal-line-3 mt-5 h-1.5 overflow-hidden rounded-full bg-beige" aria-hidden>
          <div className="goal-fill h-full rounded-full bg-sage" />
        </div>
        {goals.length > 1 ? (
          <p className="goal-line goal-line-4 mt-3 text-xs text-walnut">
            {index + 1} of {goals.length}
          </p>
        ) : null}
        <button
          ref={buttonRef}
          type="button"
          className="goal-line goal-line-4 mt-6 w-full rounded-full border border-espresso py-3 text-sm font-medium text-espresso"
          onClick={() => {
            if (last) onDone();
            else setIndex((current) => current + 1);
          }}
        >
          {last ? "Keep going" : "Next"}
        </button>
      </div>
    </div>
  );
}
