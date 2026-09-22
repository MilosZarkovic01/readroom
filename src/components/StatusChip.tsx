import type { ReadingStatus } from "@prisma/client";
import { IconCheck, IconOpenBook, IconBookMark } from "@/components/Icons";
import { STATUS_LABELS } from "@/lib/status";

const STYLES: Record<
  ReadingStatus,
  { wrap: string; iconWrap: string; icon: typeof IconCheck }
> = {
  READ: {
    wrap: "bg-[#e7f4e3] text-[#3f7a3a]",
    iconWrap: "bg-sage text-white",
    icon: IconCheck,
  },
  READING: {
    wrap: "bg-beige text-walnut",
    iconWrap: "bg-[#cfc3ad] text-espresso",
    icon: IconOpenBook,
  },
  WANT_TO_READ: {
    wrap: "bg-[#f3dfd4] text-[#9a5b42]",
    iconWrap: "bg-dusty-peach text-ivory",
    icon: IconBookMark,
  },
};

export function StatusChip({
  status,
  count,
}: {
  status: ReadingStatus;
  count?: number;
}) {
  const style = STYLES[status];
  const Icon = style.icon;

  return (
    <div className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${style.wrap}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.iconWrap}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-espresso">{STATUS_LABELS[status]}</span>
        {count !== undefined ? (
          <span className="text-xs text-warm-gray">
            {count} book{count === 1 ? "" : "s"}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function StatusIcon({ status }: { status: ReadingStatus }) {
  const style = STYLES[status];
  const Icon = style.icon;
  return (
    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.iconWrap}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
