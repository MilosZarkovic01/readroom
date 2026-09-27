"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReadingStatus } from "@prisma/client";
import { SearchResultCard } from "@/components/SearchResultCard";
import { DESKTOP_SEARCH_PAGE_SIZE, type OpenLibraryBook } from "@/lib/open-library";

type DesktopBook = OpenLibraryBook & { libraryStatus: ReadingStatus | null };

function searchHref(q: string, field: string, page: number) {
  const params = new URLSearchParams({ q, field, page: String(page) });
  return `/search?${params.toString()}`;
}

export function DesktopSearchResults({
  q,
  field,
  page,
}: {
  q: string;
  field: string;
  page: number;
}) {
  const [books, setBooks] = useState<DesktopBook[] | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    let controller: AbortController | null = null;

    function load() {
      controller?.abort();
      if (!media.matches || !q) {
        setBooks(null);
        setTotalPages(0);
        setError(null);
        return;
      }

      const next = new AbortController();
      controller = next;
      const params = new URLSearchParams({
        q,
        field,
        page: String(page),
        limit: String(DESKTOP_SEARCH_PAGE_SIZE),
      });

      fetch(`/api/books/search?${params.toString()}`, { signal: next.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("search failed");
          return response.json() as Promise<{ books: DesktopBook[]; totalPages: number }>;
        })
        .then((payload) => {
          setError(null);
          setBooks(payload.books);
          setTotalPages(payload.totalPages);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setBooks(null);
          setError("Could not reach Open Library. Try again in a moment.");
        });
    }

    load();
    media.addEventListener("change", load);
    return () => {
      controller?.abort();
      media.removeEventListener("change", load);
    };
  }, [q, field, page]);

  if (!q) return null;

  return (
    <div className="hidden lg:block">
      {error ? <p className="mt-6 text-sm text-terracotta">{error}</p> : null}
      {!books && !error ? (
        <p className="mt-10 text-center text-sm text-warm-gray">Loading books…</p>
      ) : null}
      {books && books.length === 0 && !error ? (
        <p className="mt-10 text-center text-sm text-warm-gray">No books found for “{q}”.</p>
      ) : null}
      {books && books.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-x-8 xl:grid-cols-3">
            {books.map((book, index) => (
              <div key={book.openLibraryKey} className="min-w-0 border-b border-beige">
                <SearchResultCard priority={index < 3} book={book} />
              </div>
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link href={searchHref(q, field, page - 1)} className="text-espresso">
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-warm-gray">Page {page}</span>
              {page < totalPages ? (
                <Link href={searchHref(q, field, page + 1)} className="text-espresso">
                  Next
                </Link>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
