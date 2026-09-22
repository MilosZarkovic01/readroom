"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReadingStatus } from "@prisma/client";
import { BookCover } from "@/components/BookCover";
import { CategoryChips } from "@/components/CategoryChips";
import { IconChevron, IconClose } from "@/components/Icons";
import { ShelfPicker } from "@/components/ShelfPicker";
import { StarRating } from "@/components/StarRating";
import { STATUS_LABELS } from "@/lib/status";
import type { OpenLibraryBook } from "@/lib/open-library";

type SearchBook = OpenLibraryBook & { libraryStatus: ReadingStatus | null };

export function SearchResultCard({
  book,
  priority = false,
}: {
  book: SearchBook;
  priority?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"closed" | "detail" | "add">("closed");
  const [status, setStatus] = useState<ReadingStatus>(book.libraryStatus ?? "WANT_TO_READ");
  const [owned, setOwned] = useState(book.libraryStatus);
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openLibraryKey: book.openLibraryKey,
          title: book.title,
          author: book.author,
          coverId: book.coverId,
          firstPublishYear: book.firstPublishYear,
          description: book.description,
          subjects: book.subjects,
          status,
          rating,
          review,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not add book");
      }
      setOwned(status);
      setStep("closed");
      router.push(`/library?shelf=${status}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add book");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStep("detail")}
        className="flex w-full items-center gap-3 py-3 text-left"
      >
        <BookCover coverId={book.coverId} title={book.title} size="XS" priority={priority} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-espresso">{book.title}</span>
          <span className="mt-0.5 block truncate text-sm text-warm-gray">{book.author}</span>
          {owned ? (
            <span className="mt-1 block text-xs text-walnut">{STATUS_LABELS[owned]}</span>
          ) : book.subjects?.[0] ? (
            <span className="mt-1 block truncate text-xs text-warm-gray">{book.subjects[0]}</span>
          ) : book.firstPublishYear ? (
            <span className="mt-1 block text-xs text-warm-gray">{book.firstPublishYear}</span>
          ) : null}
        </span>
        <IconChevron className="h-5 w-5 shrink-0 text-dusty-peach" />
      </button>

      {step !== "closed" ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-espresso/35">
          <div className="max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-ivory px-5 pb-8 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-espresso">
                {step === "add" ? "Add to library" : book.title}
              </h2>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cream"
                onClick={() => setStep("closed")}
                aria-label="Close"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            {step === "detail" ? (
              <div className="flex flex-col items-center text-center">
                <BookCover coverId={book.coverId} title={book.title} size="L" priority />
                <h3 className="mt-5 font-serif text-3xl text-espresso">{book.title}</h3>
                <p className="mt-1 text-warm-gray">{book.author}</p>
                {book.firstPublishYear ? (
                  <p className="mt-1 text-sm text-warm-gray">{book.firstPublishYear}</p>
                ) : null}
                {book.description ? (
                  <p className="mt-4 text-left text-sm leading-relaxed text-warm-gray">{book.description}</p>
                ) : null}
                <CategoryChips subjects={book.subjects ?? []} align="center" />
                {owned ? (
                  <p className="mt-6 text-sm text-walnut">In your library · {STATUS_LABELS[owned]}</p>
                ) : (
                  <button
                    type="button"
                    className="mt-8 w-full rounded-full bg-deep-brown py-3.5 text-sm font-medium text-ivory"
                    onClick={() => setStep("add")}
                  >
                    Add to library
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-5 flex gap-3">
                  <BookCover coverId={book.coverId} title={book.title} size="S" priority />
                  <div>
                    <p className="font-medium text-espresso">{book.title}</p>
                    <p className="text-sm text-warm-gray">{book.author}</p>
                  </div>
                </div>
                <p className="mb-2 text-sm font-medium text-espresso">Status</p>
                <ShelfPicker value={status} onChange={setStatus} />
                <p className="mt-5 mb-2 text-sm font-medium text-espresso">Rating</p>
                <StarRating value={rating} disabled={busy} onChange={setRating} />
                <label className="mt-5 block text-sm font-medium text-espresso">
                  Review
                  <textarea
                    value={review}
                    maxLength={500}
                    onChange={(event) => setReview(event.target.value)}
                    placeholder="What did you think about this book?"
                    className="mt-2 h-24 w-full rounded-2xl border border-beige bg-cream px-3 py-2 text-sm font-normal text-espresso outline-none"
                  />
                  <span className="mt-1 block text-xs font-normal text-warm-gray">{review.length}/500</span>
                </label>
                {error ? <p className="mt-3 text-sm text-terracotta">{error}</p> : null}
                <button
                  type="button"
                  className="mt-6 w-full rounded-full bg-deep-brown py-3.5 text-sm font-medium text-ivory disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void add()}
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
