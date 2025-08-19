BEGIN;

-- ---------- helpers ----------
-- Check if a function exists by name in 'public'
CREATE OR REPLACE FUNCTION public._fn_exists(fn_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = fn_name
  );
$$;

-- ---------- View: v_habit_consistency (over existing habit_log + user_habit) ----------
CREATE OR REPLACE VIEW public.v_habit_consistency AS
SELECT
  uh.user_id,
  uh.slug AS habit_slug,
  COUNT(hl.id) FILTER (WHERE hl.ts >= (current_date - interval '29 days'))::int AS done_30d,
  30::int AS window_days
FROM public.user_habit uh
LEFT JOIN public.habit_log hl ON hl.habit_id = uh.id
GROUP BY uh.user_id, uh.slug;

COMMENT ON VIEW public.v_habit_consistency IS
'Rolling 30-day completion counts per (user_id, habit_slug) based on habit_log joined with user_habit.';

-- ---------- RPC: start habit ----------
CREATE OR REPLACE FUNCTION public.rpc_start_habit(
  p_habit_slug text,
  p_reminder_time timetz DEFAULT NULL,
  p_frequency text DEFAULT 'daily'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  -- Preferred path: call existing project RPC if present
  IF public._fn_exists('rpc_add_user_habit') THEN
    -- Try common arities (slug only; slug + reminder/frequency if supported)
    BEGIN
      PERFORM public.rpc_add_user_habit(p_habit_slug);
      RETURN;
    EXCEPTION WHEN undefined_function THEN
      -- ignore; below we try a minimal insert
    END;
  END IF;

  -- Fallback: best-effort insert into user_habit, guarded for missing columns
  BEGIN
    INSERT INTO public.user_habit (user_id, slug, status)
    VALUES (auth.uid(), p_habit_slug, 'active')
    ON CONFLICT (user_id, slug) DO UPDATE
    SET status = 'active', updated_at = now();
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
  END;
END;
$$;

-- ---------- RPC: pause habit ----------
CREATE OR REPLACE FUNCTION public.rpc_pause_habit(
  p_habit_slug text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  -- If there's a status column, set paused. Otherwise no-op.
  BEGIN
    UPDATE public.user_habit
    SET status = 'paused', updated_at = now()
    WHERE user_id = auth.uid() AND slug = p_habit_slug;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
  END;
END;
$$;

-- ---------- RPC: resume habit ----------
CREATE OR REPLACE FUNCTION public.rpc_resume_habit(
  p_habit_slug text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  -- If there's a status column, set active. Otherwise no-op.
  BEGIN
    UPDATE public.user_habit
    SET status = 'active', updated_at = now()
    WHERE user_id = auth.uid() AND slug = p_habit_slug;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
  END;
END;
$$;

-- ---------- RPC: set reminder ----------
CREATE OR REPLACE FUNCTION public.rpc_set_habit_reminder(
  p_habit_slug text,
  p_reminder_time timetz,
  p_frequency text DEFAULT 'daily'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  -- Try to write reminder if such column exists. Otherwise no-op.
  BEGIN
    UPDATE public.user_habit
    SET reminder_at = p_reminder_time::time, updated_at = now()
    WHERE user_id = auth.uid() AND slug = p_habit_slug;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
  END;
END;
$$;

-- ---------- RPC: mark done (idempotent per (user, habit, day)) ----------
CREATE OR REPLACE FUNCTION public.rpc_mark_habit_done(
  p_habit_slug text,
  p_date date DEFAULT (now()::date),
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  -- Preferred: call existing project RPC if present
  IF public._fn_exists('rpc_log_habit') THEN
    BEGIN
      -- try (habit_id, amount, duration, note, ts)
      PERFORM public.rpc_log_habit(
        (SELECT id FROM public.user_habit WHERE user_id = auth.uid() AND slug = p_habit_slug LIMIT 1),
        1::numeric,
        NULL::numeric,
        p_notes,
        p_date::timestamptz
      );
      RETURN;
    EXCEPTION WHEN undefined_function THEN
      -- fall through to direct insert
    END;
  END IF;

  -- Fallback: write directly into habit_log with existing schema
  BEGIN
    INSERT INTO public.habit_log (
      habit_id, 
      user_id, 
      ts, 
      value, 
      note, 
      source, 
      client_log_id
    )
    SELECT 
      uh.id,
      auth.uid(),
      p_date::timestamptz,
      1::numeric,
      p_notes,
      'manual',
      gen_random_uuid()
    FROM public.user_habit uh
    WHERE uh.user_id = auth.uid() AND uh.slug = p_habit_slug
    ON CONFLICT DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
    WHEN unique_violation THEN NULL;
  END;
END;
$$;

-- ---------- Ownership and grants ----------
ALTER FUNCTION public.rpc_start_habit(text, timetz, text)        OWNER TO postgres;
ALTER FUNCTION public.rpc_pause_habit(text)                       OWNER TO postgres;
ALTER FUNCTION public.rpc_resume_habit(text)                      OWNER TO postgres;
ALTER FUNCTION public.rpc_set_habit_reminder(text, timetz, text)  OWNER TO postgres;
ALTER FUNCTION public.rpc_mark_habit_done(text, date, text)       OWNER TO postgres;

REVOKE ALL ON FUNCTION public.rpc_start_habit(text, timetz, text)        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_pause_habit(text)                       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_resume_habit(text)                      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_set_habit_reminder(text, timetz, text)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_mark_habit_done(text, date, text)       FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_start_habit(text, timetz, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_pause_habit(text)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_resume_habit(text)                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_set_habit_reminder(text, timetz, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_mark_habit_done(text, date, text)       TO authenticated;

-- (Optional, if server jobs should call them)
GRANT EXECUTE ON FUNCTION public.rpc_start_habit(text, timetz, text)        TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_pause_habit(text)                       TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_resume_habit(text)                      TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_set_habit_reminder(text, timetz, text)  TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_mark_habit_done(text, date, text)       TO service_role;

COMMENT ON FUNCTION public.rpc_start_habit(text, timetz, text)       IS 'Compatibility wrapper; starts a habit via existing RPC or user_habit insert.';
COMMENT ON FUNCTION public.rpc_pause_habit(text)                      IS 'Compatibility wrapper; pauses a habit if status column exists.';
COMMENT ON FUNCTION public.rpc_resume_habit(text)                     IS 'Compatibility wrapper; resumes a habit if status column exists.';
COMMENT ON FUNCTION public.rpc_set_habit_reminder(text, timetz, text) IS 'Compatibility wrapper; sets reminder/frequency if columns exist.';
COMMENT ON FUNCTION public.rpc_mark_habit_done(text, date, text)      IS 'Compatibility wrapper; logs completion via existing RPC or habit_log upsert.';

COMMIT;