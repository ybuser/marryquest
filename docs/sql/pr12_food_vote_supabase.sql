-- PR-12 FoodVote (safe manual sync for Supabase SQL Editor)
CREATE TABLE IF NOT EXISTS "FoodVoteOption" (
  "id" TEXT PRIMARY KEY,
  "invitationId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "FoodVote" (
  "id" TEXT PRIMARY KEY,
  "invitationId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "voterKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FoodVoteOption_invitationId_order_idx"
  ON "FoodVoteOption"("invitationId", "order");

CREATE UNIQUE INDEX IF NOT EXISTS "FoodVote_invitationId_voterKey_key"
  ON "FoodVote"("invitationId", "voterKey");

CREATE INDEX IF NOT EXISTS "FoodVote_invitationId_optionId_createdAt_idx"
  ON "FoodVote"("invitationId", "optionId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FoodVoteOption_invitationId_fkey'
  ) THEN
    ALTER TABLE "FoodVoteOption"
      ADD CONSTRAINT "FoodVoteOption_invitationId_fkey"
      FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FoodVote_invitationId_fkey'
  ) THEN
    ALTER TABLE "FoodVote"
      ADD CONSTRAINT "FoodVote_invitationId_fkey"
      FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FoodVote_optionId_fkey'
  ) THEN
    ALTER TABLE "FoodVote"
      ADD CONSTRAINT "FoodVote_optionId_fkey"
      FOREIGN KEY ("optionId") REFERENCES "FoodVoteOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
