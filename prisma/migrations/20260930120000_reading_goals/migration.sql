-- AlterTable
ALTER TABLE "LibraryEntry" ADD COLUMN "finishedAt" DATETIME;

-- Backfill
UPDATE "LibraryEntry" SET "finishedAt" = "updatedAt" WHERE "status" = 'READ';

-- CreateTable
CREATE TABLE "ReadingGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" INTEGER,
    "bookId" TEXT,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadingGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingGoal_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReadingGoal_userId_completedAt_idx" ON "ReadingGoal"("userId", "completedAt");
