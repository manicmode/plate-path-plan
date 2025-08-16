-- Ensure extension exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule nightly rollup ONLY if pg_cron is available
DO $$
BEGIN
  -- check if pg_cron exists in pg_extension
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.schedule(
      'arena_rollup_nightly',
      '10 0 * * *',
      'SELECT public.arena_recompute_rollups_monthly(NULL, ''global'');'
    );
  ELSE
    RAISE NOTICE 'pg_cron not installed; skipping arena_rollup_nightly schedule.';
  END IF;
END $$;