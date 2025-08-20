-- Create & Discover: Custom Habits (Fixed GRANT signatures)

-- 1. Table for user-made habits
CREATE TABLE IF NOT EXISTS public.user_custom_habit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  slug        text UNIQUE NOT NULL,                 -- format: 'custom:' || gen_random_uuid()
  title       text NOT NULL,
  domain      habit_domain NOT NULL,                -- reuse existing enum
  difficulty  text NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  description text,
  icon        text,                                 -- emoji like '🍎'
  is_archived boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.user_custom_habit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_custom_habit' AND policyname='uch_read_own'
  ) THEN
    CREATE POLICY uch_read_own ON public.user_custom_habit
    FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_custom_habit' AND policyname='uch_write_own'
  ) THEN
    CREATE POLICY uch_write_own ON public.user_custom_habit
    FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- 2. Create custom habit RPC
CREATE OR REPLACE FUNCTION public.rpc_create_custom_habit(
  p_title text,
  p_domain habit_domain,
  p_difficulty text,
  p_description text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_target_per_week int DEFAULT 5,
  p_use_auto boolean DEFAULT true,
  p_frequency text DEFAULT 'daily',
  p_time_local time DEFAULT NULL,
  p_days_of_week int[] DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text := 'custom:' || gen_random_uuid();
BEGIN
  -- metadata
  INSERT INTO public.user_custom_habit (user_id, slug, title, domain, difficulty, description, icon)
  VALUES (auth.uid(), v_slug, p_title, p_domain, p_difficulty, p_description, p_icon);

  -- add to active user habits
  INSERT INTO public.user_habit (user_id, slug, target_per_week, is_paused)
  VALUES (auth.uid(), v_slug, COALESCE(p_target_per_week,5), false)
  ON CONFLICT (user_id, slug) DO NOTHING;

  -- reminders via existing RPC (defensive try/catch)
  BEGIN
    PERFORM public.rpc_upsert_habit_reminder_by_slug(
      v_slug,
      CASE WHEN p_use_auto THEN 'auto' ELSE p_frequency END,
      p_time_local,
      p_days_of_week,
      true
    );
  EXCEPTION WHEN OTHERS THEN
    -- Continue if reminder RPC doesn't exist yet
    NULL;
  END;

  RETURN v_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_create_custom_habit(
  text, habit_domain, text, text, text, integer, boolean, text, time, integer[]
) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_create_custom_habit(
  text, habit_domain, text, text, text, integer, boolean, text, time, integer[]
) TO authenticated;

-- 3. Updated My Habits with custom merge
DROP FUNCTION IF EXISTS public.rpc_get_my_habits_with_stats();

CREATE OR REPLACE FUNCTION public.rpc_get_my_habits_with_stats()
RETURNS TABLE(
  habit_slug       text,
  title            text,
  domain           habit_domain,
  difficulty       text,
  target_per_week  integer,
  is_paused        boolean,
  last_30d_count   integer,
  created_at       timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH myh AS (
    SELECT uh.slug, uh.target_per_week, COALESCE(uh.is_paused,false) AS is_paused, uh.created_at
    FROM public.user_habit uh
    WHERE uh.user_id = auth.uid()
  ),
  meta AS (
    SELECT m.slug,
           COALESCE(t.name, uch.title)       AS title,
           COALESCE(t.domain, uch.domain)    AS domain,
           COALESCE(t.difficulty, uch.difficulty) AS difficulty
    FROM myh m
    LEFT JOIN public.habit_template    t   ON t.slug = m.slug
    LEFT JOIN public.user_custom_habit uch ON uch.slug = m.slug AND uch.user_id = auth.uid() AND uch.is_archived = false
  ),
  c AS (
    SELECT habit_slug, COUNT(*)::int AS last_30d_count
    FROM public.v_habit_logs_norm
    WHERE user_id = auth.uid()
      AND occurred_at >= (now() - interval '30 days')
    GROUP BY habit_slug
  )
  SELECT meta.slug AS habit_slug, meta.title, meta.domain, meta.difficulty,
         myh.target_per_week, myh.is_paused,
         COALESCE(c.last_30d_count, 0) AS last_30d_count,
         myh.created_at
  FROM meta
  JOIN myh ON myh.slug = meta.slug
  LEFT JOIN c ON c.habit_slug = meta.slug
  ORDER BY meta.title;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_my_habits_with_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_get_my_habits_with_stats() TO authenticated;

-- 4. History for charts (both template & custom)
CREATE OR REPLACE FUNCTION public.rpc_get_habit_history(
  p_slug text,
  p_days int DEFAULT 30
) RETURNS TABLE(d date, count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dd::date AS d,
         COALESCE(SUM(CASE WHEN hl.habit_slug = p_slug THEN 1 ELSE 0 END), 0)::int AS count
  FROM generate_series((now() - (COALESCE(p_days,30) || ' days')::interval), now(), interval '1 day') dd
  LEFT JOIN public.v_habit_logs_norm hl
         ON hl.user_id = auth.uid()
        AND hl.occurred_at::date = dd::date
  GROUP BY dd
  ORDER BY dd;
$$;

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_user_custom_habit_user ON public.user_custom_habit(user_id);

REVOKE ALL ON FUNCTION public.rpc_get_habit_history(text,int) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_get_habit_history(text,int) TO authenticated;