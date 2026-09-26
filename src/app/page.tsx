import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { BookCover } from "@/components/BookCover";
import { BooksOfTheWeek } from "@/components/BooksOfTheWeek";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { SearchBar } from "@/components/SearchBar";
import { StatusChip } from "@/components/StatusChip";
import { STATUSES } from "@/lib/status";
import { getBooksOfTheWeek } from "@/lib/recommendations";
import landingBooks from "@/assets/landing-books.webp";

function firstName(name?: string | null, email?: string | null) {
  if (name?.trim()) return name.trim().split(" ")[0];
  if (email) return email.split("@")[0];
  return "there";
}

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="mx-auto flex min-h-full max-w-[430px] flex-col bg-cream">
        <div className="relative min-h-[58vh] flex-1 overflow-hidden">
          <Image
            src={landingBooks}
            alt="A stack of books and a coffee mug on a sunlit table"
            fill
            priority
            placeholder="blur"
            quality={70}
            sizes="430px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso/55 via-espresso/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-8 px-8 text-center text-ivory">
            <h1 className="font-serif text-5xl drop-shadow-sm">ReadRoom</h1>
            <p className="mt-2 text-sm text-ivory/90">Better books. Bigger conversations.</p>
          </div>
        </div>
        <div className="rounded-t-[2rem] bg-cream px-6 pt-8 pb-10">
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
          <p className="mt-4 text-center text-sm text-warm-gray">or</p>
          <div className="mt-3">
            <GoogleAuthButton mode="register" />
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
  const booksOfTheWeek = await getBooksOfTheWeek(entries.map((entry) => entry.book.openLibraryKey));

  return (
    <AppShell>
      <p className="font-serif text-[32px] leading-tight text-espresso">
        Good {greetingWord()}, {firstName(session.user.name, session.user.email)}
      </p>
      <div className="mt-5">
        <SearchBar />
      </div>
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-base font-medium">Your library</h2>
        <Link href="/library" className="text-sm text-warm-gray">
          See all
        </Link>
      </div>
      <div className="mt-3 space-y-2">
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
          <ul className="mt-2 divide-y divide-beige">
            {continueReading.map((entry) => (
              <li key={entry.id}>
                <Link href="/library?shelf=READING" className="flex items-center gap-3 py-3">
                  <BookCover coverId={entry.book.coverId} title={entry.book.title} size="XS" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entry.book.title}</p>
                    <p className="truncate text-sm text-warm-gray">{entry.book.author}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
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
