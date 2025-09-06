DELETE FROM public.food_enrichment_cache
WHERE source='FDC'
  AND COALESCE(jsonb_array_length(response_data->'ingredients'),0) <= 1
  AND query ~* '\s';