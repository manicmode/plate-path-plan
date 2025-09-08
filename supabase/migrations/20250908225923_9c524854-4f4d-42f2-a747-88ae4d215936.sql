-- 1) Column (idempotent)
ALTER TABLE public.food_enrichment_cache
  ADD COLUMN IF NOT EXISTS low_value boolean NOT NULL DEFAULT false;

-- 2) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_food_cache_lowvalue_created
  ON public.food_enrichment_cache (low_value, created_at);
CREATE INDEX IF NOT EXISTS idx_food_cache_query
  ON public.food_enrichment_cache (query);

-- 3) Clear just the QA keys (forces fresh re-enrichment)
DELETE FROM public.food_enrichment_cache
WHERE query IN ('club sandwich','club sandwich on wheat','yakisoba','aloo gobi','pollo con rajas');

-- 4) Safe, idempotent cleanup function (keeps TTL + adds low_value window)
CREATE OR REPLACE FUNCTION public.cleanup_food_enrichment_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Respect TTL expirations
  DELETE FROM public.food_enrichment_cache
  WHERE expires_at IS NOT NULL
    AND expires_at < now();

  -- Evict low-value rows quickly (older than 6h)
  DELETE FROM public.food_enrichment_cache
  WHERE low_value = true
    AND created_at < now() - interval '6 hours';

  RAISE LOG 'cleanup_food_enrichment_cache ran: TTL + low_value evictions applied';
END;
$$;