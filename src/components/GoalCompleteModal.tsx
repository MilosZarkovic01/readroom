"use client";

import { useEffect, useState } from "react";
import { goalTitle, motivationLine, type GoalView } from "@/lib/goals";

export function GoalCompleteModal({ goals, onDone }: { goals: GoalView[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const goal = goals[index];

  useEffect(() => {
    setIndex(0);
  }, [goals]);

  if (!goal) return null;

  const last = index === goals.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-espresso/25 px-4 pb-8 lg:items-center lg:p-6">
      <div
        role="dialog"
        aria-labelledby="goal-complete-title"
        className="goal-card-in w-full max-w-md overflow-hidden rounded-[1.75rem] border border-beige bg-ivory shadow-[0_24px_70px_rgba(45,33,27,0.16)]"
      >
        <div className="h-1.5 bg-beige">
          <div className="goal-fill h-full bg-sage" />
        </div>
        <div className="px-6 pt-6 pb-7">
          <p className="font-serif text-sm text-sage">Reached</p>
          <h2 id="goal-complete-title" className="mt-2 font-serif text-[2rem] leading-tight text-espresso">
            {goalTitle(goal)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-warm-gray">
            {motivationLine(goal.type, goal.progress, goal.period)}
          </p>
          {goals.length > 1 ? (
            <p className="mt-3 text-xs text-walnut">
              {index + 1} of {goals.length}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-6 w-full rounded-full border border-espresso py-3 text-sm font-medium text-espresso"
            onClick={() => {
              if (last) onDone();
              else setIndex((current) => current + 1);
            }}
          >
            {last ? "Keep going" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
