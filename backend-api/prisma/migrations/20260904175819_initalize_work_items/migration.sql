-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('RECEIVED', 'ANALYSING', 'READY_FOR_REVIEW', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "WorkItemStatus" NOT NULL DEFAULT 'RECEIVED',
    "category" TEXT,
    "priority" TEXT,
    "summary" TEXT,
    "recommendedAction" TEXT,
    "analysisError" TEXT,
    "analysisAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_items_externalId_key" ON "work_items"("externalId");
