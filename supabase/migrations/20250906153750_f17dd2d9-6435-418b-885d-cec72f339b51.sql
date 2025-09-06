-- Table already exists; keep this for idempotency (no change if present)
CREATE TABLE IF NOT EXISTS public.qa_enrichment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  query text NOT NULL,
  source text,
  confidence numeric,
  ingredients_len int NOT NULL DEFAULT 0,
  kcal_100g numeric,
  serving_grams numeric,
  cache_was_hit boolean NOT NULL DEFAULT false,
  pass_fail text NOT NULL CHECK (pass_fail IN ('PASS','FAIL')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes (no-ops if they already exist)
CREATE INDEX IF NOT EXISTS idx_qa_enrichment_results_run
  ON public.qa_enrichment_results(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_qa_enrichment_results_query
  ON public.qa_enrichment_results(run_id, query);

-- RLS + proper policies
ALTER TABLE public.qa_enrichment_results ENABLE ROW LEVEL SECURITY;

-- Clean up any overly-permissive policies first
DROP POLICY IF EXISTS "Users can view QA results" ON public.qa_enrichment_results;
DROP POLICY IF EXISTS "Service role can insert QA results" ON public.qa_enrichment_results;

-- Reads: only authenticated users
CREATE POLICY "authenticated can view QA results"
  ON public.qa_enrichment_results
  FOR SELECT
  TO authenticated
  USING (true);

-- Writes/updates/deletes: service role only
CREATE POLICY "service role can manage QA results"
  ON public.qa_enrichment_results
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');