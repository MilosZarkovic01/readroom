-- AlterTable
ALTER TABLE "Book" ADD COLUMN "description" TEXT;
ALTER TABLE "LibraryEntry" ADD COLUMN "review" TEXT;
-- SQLite rebuilds the rating column via Prisma; existing integer ratings remain valid as floats.
