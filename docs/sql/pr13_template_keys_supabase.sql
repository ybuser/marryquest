-- PR-13 TemplateKey expansion (safe manual sync for Supabase SQL Editor)
ALTER TYPE "TemplateKey" ADD VALUE IF NOT EXISTS 'bloom';
ALTER TYPE "TemplateKey" ADD VALUE IF NOT EXISTS 'luxe';
ALTER TYPE "TemplateKey" ADD VALUE IF NOT EXISTS 'modern';
ALTER TYPE "TemplateKey" ADD VALUE IF NOT EXISTS 'hanok';
