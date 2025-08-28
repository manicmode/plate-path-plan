-- Expose the new columns via the clean view the UI already uses
CREATE OR REPLACE VIEW public.nutrition_logs_clean AS
SELECT
  id, user_id, food_name, calories, protein, carbs, fat, fiber, sugar, sodium,
  serving_size, confidence, source, image_url, created_at,
  quality_score, quality_verdict, quality_reasons, processing_level,
  ingredient_analysis, trigger_tags, saturated_fat, barcode, brand,
  updated_at, is_mock, deleted_at,
  report_snapshot, snapshot_version, source_meta
FROM public.nutrition_logs
WHERE is_mock = false AND deleted_at IS NULL;

-- keep RLS/permissions behavior the same
ALTER VIEW public.nutrition_logs_clean SET (security_invoker = on);
GRANT SELECT ON public.nutrition_logs_clean TO authenticated;