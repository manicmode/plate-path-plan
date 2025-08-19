BEGIN;

-- Store earned badges
CREATE TABLE IF NOT EXISTS public.user_habit_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_slug text NOT NULL,
  badge text NOT NULL CHECK (badge IN ('bronze','silver','gold')),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_slug, badge)
);

-- Fast lookup
CREATE INDEX IF NOT EXISTS idx_user_habit_badges_user_slug
  ON public.user_habit_badges(user_id, habit_slug);

-- Helper view already exists: v_habit_logs_norm (user_id, habit_slug, occurred_at, note)

-- RPC: check & award badges after a log
CREATE OR REPLACE FUNCTION public.rpc_check_and_award_badges_by_slug(p_habit_slug text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS
$$
DECLARE
  v_user uuid := auth.uid();
  v_total int;
  v_new jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.v_habit_logs_norm
  WHERE user_id = v_user AND habit_slug = p_habit_slug;

  -- thresholds
  IF v_total >= 10 THEN
    INSERT INTO public.user_habit_badges(user_id, habit_slug, badge)
    VALUES (v_user, p_habit_slug, 'bronze')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_new := v_new || jsonb_build_object('badge','bronze','count',10); END IF;
  END IF;

  IF v_total >= 30 THEN
    INSERT INTO public.user_habit_badges(user_id, habit_slug, badge)
    VALUES (v_user, p_habit_slug, 'silver')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_new := v_new || jsonb_build_object('badge','silver','count',30); END IF;
  END IF;

  IF v_total >= 100 THEN
    INSERT INTO public.user_habit_badges(user_id, habit_slug, badge)
    VALUES (v_user, p_habit_slug, 'gold')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_new := v_new || jsonb_build_object('badge','gold','count',100); END IF;
  END IF;

  RETURN v_new;
END;
$$;

-- RPC: list my badges (for UI)
CREATE OR REPLACE FUNCTION public.rpc_list_my_badges()
RETURNS TABLE(habit_slug text, badge text, awarded_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS
$$
  SELECT habit_slug, badge, awarded_at
  FROM public.user_habit_badges
  WHERE user_id = auth.uid()
  ORDER BY awarded_at DESC;
$$;

COMMIT;