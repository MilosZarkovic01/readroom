import { coverUrl } from "@/lib/status";

const SIZES = {
  XS: { width: 48, height: 72, className: "h-[72px] w-12", ol: "S" as const },
  S: { width: 56, height: 84, className: "h-[84px] w-14", ol: "S" as const },
  SM: { width: 96, height: 144, className: "h-36 w-24", ol: "M" as const },
  M: { width: 128, height: 192, className: "h-48 w-32", ol: "M" as const },
  L: { width: 176, height: 264, className: "h-[264px] w-44", ol: "M" as const },
};

export function BookCover({
  coverId,
  title,
  size = "M",
  priority = false,
}: {
  coverId: number | null;
  title: string;
  size?: keyof typeof SIZES;
  priority?: boolean;
}) {
  const dimensions = SIZES[size];
  const src = coverId ? `/api/covers/${coverId}?size=${dimensions.ol}` : coverUrl(coverId, dimensions.ol);

  if (!src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-walnut px-1.5 text-center text-[10px] font-medium leading-snug text-ivory shadow-md ${dimensions.className}`}
      >
        {title}
      </div>
    );
  }

  return (
    // Native img avoids Next.js image optimization round-trips to Open Library.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Cover of ${title}`}
      width={dimensions.width}
      height={dimensions.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      className={`shrink-0 rounded-lg bg-beige object-cover shadow-[0_8px_20px_rgba(45,33,27,0.18)] ${dimensions.className}`}
    />
  );
}
