-- Patch migration for safety & portability
-- 1) Ensure the timestamp trigger function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- 2) Create activity_steps table (idempotent)
CREATE TABLE IF NOT EXISTS public.activity_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  date date NOT NULL,
  steps integer NOT NULL DEFAULT 0,
  raw jsonb DEFAULT '{}'::jsonb,
  local_tz text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_steps_user_source_date_unique UNIQUE (user_id, source, date)
);

-- Enable RLS
ALTER TABLE public.activity_steps ENABLE ROW LEVEL SECURITY;

-- RLS: users can read/write their own rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_steps' AND policyname = 'Users can select own activity_steps'
  ) THEN
    CREATE POLICY "Users can select own activity_steps"
      ON public.activity_steps FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_steps' AND policyname = 'Users can insert own activity_steps'
  ) THEN
    CREATE POLICY "Users can insert own activity_steps"
      ON public.activity_steps FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_steps' AND policyname = 'Users can update own activity_steps'
  ) THEN
    CREATE POLICY "Users can update own activity_steps"
      ON public.activity_steps FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_steps' AND policyname = 'Users can delete own activity_steps'
  ) THEN
    CREATE POLICY "Users can delete own activity_steps"
      ON public.activity_steps FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3) Create oauth_tokens table (idempotent)
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oauth_tokens_user_provider_unique UNIQUE (user_id, provider)
);

-- Enable RLS
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS: users can read/write their own tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oauth_tokens' AND policyname = 'Users can select own oauth_tokens'
  ) THEN
    CREATE POLICY "Users can select own oauth_tokens"
      ON public.oauth_tokens FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oauth_tokens' AND policyname = 'Users can insert own oauth_tokens'
  ) THEN
    CREATE POLICY "Users can insert own oauth_tokens"
      ON public.oauth_tokens FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oauth_tokens' AND policyname = 'Users can update own oauth_tokens'
  ) THEN
    CREATE POLICY "Users can update own oauth_tokens"
      ON public.oauth_tokens FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oauth_tokens' AND policyname = 'Users can delete own oauth_tokens'
  ) THEN
    CREATE POLICY "Users can delete own oauth_tokens"
      ON public.oauth_tokens FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4) Timestamps triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_activity_steps_updated_at'
  ) THEN
    CREATE TRIGGER trg_activity_steps_updated_at
    BEFORE UPDATE ON public.activity_steps
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_oauth_tokens_updated_at'
  ) THEN
    CREATE TRIGGER trg_oauth_tokens_updated_at
    BEFORE UPDATE ON public.oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5) Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_steps_user_date 
  ON public.activity_steps (user_id, date);

CREATE INDEX IF NOT EXISTS idx_activity_steps_user_source_date
  ON public.activity_steps (user_id, source, date);

-- 6) Daily aggregation view with source_count for debugging merges
CREATE OR REPLACE VIEW public.activity_steps_daily AS
SELECT 
  user_id, 
  date, 
  MAX(steps) AS steps,
  COUNT(*) AS source_count
FROM public.activity_steps
GROUP BY user_id, date;

-- 7) Safe scheduling guidance (no hardcoded JWTs). Intentionally NOT scheduling here for portability.
/*
-- To enable a daily sync/backfill after deploy:
-- Ensure the following extensions are installed in your project:
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
-- Then schedule a job, using a secret pulled from a safe place (Vault or a DB setting), never a literal JWT.
-- Example (service-role key stored as a custom setting app.settings.service_role_key):
--
-- select cron.schedule(
--   'steps-sync-daily',           -- job name
--   '15 3 * * *',                 -- every day at 03:15 UTC
--   $$
--   select net.http_post(
--     url := 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/steps-sync',
--     headers := jsonb_build_object(
--       'Content-Type','application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
--     ),
--     body := jsonb_build_object('scope','backfill_30_days')
--   );
--   $$
-- );
--
-- If you prefer conditional scheduling directly (only when both extensions are present and a key is configured), run a guarded block separately after deploy.
*/
