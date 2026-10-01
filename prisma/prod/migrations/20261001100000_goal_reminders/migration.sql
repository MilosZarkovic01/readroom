-- CreateTable
CREATE TABLE "GoalReminder" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoalReminder_goalId_periodKey_key" ON "GoalReminder"("goalId", "periodKey");

-- CreateIndex
CREATE INDEX "GoalReminder_sentAt_idx" ON "GoalReminder"("sentAt");

-- AddForeignKey
ALTER TABLE "GoalReminder" ADD CONSTRAINT "GoalReminder_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "ReadingGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
