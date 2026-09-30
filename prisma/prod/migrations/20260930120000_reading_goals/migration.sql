-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('BOOK', 'BOOK_COUNT', 'PAGE_COUNT');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('TOTAL', 'DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "LibraryEntry" ADD COLUMN "finishedAt" TIMESTAMP(3);

-- Backfill
UPDATE "LibraryEntry" SET "finishedAt" = "updatedAt" WHERE "status" = 'READ';

-- CreateTable
CREATE TABLE "ReadingGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "period" "GoalPeriod" NOT NULL DEFAULT 'TOTAL',
    "timeZone" TEXT,
    "target" INTEGER,
    "bookId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "pagesRead" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingGoal_userId_completedAt_idx" ON "ReadingGoal"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "ReadingLog_userId_createdAt_idx" ON "ReadingLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReadingLog_entryId_createdAt_idx" ON "ReadingLog"("entryId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReadingGoal" ADD CONSTRAINT "ReadingGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingGoal" ADD CONSTRAINT "ReadingGoal_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingLog" ADD CONSTRAINT "ReadingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingLog" ADD CONSTRAINT "ReadingLog_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "LibraryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill
INSERT INTO "ReadingLog" ("id", "userId", "entryId", "page", "pagesRead", "createdAt")
SELECT md5(random()::text || e."id"), e."userId", e."id", b."pageCount", b."pageCount", e."finishedAt"
FROM "LibraryEntry" e
JOIN "Book" b ON b."id" = e."bookId"
WHERE e."status" = 'READ' AND b."pageCount" IS NOT NULL AND b."pageCount" > 0;
