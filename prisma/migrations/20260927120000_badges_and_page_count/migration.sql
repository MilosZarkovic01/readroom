-- AlterTable
ALTER TABLE "Book" ADD COLUMN "pageCount" INTEGER;

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeKey_key" ON "UserBadge"("userId", "badgeKey");

-- CreateIndex
CREATE INDEX "UserBadge_userId_unlockedAt_idx" ON "UserBadge"("userId", "unlockedAt");
