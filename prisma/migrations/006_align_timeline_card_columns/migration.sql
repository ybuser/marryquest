-- 006_align_timeline_card_columns
-- Goal: Make TimelineCard schema consistent across environments.
-- Safe, idempotent, non-destructive.

DO $$
BEGIN
  -- 0) Guard: if TimelineCard table doesn't exist, do nothing.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'TimelineCard'
  ) THEN
    RETURN;
  END IF;

  -- 1) Rename legacy columns if present (fresh DBs created from older migrations).
  -- text -> title
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='TimelineCard' AND column_name='text'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='TimelineCard' AND column_name='title'
  ) THEN
    ALTER TABLE "TimelineCard" RENAME COLUMN "text" TO "title";
  END IF;

  -- description -> shortDescription
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='TimelineCard' AND column_name='description'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='TimelineCard' AND column_name='shortDescription'
  ) THEN
    ALTER TABLE "TimelineCard" RENAME COLUMN "description" TO "shortDescription";
  END IF;

  -- 2) Ensure required columns exist.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='TimelineCard' AND column_name='photoUrl'
  ) THEN
    ALTER TABLE "TimelineCard" ADD COLUMN "photoUrl" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='TimelineCard' AND column_name='correctOrder'
  ) THEN
    ALTER TABLE "TimelineCard" ADD COLUMN "correctOrder" INTEGER NOT NULL DEFAULT 0;
    -- Backfill to preserve meaning: correctOrder mirrors existing order.
    UPDATE "TimelineCard" SET "correctOrder" = "order";
  END IF;

  -- 3) Ensure shortDescription exists and is NOT NULL.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='TimelineCard' AND column_name='shortDescription'
  ) THEN
    -- If neither description nor shortDescription existed, create it.
    ALTER TABLE "TimelineCard" ADD COLUMN "shortDescription" TEXT NOT NULL DEFAULT '';
  ELSE
    -- If it exists but is nullable, normalize to NOT NULL.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='TimelineCard' AND column_name='shortDescription'
        AND is_nullable='YES'
    ) THEN
      UPDATE "TimelineCard" SET "shortDescription" = '' WHERE "shortDescription" IS NULL;
      ALTER TABLE "TimelineCard" ALTER COLUMN "shortDescription" SET NOT NULL;
    END IF;
  END IF;

  -- 4) If title exists but is nullable, normalize (should be NOT NULL).
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='TimelineCard' AND column_name='title'
      AND is_nullable='YES'
  ) THEN
    UPDATE "TimelineCard" SET "title" = '' WHERE "title" IS NULL;
    ALTER TABLE "TimelineCard" ALTER COLUMN "title" SET NOT NULL;
  END IF;

  -- 5) Index: ("puzzleId","order") for stable ordering queries.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname='public'
      AND indexname='TimelineCard_puzzleId_order_idx'
  ) THEN
    CREATE INDEX "TimelineCard_puzzleId_order_idx" ON "TimelineCard" ("puzzleId", "order");
  END IF;
END $$;
