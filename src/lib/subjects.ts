const SKIP =
  /accessible book|protected daisy|overdrive|open library|internet archive|lending library|in library|large print|braille|audiobook|e-?book|nyt:|new york times|imaginary place|in literature|\(.*\)|,|^(ability|general|unspecified)$/i;

export function pickSubjects(value: unknown, limit = 4): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const seen = new Set<string>();
  const subjects: string[] = [];

  for (const item of raw) {
    const label = String(item ?? "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (label.length < 3 || label.length > 42) continue;
    if (SKIP.test(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    subjects.push(label);
    if (subjects.length >= limit) break;
  }

  return subjects;
}

export function parseSubjects(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    return pickSubjects(JSON.parse(value));
  } catch {
    return pickSubjects(value.split(","));
  }
}

export function serializeSubjects(subjects: string[]) {
  const clean = pickSubjects(subjects);
  return clean.length ? JSON.stringify(clean) : null;
}

export function topSubjects(
  books: { subjects?: string | null }[],
  limit = 4,
): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const book of books) {
    for (const subject of parseSubjects(book.subjects)) {
      const key = subject.toLowerCase();
      const current = counts.get(key);
      if (current) current.count += 1;
      else counts.set(key, { label: subject, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => entry.label);
}
