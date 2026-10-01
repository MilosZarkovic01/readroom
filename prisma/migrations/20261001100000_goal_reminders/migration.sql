-- CreateTable
CREATE TABLE "GoalReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalReminder_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "ReadingGoal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GoalReminder_goalId_periodKey_key" ON "GoalReminder"("goalId", "periodKey");

-- CreateIndex
CREATE INDEX "GoalReminder_sentAt_idx" ON "GoalReminder"("sentAt");
