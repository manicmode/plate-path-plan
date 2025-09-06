-- 0) Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Table
CREATE TABLE IF NOT EXISTS public.food_enrichment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,              -- e.g., sha256(lower(name)|locale|portionHint)
  query TEXT NOT NULL,                          -- original user text (normalized if you prefer)
  response_data JSONB NOT NULL,                 -- canonical EnrichedFood payload
  source TEXT NOT NULL,                         -- FDC | EDAMAM | NUTRITIONIX | CURATED | ESTIMATED
  confidence NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ                        -- set by app (e.g., now() + interval '90 days')
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_food_enrichment_cache_query_hash ON public.food_enrichment_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_food_enrichment_cache_created_at ON public.food_enrichment_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_food_enrichment_cache_expires_at ON public.food_enrichment_cache(expires_at);

-- 3) RLS
ALTER TABLE public.food_enrichment_cache ENABLE ROW LEVEL SECURITY;

-- Read: any logged-in user can read (cache is non-sensitive data)
DROP POLICY IF EXISTS "Users can view all cache entries" ON public.food_enrichment_cache;
CREATE POLICY "authenticated can read cache"
ON public.food_enrichment_cache
FOR SELECT
TO authenticated
USING (true);

-- Writes: no policy on purpose.
-- Edge Functions use the service key which BYPASSES RLS, so only service_role can write.

-- 4) updated_at trigger helper (create if missing)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_food_enrichment_cache_updated_at
ON public.food_enrichment_cache;

CREATE TRIGGER update_food_enrichment_cache_updated_at
BEFORE UPDATE ON public.food_enrichment_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();