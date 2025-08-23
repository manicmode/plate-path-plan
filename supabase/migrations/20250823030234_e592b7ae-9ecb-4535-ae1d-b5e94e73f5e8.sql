BEGIN;

-- Immutable-friendly minute bucket for dedupe
ALTER TABLE public.hydration_logs
  ADD COLUMN IF NOT EXISTS minute_key bigint
  GENERATED ALWAYS AS ((extract(epoch from created_at)::bigint / 60)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS hydration_dedupe_minute
  ON public.hydration_logs (user_id, minute_key, volume);

COMMIT;