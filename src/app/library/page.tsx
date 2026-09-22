import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { LibraryTabs } from "@/components/LibraryCard";
import type { ReadingStatus } from "@prisma/client";
import { STATUSES } from "@/lib/status";
import { parseSubjects } from "@/lib/subjects";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ shelf?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const params = await searchParams;
  const entries = await prisma.libraryEntry.findMany({
    where: { userId: session.user.id },
    include: { book: true },
    orderBy: { updatedAt: "desc" },
  });

  const requested = params.shelf as ReadingStatus;
  const initial = STATUSES.includes(requested)
    ? requested
    : (entries[0]?.status ?? "WANT_TO_READ");

  return (
    <AppShell>
      <h1 className="mb-4 font-serif text-[32px] text-espresso">Your library</h1>
      <LibraryTabs
        initial={initial}
        entries={entries.map((entry) => ({
          id: entry.id,
          status: entry.status,
          rating: entry.rating,
          review: entry.review,
          book: {
            title: entry.book.title,
            author: entry.book.author,
            coverId: entry.book.coverId,
            firstPublishYear: entry.book.firstPublishYear,
            description: entry.book.description,
            subjects: parseSubjects(entry.book.subjects),
          },
        }))}
      />
    </AppShell>
  );
}
