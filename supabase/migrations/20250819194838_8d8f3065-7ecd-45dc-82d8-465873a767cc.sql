-- 0) Create normalized view for logs (handles habit_id -> slug mapping)
CREATE OR REPLACE VIEW public.v_habit_logs_norm AS
SELECT 
  l.user_id, 
  t.slug AS habit_slug, 
  l.ts AS occurred_at, 
  l.note
FROM public.habit_log l
JOIN public.habit_template t ON t.id = l.habit_id;

-- Enable RLS on the view (inherits from underlying tables)
-- No explicit policies needed as it inherits from habit_log and habit_template

-- A) List active templates, optional domain filter
-- Adapting to actual column names: name (not title), summary (not description)
CREATE OR REPLACE FUNCTION public.rpc_list_active_habits(p_domain public.habit_domain DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  description text,
  domain public.habit_domain,
  difficulty text,
  category text
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS
$$
  SELECT t.id, t.slug, t.name AS title, t.summary AS description, t.domain, t.difficulty, t.category
  FROM public.habit_template t
  WHERE t.is_active = true
    AND (p_domain IS NULL OR t.domain = p_domain)
  ORDER BY t.name;
$$;

-- B) Upsert user's habit selection by slug
CREATE OR REPLACE FUNCTION public.rpc_upsert_user_habit_by_slug(p_habit_slug text, p_target_per_week int DEFAULT 5)
RETURNS public.user_habit LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS
$$
DECLARE
  v_user uuid := auth.uid();
  v_row public.user_habit;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.user_habit (user_id, slug, target_per_week)
  VALUES (v_user, p_habit_slug, GREATEST(1, LEAST(7, COALESCE(p_target_per_week, 5))))
  ON CONFLICT (user_id, slug)
  DO UPDATE SET target_per_week = EXCLUDED.target_per_week, updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- C) Log habit occurrence by slug (using habit_id mapping)
-- Adapting to actual schema: habit_id instead of template_id, ts instead of occurred_at
CREATE OR REPLACE FUNCTION public.rpc_log_habit_by_slug(p_habit_slug text, p_occurred_at timestamptz DEFAULT now(), p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS
$$
DECLARE
  v_user uuid := auth.uid();
  v_habit_id uuid;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Get habit_id from slug
  SELECT id INTO v_habit_id FROM public.habit_template WHERE slug = p_habit_slug AND is_active = true;
  IF v_habit_id IS NULL THEN RAISE EXCEPTION 'Unknown or inactive habit slug: %', p_habit_slug; END IF;

  -- Insert log using actual schema: habit_id, ts, user_id, note
  INSERT INTO public.habit_log (user_id, habit_id, ts, note, client_log_id)
  VALUES (v_user, v_habit_id, COALESCE(p_occurred_at, now()), p_note, gen_random_uuid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'slug', p_habit_slug, 'occurred_at', COALESCE(p_occurred_at, now()));
END;
$$;

-- D) Progress series for last_7d / last_30d using normalized view
CREATE OR REPLACE FUNCTION public.rpc_get_habit_progress(p_window text DEFAULT 'last_30d')
RETURNS TABLE(day date, logs_count int) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS
$$
  WITH bounds AS (
    SELECT CASE
      WHEN lower(p_window) = 'last_7d'  THEN (now()::date - 6)
      WHEN lower(p_window) = 'last_30d' THEN (now()::date - 29)
      ELSE (now()::date - 29)
    END AS start_day
  )
  SELECT d::date AS day, COUNT(l.user_id)::int AS logs_count
  FROM generate_series((SELECT start_day FROM bounds), now()::date, interval '1 day') d
  LEFT JOIN public.v_habit_logs_norm l
    ON l.user_id = auth.uid() AND l.occurred_at::date = d::date
  GROUP BY d
  ORDER BY d;
$$;

-- E) My habits with 30d stats (slug-based)
-- Adapting to actual column names: name as title, summary as description
CREATE OR REPLACE FUNCTION public.rpc_get_my_habits_with_stats()
RETURNS TABLE(
  habit_slug text,
  title text,
  domain public.habit_domain,
  difficulty text,
  target_per_week int,
  is_paused boolean,
  last_30d_count int
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS
$$
  WITH myh AS (
    SELECT uh.slug, uh.target_per_week, uh.is_paused
    FROM public.user_habit uh
    WHERE uh.user_id = auth.uid()
  ),
  c AS (
    SELECT habit_slug, COUNT(*)::int AS last_30d_count
    FROM public.v_habit_logs_norm
    WHERE user_id = auth.uid()
      AND occurred_at >= (now() - interval '30 days')
    GROUP BY habit_slug
  )
  SELECT t.slug AS habit_slug, t.name AS title, t.domain, t.difficulty,
         COALESCE(m.target_per_week, 5) AS target_per_week,
         COALESCE(m.is_paused, false)    AS is_paused,
         COALESCE(c.last_30d_count, 0)   AS last_30d_count
  FROM public.habit_template t
  JOIN myh m ON m.slug = t.slug
  LEFT JOIN c ON c.habit_slug = t.slug
  WHERE t.is_active = true
  ORDER BY t.name;
$$;

-- F) Upsert reminder by slug (matches existing habit_reminders schema)
CREATE OR REPLACE FUNCTION public.rpc_upsert_habit_reminder_by_slug(
  p_habit_slug text,
  p_frequency text,
  p_time_local time DEFAULT NULL,
  p_day_of_week int DEFAULT NULL,
  p_enabled boolean DEFAULT true
)
RETURNS public.habit_reminders LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS
$$
DECLARE
  v_user uuid := auth.uid();
  v_row public.habit_reminders;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_frequency NOT IN ('daily','weekly','custom') THEN RAISE EXCEPTION 'Invalid frequency: %', p_frequency; END IF;

  INSERT INTO public.habit_reminders (user_id, habit_slug, frequency, time_local, day_of_week, is_enabled)
  VALUES (v_user, p_habit_slug, p_frequency, p_time_local, p_day_of_week, COALESCE(p_enabled, true))
  ON CONFLICT (user_id, habit_slug)
  DO UPDATE SET frequency   = EXCLUDED.frequency,
                time_local  = EXCLUDED.time_local,
                day_of_week = EXCLUDED.day_of_week,
                is_enabled  = EXCLUDED.is_enabled
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;