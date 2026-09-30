"use client";

import { useEffect, useState } from "react";
import { BadgeConfetti } from "@/components/BadgeConfetti";
import { IconTarget } from "@/components/Icons";
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-espresso/40 px-6">
      <div
        role="dialog"
        aria-labelledby="goal-complete-title"
        className="badge-unlock-in w-full max-w-[360px] rounded-[28px] border border-beige bg-ivory px-6 py-8 text-center"
      >
        <p className="text-xs tracking-[0.18em] text-walnut uppercase">Goal reached</p>
        <span className="relative mx-auto mt-5 block h-28 w-full">
          <BadgeConfetti burstKey={`goal-${goal.id}`} />
          <span className="badge-unlock-glow relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-[22px] bg-sage/15 text-walnut">
            <span className="badge-unlock-mark inline-flex">
              <IconTarget className="h-9 w-9" />
            </span>
          </span>
        </span>
        <h2 id="goal-complete-title" className="mt-5 font-serif text-3xl text-espresso">
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
