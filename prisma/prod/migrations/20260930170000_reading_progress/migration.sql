-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('TOTAL', 'DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "ReadingGoal" ADD COLUMN "period" "GoalPeriod" NOT NULL DEFAULT 'TOTAL',
ADD COLUMN "timeZone" TEXT;

-- AlterTable
ALTER TABLE "LibraryEntry" ADD COLUMN "pageCountOverride" INTEGER;

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
CREATE INDEX "ReadingLog_userId_createdAt_idx" ON "ReadingLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReadingLog_entryId_createdAt_idx" ON "ReadingLog"("entryId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReadingLog" ADD CONSTRAINT "ReadingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingLog" ADD CONSTRAINT "ReadingLog_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "LibraryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill
INSERT INTO "ReadingLog" ("id", "userId", "entryId", "page", "pagesRead", "createdAt")
SELECT md5(random()::text || e."id"), e."userId", e."id", b."pageCount", b."pageCount", COALESCE(e."finishedAt", e."updatedAt")
FROM "LibraryEntry" e
JOIN "Book" b ON b."id" = e."bookId"
WHERE e."status" = 'READ' AND b."pageCount" IS NOT NULL AND b."pageCount" > 0;
