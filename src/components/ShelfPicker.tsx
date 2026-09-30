"use client";

import type { ReadingStatus } from "@prisma/client";
import { StatusIcon } from "@/components/StatusChip";
import { isForwardStatusMove, STATUSES, STATUS_LABELS } from "@/lib/status";

export function ShelfPicker({
  value,
  onChange,
  from,
}: {
  value: ReadingStatus;
  onChange: (status: ReadingStatus) => void;
  from?: ReadingStatus;
}) {
  return (
    <div>
    <div className="space-y-2" role="radiogroup" aria-label="Status">
      {STATUSES.map((status) => {
        const selected = value === status;
        const allowed = from ? isForwardStatusMove(from, status) : true;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={!allowed}
            onClick={() => {
              if (allowed) onChange(status);
            }}
            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
              selected ? "border-espresso bg-cream" : "border-beige bg-ivory"
            }`}
          >
            <StatusIcon status={status} />
            <span className="flex-1 text-sm font-medium text-espresso">{STATUS_LABELS[status]}</span>
            <span
              className={`h-5 w-5 rounded-full border ${
                selected ? "border-espresso bg-espresso" : "border-beige"
              }`}
            >
              {selected ? <span className="mx-auto mt-1 block h-2 w-2 rounded-full bg-ivory" /> : null}
            </span>
          </button>
        );
      })}
    </div>
    {from ? (
      <p className="mt-2 text-xs text-warm-gray">
        Books move forward: Want to read, then Currently reading, then Read.
      </p>
    ) : null}
    </div>
  );
}
