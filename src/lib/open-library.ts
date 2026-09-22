import { pickSubjects } from "@/lib/subjects";

export type SearchField = "all" | "title" | "author";

export const SEARCH_PAGE_SIZE = 5;

export type OpenLibraryBook = {
  openLibraryKey: string;
  title: string;
  author: string;
  coverId: number | null;
  firstPublishYear: number | null;
  description: string | null;
  subjects: string[];
};

export type SearchResult = {
  books: OpenLibraryBook[];
  page: number;
  pageSize: number;
  numFound: number;
  totalPages: number;
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  first_sentence?: string | string[] | { value?: string };
  subject?: string[];
};

function normalizeWorkKey(key: string) {
  if (key.startsWith("/works/")) return key;
  if (key.startsWith("OL") && key.endsWith("W")) return `/works/${key}`;
  return key.startsWith("/") ? key : `/works/${key}`;
}

function asText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return asText(value[0]);
  if (typeof value === "object" && value !== null && "value" in value) {
    return asText((value as { value?: unknown }).value);
  }
  return null;
}

function shorten(text: string, max = 280) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

function mapDoc(doc: OpenLibraryDoc, extras?: { description: string | null; subjects: string[] }): OpenLibraryBook {
  const openLibraryKey = normalizeWorkKey(doc.key!);
  const fromSearch = asText(doc.first_sentence);
  return {
    openLibraryKey,
    title: doc.title!,
    author: doc.author_name?.join(", ") || "Unknown author",
    coverId: doc.cover_i ?? null,
    firstPublishYear: doc.first_publish_year ?? null,
    description: extras?.description ?? (fromSearch ? shorten(fromSearch) : null),
    subjects: extras?.subjects?.length ? extras.subjects : pickSubjects(doc.subject),
  };
}

export async function fetchWorkExtras(workKey: string): Promise<{ description: string | null; subjects: string[] }> {
  try {
    const response = await fetch(`https://openlibrary.org${workKey}.json`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return { description: null, subjects: [] };
    const data = (await response.json()) as { description?: unknown; subjects?: unknown };
    const text = asText(data.description);
    return {
      description: text ? shorten(text) : null,
      subjects: pickSubjects(data.subjects),
    };
  } catch {
    return { description: null, subjects: [] };
  }
}

export async function searchOpenLibrary(
  query: string,
  field: SearchField = "all",
  page = 1,
): Promise<SearchResult> {
  const trimmed = query.trim();
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  if (!trimmed) {
    return { books: [], page: 1, pageSize: SEARCH_PAGE_SIZE, numFound: 0, totalPages: 0 };
  }

  const q =
    field === "title"
      ? `title:${trimmed}`
      : field === "author"
        ? `author:${trimmed}`
        : trimmed;

  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set(
    "fields",
    "key,title,author_name,cover_i,first_publish_year,first_sentence,subject",
  );
  url.searchParams.set("limit", String(SEARCH_PAGE_SIZE));
  url.searchParams.set("offset", String((safePage - 1) * SEARCH_PAGE_SIZE));

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 120 },
  });

  if (!response.ok) {
    throw new Error("Open Library search failed");
  }

  const data = (await response.json()) as { docs?: OpenLibraryDoc[]; numFound?: number };
  const docs = (data.docs ?? []).filter((doc) => doc.key && doc.title);
  const numFound = data.numFound ?? docs.length;

  const books = await Promise.all(
    docs.map(async (doc) => {
      const extras = await fetchWorkExtras(normalizeWorkKey(doc.key!));
      return mapDoc(doc, {
        description: extras.description,
        subjects: extras.subjects.length ? extras.subjects : pickSubjects(doc.subject),
      });
    }),
  );

  return {
    books,
    page: safePage,
    pageSize: SEARCH_PAGE_SIZE,
    numFound,
    totalPages: Math.max(1, Math.ceil(numFound / SEARCH_PAGE_SIZE)),
  };
}

export async function searchOpenLibraryBySubject(subject: string, limit = 8): Promise<OpenLibraryBook[]> {
  const trimmed = subject.trim();
  if (!trimmed) return [];

  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", `subject:"${trimmed}"`);
  url.searchParams.set(
    "fields",
    "key,title,author_name,cover_i,first_publish_year,first_sentence,subject",
  );
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) return [];

  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
  return (data.docs ?? [])
    .filter((doc) => doc.key && doc.title)
    .map((doc) => mapDoc(doc));
}
