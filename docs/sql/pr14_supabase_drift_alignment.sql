-- PR-14 Supabase drift alignment (safe manual sync for SQL Editor)

-- 1) Backfill values before enforcing NOT NULL
UPDATE "TimelineCard"
SET "shortDescription" = ''
WHERE "shortDescription" IS NULL;

UPDATE "MusicTrack"
SET "artist" = ''
WHERE "artist" IS NULL;

-- 2) Drop obsolete indexes (if present)
DROP INDEX IF EXISTS "TimelineCard_puzzleId_idx";
DROP INDEX IF EXISTS "MusicTrack_invitationId_idx";
DROP INDEX IF EXISTS "MusicVote_trackId_idx";

-- 3) Align defaults / nullability
ALTER TABLE "RSVPResponse"
  ALTER COLUMN "attendeeName" SET DEFAULT '';

ALTER TABLE "TimelineCard"
  ALTER COLUMN "shortDescription" SET NOT NULL;

ALTER TABLE "MusicTrack"
  ALTER COLUMN "artist" SET NOT NULL;

-- 4) Align timestamp types for FoodVote domain
ALTER TABLE "FoodVoteOption"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt"::timestamptz;

ALTER TABLE "FoodVote"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz;

-- 5) Ensure indexes exist
CREATE INDEX IF NOT EXISTS "Invitation_deletedAt_idx" ON "Invitation"("deletedAt");
CREATE INDEX IF NOT EXISTS "QuizQuestion_quizId_order_idx" ON "QuizQuestion"("quizId", "order");
CREATE INDEX IF NOT EXISTS "TimelineCard_puzzleId_correctOrder_idx" ON "TimelineCard"("puzzleId", "correctOrder");
CREATE INDEX IF NOT EXISTS "MusicTrack_invitationId_createdAt_idx" ON "MusicTrack"("invitationId", "createdAt");
CREATE INDEX IF NOT EXISTS "MusicVote_invitationId_trackId_idx" ON "MusicVote"("invitationId", "trackId");

-- 6) FoodVote foreign keys onUpdate NO ACTION
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

-- 7) Align unique index naming
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FoodVote_invitationId_voterKey_key') THEN
    ALTER INDEX "FoodVote_invitationId_voterKey_key" RENAME TO "FoodVote_invitationId_voterKey_uniq";
  END IF;
END $$;
