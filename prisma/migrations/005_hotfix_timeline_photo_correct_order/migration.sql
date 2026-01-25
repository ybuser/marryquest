-- AlterTable
ALTER TABLE "TimelineCard" ADD COLUMN "description" TEXT;
ALTER TABLE "TimelineCard" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "TimelineCard" ADD COLUMN "correctOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill
UPDATE "TimelineCard" SET "correctOrder" = "order";
