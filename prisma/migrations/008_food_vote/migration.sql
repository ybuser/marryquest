CREATE TABLE "FoodVoteOption" (
  "id" TEXT NOT NULL,
  "invitationId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FoodVoteOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FoodVote" (
  "id" TEXT NOT NULL,
  "invitationId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "voterKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FoodVote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FoodVoteOption_invitationId_order_idx" ON "FoodVoteOption"("invitationId", "order");
CREATE UNIQUE INDEX "FoodVote_invitationId_voterKey_key" ON "FoodVote"("invitationId", "voterKey");
CREATE INDEX "FoodVote_invitationId_optionId_createdAt_idx" ON "FoodVote"("invitationId", "optionId", "createdAt");

ALTER TABLE "FoodVoteOption" ADD CONSTRAINT "FoodVoteOption_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FoodVote" ADD CONSTRAINT "FoodVote_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FoodVote" ADD CONSTRAINT "FoodVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "FoodVoteOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
