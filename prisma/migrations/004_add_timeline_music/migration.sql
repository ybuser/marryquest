-- CreateTable
CREATE TABLE "TimelinePuzzle" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelinePuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineCard" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TimelineCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicTrack" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "url" TEXT,
    "createdByKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicVote" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimelinePuzzle_invitationId_key" ON "TimelinePuzzle"("invitationId");

-- CreateIndex
CREATE INDEX "TimelineCard_puzzleId_idx" ON "TimelineCard"("puzzleId");

-- CreateIndex
CREATE INDEX "MusicTrack_invitationId_idx" ON "MusicTrack"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicVote_invitationId_voterKey_key" ON "MusicVote"("invitationId", "voterKey");

-- CreateIndex
CREATE INDEX "MusicVote_trackId_idx" ON "MusicVote"("trackId");

-- AddForeignKey
ALTER TABLE "TimelinePuzzle" ADD CONSTRAINT "TimelinePuzzle_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineCard" ADD CONSTRAINT "TimelineCard_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "TimelinePuzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicTrack" ADD CONSTRAINT "MusicTrack_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicVote" ADD CONSTRAINT "MusicVote_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicVote" ADD CONSTRAINT "MusicVote_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "MusicTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
