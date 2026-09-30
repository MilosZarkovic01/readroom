import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { BooksOfTheWeek } from "@/components/BooksOfTheWeek";
import { ContinueReadingList } from "@/components/ContinueReading";
import { currentPagesFor } from "@/lib/reading-progress";
import { SearchBar } from "@/components/SearchBar";
import { StatusChip } from "@/components/StatusChip";
import { STATUSES } from "@/lib/status";
import { getBooksOfTheWeek } from "@/lib/recommendations";
import landingBooks from "@/assets/landing-books.webp";
import landingBooksDesktop from "@/assets/landing-books-desktop.webp";

function firstName(name?: string | null, email?: string | null) {
  if (name?.trim()) return name.trim().split(" ")[0];
  if (email) return email.split("@")[0];
  return "there";
}

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="mx-auto flex min-h-full max-w-[430px] flex-col bg-cream lg:max-w-none lg:min-h-screen lg:flex-row">
        <div className="relative min-h-[58vh] flex-1 overflow-hidden lg:min-h-screen">
          <Image
            src={landingBooks}
            alt="A stack of books and a coffee mug on a sunlit table"
            fill
            priority
            placeholder="blur"
            quality={70}
            sizes="430px"
            className="object-cover object-center lg:hidden"
          />
          <Image
            src={landingBooksDesktop}
            alt="A stack of books and a coffee mug on a sunlit table"
            fill
            placeholder="blur"
            quality={90}
            sizes="(min-width: 1024px) 70vw, 1px"
            className="hidden object-cover object-[center_40%] lg:block"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso/55 via-espresso/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-8 px-8 text-center text-ivory lg:bottom-16 lg:left-0 lg:max-w-xl lg:px-16 lg:text-left lg:right-auto">
            <h1 className="font-serif text-5xl drop-shadow-sm lg:text-7xl">ReadRoom</h1>
            <p className="mt-2 text-sm text-ivory/90 lg:mt-3 lg:text-lg">Better books. Bigger conversations.</p>
          </div>
        </div>
        <div className="rounded-t-[2rem] bg-cream px-6 pt-8 pb-10 lg:flex lg:w-[420px] lg:shrink-0 lg:flex-col lg:justify-center lg:rounded-none lg:px-12 lg:py-16 xl:w-[480px]">
          <div className="lg:mx-auto lg:w-full lg:max-w-sm">
            <Link
              href="/register"
              className="block w-full rounded-full bg-deep-brown py-3.5 text-center font-medium text-ivory"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="mt-3 block w-full rounded-full border border-beige bg-ivory py-3.5 text-center font-medium text-espresso"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const entries = await prisma.libraryEntry.findMany({
    where: { userId: session.user.id },
    include: { book: true },
    orderBy: { updatedAt: "desc" },
  });

  const counts = {
    READ: entries.filter((entry) => entry.status === "READ").length,
    READING: entries.filter((entry) => entry.status === "READING").length,
    WANT_TO_READ: entries.filter((entry) => entry.status === "WANT_TO_READ").length,
  };
  const continueReading = entries.filter((entry) => entry.status === "READING").slice(0, 3);
  const [booksOfTheWeek, currentPages] = await Promise.all([
    getBooksOfTheWeek(entries.map((entry) => entry.book.openLibraryKey)),
    currentPagesFor(continueReading.map((entry) => entry.id)),
  ]);

  return (
    <AppShell>
      <p className="font-serif text-[32px] leading-tight text-espresso">
        Good {greetingWord()}, {firstName(session.user.name, session.user.email)}
      </p>
      <div className="mt-5 lg:max-w-xl">
        <SearchBar />
      </div>
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-base font-medium">Your library</h2>
        <Link href="/library" className="text-sm text-warm-gray">
          See all
        </Link>
      </div>
      <div className="mt-3 space-y-2 lg:grid lg:grid-cols-3 lg:gap-3 lg:space-y-0">
        {STATUSES.map((status) => (
          <Link key={status} href={`/library?shelf=${status}`} className="block">
            <StatusChip status={status} count={counts[status]} />
          </Link>
        ))}
      </div>
      {continueReading.length > 0 ? (
        <>
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-base font-medium">Continue reading</h2>
            <Link href="/library?shelf=READING" className="text-sm text-warm-gray">
              See all
            </Link>
          </div>
          <ContinueReadingList
            items={continueReading.map((entry) => ({
              entryId: entry.id,
              title: entry.book.title,
              author: entry.book.author,
              coverId: entry.book.coverId,
              pageCount: entry.book.pageCount,
              currentPage: currentPages.get(entry.id) ?? null,
            }))}
          />
        </>
      ) : null}
      {booksOfTheWeek.length ? <BooksOfTheWeek books={booksOfTheWeek} /> : null}
    </AppShell>
  );
}

function greetingWord() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
