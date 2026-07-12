-- Align the fresh-start migration chain with the current Prisma schema.
-- This does not delete existing rows or columns.
ALTER TABLE "TimelineCard"
  ALTER COLUMN "order" SET DEFAULT 0;
