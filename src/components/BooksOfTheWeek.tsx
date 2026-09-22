"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { IconBack, IconChevron } from "@/components/Icons";
import type { OpenLibraryBook } from "@/lib/open-library";

const INTERVAL_MS = 5500;

export function BooksOfTheWeek({ books }: { books: OpenLibraryBook[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = books.length;

  useEffect(() => {
    if (total < 2 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, total, index]);

  if (!total) return null;

  const book = books[index];

  function go(direction: -1 | 1) {
    setIndex((current) => (current + direction + total) % total);
  }

  return (
    <section className="mt-10">
      <div className="text-center">
        <p className="font-sans text-[10px] font-medium tracking-[0.28em] text-terracotta uppercase">This week</p>
        <h2 className="mt-1 font-sans text-[26px] leading-tight text-espresso">Books of the Week</h2>
        <div className="mx-auto mt-2 h-px w-16 bg-dusty-peach" />
      </div>

      <div
        className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-cream px-3 pb-5 pt-5"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative flex w-full items-center justify-center py-2">
            {total > 1 ? (
              <button
                type="button"
                aria-label="Previous book"
                onClick={() => go(-1)}
                className="absolute left-1 flex h-8 w-8 items-center justify-center rounded-full bg-ivory text-espresso shadow-sm"
              >
                <IconBack className="h-4 w-4" />
              </button>
            ) : null}
            <div className="relative">
              <div className="absolute inset-x-1 -bottom-1 h-5 rounded-full bg-espresso/10 blur-md" />
              <BookCover coverId={book.coverId} title={book.title} size="SM" priority={index === 0} />
            </div>
            {total > 1 ? (
              <button
                type="button"
                aria-label="Next book"
                onClick={() => go(1)}
                className="absolute right-1 flex h-8 w-8 items-center justify-center rounded-full bg-ivory text-espresso shadow-sm"
              >
                <IconChevron className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <h3 className="mt-5 max-w-[16rem] font-sans text-lg leading-snug text-espresso">{book.title}</h3>
          <p className="mt-1 font-sans text-xs text-warm-gray">{book.author}</p>
          <Link
            href={`/search?q=${encodeURIComponent(book.title)}&field=title`}
            className="mt-4 w-full rounded-full bg-deep-brown py-2.5 text-center font-sans text-xs font-medium text-ivory"
          >
            View in search
          </Link>
        </div>

        {total > 1 ? (
          <div className="mt-4 flex justify-center gap-2">
            {books.map((item, itemIndex) => (
              <button
                key={item.openLibraryKey}
                type="button"
                aria-label={`Show book ${itemIndex + 1}`}
                onClick={() => setIndex(itemIndex)}
                className={`h-2 rounded-full transition-all ${
                  itemIndex === index ? "w-5 bg-terracotta" : "w-2 bg-dusty-peach/70"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
