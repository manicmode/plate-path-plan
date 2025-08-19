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

-- ---------- View: v_habit_consistency (over existing habit_log) ----------
CREATE OR REPLACE VIEW public.v_habit_consistency AS
SELECT
  hl.user_id,
  hl.habit_slug,
  SUM(CASE WHEN COALESCE(hl.completed, true) THEN 1 ELSE 0 END)
    FILTER (WHERE hl.occurred_on >= (current_date - 29))::int AS done_30d,
  30::int AS window_days
FROM public.habit_log hl
GROUP BY hl.user_id, hl.habit_slug;

COMMENT ON VIEW public.v_habit_consistency IS
'Rolling 30-day completion counts per (user_id, habit_slug) based on habit_log.';

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
    EXCEPTION WHEN undefined_function THEN
      -- ignore; below we try a minimal insert
    END IF;
  END IF;

  -- Fallback: best-effort insert into user_habit, guarded for missing columns
  BEGIN
    EXECUTE $i$
      INSERT INTO public.user_habit (user_id, habit_slug, started_at, status)
      VALUES (auth.uid(), $i$ || quote_literal(p_habit_slug) || $i$, now(), 'active')
      ON CONFLICT DO NOTHING
    $i$;
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
    EXECUTE $i$
      UPDATE public.user_habit
         SET status = 'paused', updated_at = now()
       WHERE user_id = auth.uid() AND habit_slug = $i$ || quote_literal(p_habit_slug) || $i$
    $i$;
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
    EXECUTE $i$
      UPDATE public.user_habit
         SET status = 'active', updated_at = now()
       WHERE user_id = auth.uid() AND habit_slug = $i$ || quote_literal(p_habit_slug) || $i$
    $i$;
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

  -- Try to write reminder/frequency if such columns exist. Otherwise no-op.
  BEGIN
    EXECUTE format(
      'UPDATE public.user_habit
          SET %s = $1, %s = $2, updated_at = now()
        WHERE user_id = auth.uid() AND habit_slug = $3',
      'reminder_time', 'frequency'
    )
    USING p_reminder_time, COALESCE(p_frequency,'daily'), p_habit_slug;
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
      -- try (slug, date, notes)
      PERFORM public.rpc_log_habit(p_habit_slug, p_date, p_notes);
      RETURN;
    EXCEPTION WHEN undefined_function THEN
      -- try (slug, date)
      BEGIN
        PERFORM public.rpc_log_habit(p_habit_slug, p_date);
        RETURN;
      EXCEPTION WHEN undefined_function THEN
        -- try (slug)
        BEGIN
          PERFORM public.rpc_log_habit(p_habit_slug);
          RETURN;
        EXCEPTION WHEN undefined_function THEN
          -- fall through to direct insert
        END;
      END;
    END;
  END IF;

  -- Fallback: write directly into habit_log with common columns if present
  BEGIN
    EXECUTE $i$
      INSERT INTO public.habit_log (user_id, habit_slug, occurred_on, completed, notes, created_at)
      VALUES (auth.uid(), $i$ || quote_literal(p_habit_slug) || $i$, $i$ || quote_literal(p_date) || $i$, true, $i$ || quote_nullable(p_notes) || $i$, now())
      ON CONFLICT (user_id, habit_slug, occurred_on) DO UPDATE
      SET completed = true, notes = EXCLUDED.notes
    $i$;
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