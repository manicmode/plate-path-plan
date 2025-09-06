-- Clear low-value cache rows (safe, minimal)
DELETE FROM public.food_enrichment_cache
WHERE (source = 'FDC' OR source = 'EDAMAM')
  AND COALESCE(jsonb_array_length(response_data->'ingredients'),0) <= 1
  AND query ~* '\s'          -- multi-word (likely complex dishes)
  AND created_at > now() - interval '7 days';