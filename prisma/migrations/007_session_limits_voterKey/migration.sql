ALTER TABLE "RSVPResponse"
ADD COLUMN "voterKey" TEXT;

ALTER TABLE "GuestbookEntry"
ADD COLUMN "voterKey" TEXT;

CREATE INDEX "RSVPResponse_invitationId_voterKey_createdAt_idx"
ON "RSVPResponse" ("invitationId", "voterKey", "createdAt");

CREATE INDEX "GuestbookEntry_invitationId_voterKey_createdAt_idx"
ON "GuestbookEntry" ("invitationId", "voterKey", "createdAt");
