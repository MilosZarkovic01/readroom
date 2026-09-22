export function isValidRating(value: unknown): value is number {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 0.5 || rating > 5) return false;
  return Math.abs(rating * 2 - Math.round(rating * 2)) < 1e-8;
}

export function formatRating(value: number | null | undefined) {
  if (value == null) return null;
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}
