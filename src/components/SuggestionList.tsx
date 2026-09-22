import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { CategoryChips } from "@/components/CategoryChips";
import type { OpenLibraryBook } from "@/lib/open-library";

export function SuggestionList({ books }: { books: OpenLibraryBook[] }) {
  if (!books.length) return null;

  return (
    <ul className="mt-2 divide-y divide-beige">
      {books.map((book) => (
        <li key={book.openLibraryKey}>
          <Link
            href={`/search?q=${encodeURIComponent(book.title)}&field=title`}
            className="flex items-center gap-3 py-3"
          >
            <BookCover coverId={book.coverId} title={book.title} size="XS" />
            <div className="min-w-0">
              <p className="truncate font-medium">{book.title}</p>
              <p className="truncate text-sm text-warm-gray">{book.author}</p>
              <CategoryChips subjects={book.subjects.slice(0, 2)} compact />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
