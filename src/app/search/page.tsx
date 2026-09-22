import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { SearchResultCard } from "@/components/SearchResultCard";
import { SearchBar } from "@/components/SearchBar";
import { IconBack } from "@/components/Icons";
import { searchOpenLibrary, type SearchField } from "@/lib/open-library";
import { prisma } from "@/lib/prisma";

const FIELDS = new Set<SearchField>(["all", "title", "author"]);

function searchHref(q: string, field: string, page: number) {
  const params = new URLSearchParams({ q, field, page: String(page) });
  return `/search?${params.toString()}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; field?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const field = FIELDS.has(params.field as SearchField)
    ? (params.field as SearchField)
    : "all";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  let result: Awaited<ReturnType<typeof searchOpenLibrary>> | null = null;
  let error: string | null = null;

  if (q) {
    try {
      result = await searchOpenLibrary(q, field, page);
    } catch {
      error = "Could not reach Open Library. Try again in a moment.";
    }
  }

  const books = result?.books ?? [];
  const owned = q
    ? await prisma.libraryEntry.findMany({
        where: {
          userId: session.user.id,
          book: { openLibraryKey: { in: books.map((book) => book.openLibraryKey) } },
        },
        include: { book: { select: { openLibraryKey: true } } },
      })
    : [];

  const ownedByKey = new Map(
    owned.map((entry) => [entry.book.openLibraryKey, entry.status]),
  );

  const tab = field === "author" ? "author" : "title";
  const totalPages = result?.totalPages ?? 0;

  return (
    <AppShell topBar={false}>
      <div className="flex items-center gap-3 pt-5">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-espresso"
          aria-label="Back"
        >
          <IconBack className="h-5 w-5" />
        </Link>
        <SearchBar defaultQuery={q} field={tab} />
      </div>
      <div className="mt-5 flex gap-6 border-b border-beige">
        <Link
          href={q ? searchHref(q, "title", 1) : "/search?field=title"}
          className={`-mb-px pb-2 text-sm ${
            tab === "title" ? "border-b-2 border-espresso font-medium text-espresso" : "text-warm-gray"
          }`}
        >
          Books
        </Link>
        <Link
          href={q ? searchHref(q, "author", 1) : "/search?field=author"}
          className={`-mb-px pb-2 text-sm ${
            tab === "author" ? "border-b-2 border-espresso font-medium text-espresso" : "text-warm-gray"
          }`}
        >
          Authors
        </Link>
      </div>
      {error ? <p className="mt-6 text-sm text-terracotta">{error}</p> : null}
      {!q ? (
        <p className="mt-10 text-center text-sm text-warm-gray">Start with a title or an author’s name.</p>
      ) : books.length === 0 && !error ? (
        <p className="mt-10 text-center text-sm text-warm-gray">No books found for “{q}”.</p>
      ) : (
        <>
          <div className="divide-y divide-beige">
            {books.map((book, index) => (
              <SearchResultCard
                key={book.openLibraryKey}
                priority={index < 2}
                book={{
                  ...book,
                  libraryStatus: ownedByKey.get(book.openLibraryKey) ?? null,
                }}
              />
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link href={searchHref(q, tab, page - 1)} className="text-espresso">
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-warm-gray">Page {page}</span>
              {page < totalPages ? (
                <Link href={searchHref(q, tab, page + 1)} className="text-espresso">
                  Next
                </Link>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
