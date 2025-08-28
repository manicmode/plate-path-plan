-- Add snapshot columns to nutrition_logs table
ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS report_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_version text,
  ADD COLUMN IF NOT EXISTS source_meta jsonb;