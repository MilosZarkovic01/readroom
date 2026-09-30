-- AlterTable
ALTER TABLE "LibraryEntry" ADD COLUMN "finishedAt" DATETIME;

-- Backfill
UPDATE "LibraryEntry" SET "finishedAt" = "updatedAt" WHERE "status" = 'READ';

-- CreateTable
CREATE TABLE "ReadingGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'TOTAL',
    "timeZone" TEXT,
    "target" INTEGER,
    "bookId" TEXT,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadingGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingGoal_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "pagesRead" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingLog_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "LibraryEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReadingGoal_userId_completedAt_idx" ON "ReadingGoal"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "ReadingLog_userId_createdAt_idx" ON "ReadingLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReadingLog_entryId_createdAt_idx" ON "ReadingLog"("entryId", "createdAt");

-- Backfill
INSERT INTO "ReadingLog" ("id", "userId", "entryId", "page", "pagesRead", "createdAt")
SELECT lower(hex(randomblob(12))), e."userId", e."id", b."pageCount", b."pageCount", e."finishedAt"
FROM "LibraryEntry" e
JOIN "Book" b ON b."id" = e."bookId"
WHERE e."status" = 'READ' AND b."pageCount" IS NOT NULL AND b."pageCount" > 0;
