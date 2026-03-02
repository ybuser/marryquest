-- Align schema with current Supabase production conventions

-- Drop old indexes replaced by compound indexes
DROP INDEX IF EXISTS "TimelineCard_puzzleId_idx";
DROP INDEX IF EXISTS "MusicTrack_invitationId_idx";
DROP INDEX IF EXISTS "MusicVote_trackId_idx";

-- Defaults / nullability alignment
ALTER TABLE "RSVPResponse"
  ALTER COLUMN "attendeeName" SET DEFAULT '';

UPDATE "TimelineCard"
SET "shortDescription" = ''
WHERE "shortDescription" IS NULL;

ALTER TABLE "TimelineCard"
  ALTER COLUMN "shortDescription" SET NOT NULL;

UPDATE "MusicTrack"
SET "artist" = ''
WHERE "artist" IS NULL;

ALTER TABLE "MusicTrack"
  ALTER COLUMN "artist" SET NOT NULL;

-- Timestamp precision/timezone alignment (FoodVote domain)
ALTER TABLE "FoodVoteOption"
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(6),
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(6);

ALTER TABLE "FoodVote"
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(6);

-- Additional indexes used in production
CREATE INDEX IF NOT EXISTS "Invitation_deletedAt_idx" ON "Invitation"("deletedAt");
CREATE INDEX IF NOT EXISTS "QuizQuestion_quizId_order_idx" ON "QuizQuestion"("quizId", "order");
CREATE INDEX IF NOT EXISTS "TimelineCard_puzzleId_correctOrder_idx" ON "TimelineCard"("puzzleId", "correctOrder");
CREATE INDEX IF NOT EXISTS "MusicTrack_invitationId_createdAt_idx" ON "MusicTrack"("invitationId", "createdAt");
CREATE INDEX IF NOT EXISTS "MusicVote_invitationId_trackId_idx" ON "MusicVote"("invitationId", "trackId");

-- Foreign key onUpdate policy alignment for food vote tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FoodVoteOption_invitationId_fkey') THEN
    ALTER TABLE "FoodVoteOption" DROP CONSTRAINT "FoodVoteOption_invitationId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FoodVote_invitationId_fkey') THEN
    ALTER TABLE "FoodVote" DROP CONSTRAINT "FoodVote_invitationId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FoodVote_optionId_fkey') THEN
    ALTER TABLE "FoodVote" DROP CONSTRAINT "FoodVote_optionId_fkey";
  END IF;

  ALTER TABLE "FoodVoteOption"
    ADD CONSTRAINT "FoodVoteOption_invitationId_fkey"
    FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

  ALTER TABLE "FoodVote"
    ADD CONSTRAINT "FoodVote_invitationId_fkey"
    FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

  ALTER TABLE "FoodVote"
    ADD CONSTRAINT "FoodVote_optionId_fkey"
    FOREIGN KEY ("optionId") REFERENCES "FoodVoteOption"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
END $$;

-- Preserve existing production unique index naming
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FoodVote_invitationId_voterKey_key') THEN
    ALTER INDEX "FoodVote_invitationId_voterKey_key" RENAME TO "FoodVote_invitationId_voterKey_uniq";
  END IF;
END $$;
