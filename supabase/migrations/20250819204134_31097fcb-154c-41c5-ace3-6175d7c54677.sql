-- Helpful index for undo functionality
CREATE INDEX IF NOT EXISTS idx_habit_log_user_habit_ts
ON public.habit_log(user_id, habit_id, ts DESC);

-- RPC: undo most recent log for a slug
CREATE OR REPLACE FUNCTION public.rpc_undo_last_log_by_slug(p_habit_slug text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS
$$
DECLARE
  v_user uuid := auth.uid();
  v_habit_id uuid;
  v_row_id uuid;
  v_ts timestamptz;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id INTO v_habit_id
  FROM public.habit_template
  WHERE slug = p_habit_slug;

  IF v_habit_id IS NULL THEN
    RAISE EXCEPTION 'Unknown habit slug: %', p_habit_slug;
  END IF;

  -- Delete only the latest row for this user+habit
  WITH latest AS (
    SELECT id, ts
    FROM public.habit_log
    WHERE user_id = v_user AND habit_id = v_habit_id
    ORDER BY ts DESC
    LIMIT 1
  )
  DELETE FROM public.habit_log l
  USING latest x
  WHERE l.id = x.id
  RETURNING l.id, l.ts INTO v_row_id, v_ts;

  IF v_row_id IS NULL THEN
    RAISE EXCEPTION 'No log to undo for %', p_habit_slug;
  END IF;

  RETURN jsonb_build_object('id', v_row_id, 'slug', p_habit_slug, 'ts', v_ts);
END;
$$;