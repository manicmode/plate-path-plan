-- ensure UUIDs work
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- table
CREATE TABLE IF NOT EXISTS public.qa_enrichment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  query text NOT NULL,
  source text,
  confidence numeric,
  ingredients_len int,
  kcal_100g numeric,
  serving_grams numeric,
  cache_was_hit boolean,
  pass_fail text CHECK (pass_fail IN ('PASS','FAIL')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_qa_enrichment_results_run
  ON public.qa_enrichment_results(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_qa_enrichment_results_query
  ON public.qa_enrichment_results(run_id, query);

-- RLS
ALTER TABLE public.qa_enrichment_results ENABLE ROW LEVEL SECURITY;

-- writes: service role only (service role bypasses RLS anyway; this is harmless)
DROP POLICY IF EXISTS "Service role can manage QA results" ON public.qa_enrichment_results;
CREATE POLICY "Service role can manage QA results"
  ON public.qa_enrichment_results
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- reads: allow any logged-in user (avoids dependency on a custom is_admin() function)
DROP POLICY IF EXISTS "Admins can view QA results" ON public.qa_enrichment_results;
CREATE POLICY "authenticated can view QA results"
  ON public.qa_enrichment_results
  FOR SELECT
  TO authenticated
  USING (true);