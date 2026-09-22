import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchOpenLibrary, type SearchField } from "@/lib/open-library";
import { prisma } from "@/lib/prisma";

const FIELDS = new Set<SearchField>(["all", "title", "author"]);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const fieldParam = (searchParams.get("field") ?? "all") as SearchField;
  const field = FIELDS.has(fieldParam) ? fieldParam : "all";
  const page = Number(searchParams.get("page") ?? "1");

  try {
    const result = await searchOpenLibrary(q, field, page);
    const keys = result.books.map((book) => book.openLibraryKey);
    const owned = await prisma.libraryEntry.findMany({
      where: {
        userId: session.user.id,
        book: { openLibraryKey: { in: keys } },
      },
      include: { book: { select: { openLibraryKey: true } } },
    });

    const ownedByKey = new Map(
      owned.map((entry) => [entry.book.openLibraryKey, entry.status]),
    );

    return NextResponse.json({
      ...result,
      books: result.books.map((book) => ({
        ...book,
        libraryStatus: ownedByKey.get(book.openLibraryKey) ?? null,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not search Open Library." },
      { status: 502 },
    );
  }
}
