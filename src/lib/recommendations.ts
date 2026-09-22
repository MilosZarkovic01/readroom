import { prisma } from "@/lib/prisma";
import { fetchWorkExtras, searchOpenLibraryBySubject, type OpenLibraryBook } from "@/lib/open-library";
import { parseSubjects, serializeSubjects, topSubjects } from "@/lib/subjects";

const WEEKLY_SUBJECTS = [
  "literary fiction",
  "science fiction",
  "historical fiction",
  "mystery",
  "memoir",
  "fantasy",
  "biography",
  "philosophy",
  "thriller",
  "travel",
  "poetry",
  "classic literature",
];

function isoWeekNumber(date = new Date()) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function getBooksOfTheWeek(excludeKeys: string[] = [], count = 3): Promise<OpenLibraryBook[]> {
  const week = isoWeekNumber();
  const owned = new Set(excludeKeys);
  const picks: OpenLibraryBook[] = [];

  for (let offset = 0; offset < WEEKLY_SUBJECTS.length && picks.length < count; offset += 1) {
    const subject = WEEKLY_SUBJECTS[(week + offset) % WEEKLY_SUBJECTS.length];
    const books = await searchOpenLibraryBySubject(subject, 12);
    const candidate = books.find(
      (book) =>
        book.coverId &&
        !owned.has(book.openLibraryKey) &&
        !picks.some((pick) => pick.openLibraryKey === book.openLibraryKey),
    );
    if (!candidate) continue;
    const extras = await fetchWorkExtras(candidate.openLibraryKey);
    picks.push({
      ...candidate,
      description: extras.description ?? candidate.description,
      subjects: extras.subjects.length ? extras.subjects : candidate.subjects,
    });
  }

  return picks;
}

export async function getBookOfTheWeek(excludeKeys: string[] = []): Promise<OpenLibraryBook | null> {
  const [book] = await getBooksOfTheWeek(excludeKeys, 1);
  return book ?? null;
}

export async function suggestedBooksForUser(userId: string, limit = 4) {
  const entries = await prisma.libraryEntry.findMany({
    where: { userId },
    include: { book: true },
  });

  const history = entries.filter((entry) => entry.status === "READ" || entry.status === "READING");
  for (const entry of history) {
    if (parseSubjects(entry.book.subjects).length) continue;
    const extras = await fetchWorkExtras(entry.book.openLibraryKey);
    if (!extras.subjects.length) continue;
    const subjects = serializeSubjects(extras.subjects);
    await prisma.book.update({
      where: { id: entry.book.id },
      data: { subjects },
    });
    entry.book.subjects = subjects;
  }

  const subjects = topSubjects(
    history.map((entry) => entry.book),
    3,
  );
  const owned = new Set(entries.map((entry) => entry.book.openLibraryKey));
  const suggestions: OpenLibraryBook[] = [];

  for (const subject of subjects) {
    const books = await searchOpenLibraryBySubject(subject, 10);
    for (const book of books) {
      if (owned.has(book.openLibraryKey)) continue;
      if (suggestions.some((item) => item.openLibraryKey === book.openLibraryKey)) continue;
      suggestions.push(book);
      if (suggestions.length >= limit) {
        return { books: suggestions, subjects };
      }
    }
  }

  return { books: suggestions, subjects };
}
