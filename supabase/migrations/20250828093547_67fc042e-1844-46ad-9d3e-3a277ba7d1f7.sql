-- PHASE 2: Quarantine suspected mock rows (reversible, no deletes)
BEGIN;

-- Add soft-delete / mock flags
ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS is_mock boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_is_mock      ON public.nutrition_logs(is_mock);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_deleted_at   ON public.nutrition_logs(deleted_at);

-- Backup table to snapshot anything we tag as mock
CREATE TABLE IF NOT EXISTS public._nutrition_logs_quarantine
  (LIKE public.nutrition_logs INCLUDING ALL);

ALTER TABLE public._nutrition_logs_quarantine
  ADD COLUMN IF NOT EXISTS quarantined_at timestamptz NOT NULL DEFAULT now();

-- Define candidates once (narrow time window + sources/names), avoid retagging
WITH candidates AS (
  SELECT id
  FROM public.nutrition_logs
  WHERE is_mock = false
    AND deleted_at IS NULL
    AND created_at < '2025-08-20'
    AND (
      source IN ('vision_api','off_demo')
      OR food_name IN (
        'Baked Beans','Apple','Greek Yogurt','Chicken Salad','Protein Shake',
        'Stew','Eggs','Chicken Breast','Salad','Whole Grain Bread','Avocado'
      )
    )
)

-- Snapshot current rows into backup
INSERT INTO public._nutrition_logs_quarantine
SELECT nl.*, now() AS quarantined_at
FROM public.nutrition_logs nl
JOIN candidates c ON c.id = nl.id
ON CONFLICT DO NOTHING;

-- Tag as mock (reversible)
UPDATE public.nutrition_logs nl
SET is_mock = true
WHERE id IN (SELECT id FROM candidates);

COMMIT;