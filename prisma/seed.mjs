import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const books = [
  {
    openLibraryKey: "/works/OL45883W",
    title: "The Night Circus",
    author: "Erin Morgenstern",
    coverId: 12822618,
    description: "A duel between two magicians in a mysterious circus that appears only at night.",
    subjects: JSON.stringify(["Fantasy", "Romance", "Magic"]),
  },
  {
    openLibraryKey: "/works/OL82563W",
    title: "Circe",
    author: "Madeline Miller",
    coverId: 8703984,
    description: "The story of the witch Circe, exiled to a remote island.",
    subjects: JSON.stringify(["Mythology", "Fantasy", "Retelling"]),
  },
  {
    openLibraryKey: "/works/OL257943W",
    title: "Piranesi",
    author: "Susanna Clarke",
    coverId: 10390016,
    description: "A man lives in a house of infinite halls and drowned statues.",
    subjects: JSON.stringify(["Fantasy", "Mystery"]),
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const claire = await prisma.user.upsert({
    where: { email: "claire@readroom.dev" },
    update: { name: "Claire Hart" },
    create: { email: "claire@readroom.dev", name: "Claire Hart", passwordHash },
  });
  const julian = await prisma.user.upsert({
    where: { email: "julian@readroom.dev" },
    update: { name: "Julian Moss" },
    create: { email: "julian@readroom.dev", name: "Julian Moss", passwordHash },
  });

  const savedBooks = [];
  for (const book of books) {
    savedBooks.push(
      await prisma.book.upsert({
        where: { openLibraryKey: book.openLibraryKey },
        update: book,
        create: book,
      }),
    );
  }

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: claire.id, followingId: julian.id } },
    update: {},
    create: { followerId: claire.id, followingId: julian.id },
  });
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: julian.id, followingId: claire.id } },
    update: {},
    create: { followerId: julian.id, followingId: claire.id },
  });

  const claireNight = await prisma.libraryEntry.upsert({
    where: { userId_bookId: { userId: claire.id, bookId: savedBooks[0].id } },
    update: {
      status: "READ",
      rating: 4.5,
      review: "Lush, theatrical, and impossible to put down.",
    },
    create: {
      userId: claire.id,
      bookId: savedBooks[0].id,
      status: "READ",
      rating: 4.5,
      review: "Lush, theatrical, and impossible to put down.",
    },
  });
  await prisma.libraryEntry.upsert({
    where: { userId_bookId: { userId: claire.id, bookId: savedBooks[1].id } },
    update: { status: "READING", rating: null, review: null },
    create: { userId: claire.id, bookId: savedBooks[1].id, status: "READING" },
  });
  await prisma.libraryEntry.upsert({
    where: { userId_bookId: { userId: julian.id, bookId: savedBooks[2].id } },
    update: { status: "READ", rating: 5, review: "Quiet and strange in the best way." },
    create: {
      userId: julian.id,
      bookId: savedBooks[2].id,
      status: "READ",
      rating: 5,
      review: "Quiet and strange in the best way.",
    },
  });
  await prisma.libraryEntry.upsert({
    where: { userId_bookId: { userId: julian.id, bookId: savedBooks[0].id } },
    update: { status: "WANT_TO_READ", rating: null, review: null },
    create: { userId: julian.id, bookId: savedBooks[0].id, status: "WANT_TO_READ" },
  });

  await prisma.activityLike.upsert({
    where: { userId_entryId: { userId: julian.id, entryId: claireNight.id } },
    update: {},
    create: { userId: julian.id, entryId: claireNight.id },
  });
  const existing = await prisma.activityComment.findFirst({
    where: { userId: julian.id, entryId: claireNight.id },
  });
  if (!existing) {
    await prisma.activityComment.create({
      data: {
        userId: julian.id,
        entryId: claireNight.id,
        body: "Adding this to my list tonight.",
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
