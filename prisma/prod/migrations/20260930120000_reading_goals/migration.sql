-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('BOOK', 'BOOK_COUNT', 'PAGE_COUNT');

-- AlterTable
ALTER TABLE "LibraryEntry" ADD COLUMN "finishedAt" TIMESTAMP(3);

-- Backfill
UPDATE "LibraryEntry" SET "finishedAt" = "updatedAt" WHERE "status" = 'READ';

-- CreateTable
CREATE TABLE "ReadingGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "target" INTEGER,
    "bookId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingGoal_userId_completedAt_idx" ON "ReadingGoal"("userId", "completedAt");

-- AddForeignKey
ALTER TABLE "ReadingGoal" ADD CONSTRAINT "ReadingGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingGoal" ADD CONSTRAINT "ReadingGoal_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
