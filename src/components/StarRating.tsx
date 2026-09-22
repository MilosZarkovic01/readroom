"use client";

export function StarRating({
  value,
  onChange,
  disabled,
  size = "md",
}: {
  value: number | null;
  onChange?: (rating: number | null) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-4 w-4 text-base" : "h-7 w-7 text-xl";

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill =
          (value ?? 0) >= star ? 1 : (value ?? 0) >= star - 0.5 ? 0.5 : 0;
        const className = `${box} relative leading-none`;
        const starEl = (
          <span className="relative inline-block leading-none" aria-hidden>
            <span className="text-dusty-peach/70">★</span>
            {fill > 0 ? (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden text-terracotta"
                style={{ width: fill === 1 ? "100%" : "50%" }}
              >
                ★
              </span>
            ) : null}
          </span>
        );

        if (!onChange) {
          return (
            <span key={star} className={className}>
              {starEl}
            </span>
          );
        }

        return (
          <span key={star} className={`${className} ${disabled ? "opacity-50" : ""}`}>
            {starEl}
            <button
              type="button"
              className="absolute inset-y-0 left-0 z-10 w-1/2"
              disabled={disabled}
              aria-label={`${star - 0.5} stars`}
              onClick={() => onChange(value === star - 0.5 ? null : star - 0.5)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 z-10 w-1/2"
              disabled={disabled}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              onClick={() => onChange(value === star ? null : star)}
            />
          </span>
        );
      })}
    </div>
  );
}
