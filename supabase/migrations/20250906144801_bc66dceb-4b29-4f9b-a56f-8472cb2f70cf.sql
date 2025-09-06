-- Remove only low-value cache entries so Nutritionix can repopulate
DELETE FROM public.food_enrichment_cache
WHERE lower(query) ~ '(club|yakis|aloo|pollo)'
  AND (source = 'FDC' OR source = 'EDAMAM')
  AND COALESCE(jsonb_array_length(response_data->'ingredients'), 0) <= 1
  AND created_at > now() - interval '2 days';