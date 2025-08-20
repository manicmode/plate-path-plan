-- Update RPC to include custom habits in domain activity counting
CREATE OR REPLACE FUNCTION public.rpc_get_domain_activity(p_days int DEFAULT 14)
RETURNS TABLE(domain habit_domain, logs_count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH logs AS (
    SELECT
      COALESCE(t.domain, uch.domain) AS domain
    FROM public.v_habit_logs_norm l
    LEFT JOIN public.habit_template t
           ON t.slug = l.habit_slug
    LEFT JOIN public.user_custom_habit uch
           ON uch.slug = l.habit_slug
          AND uch.user_id = auth.uid()
          AND uch.is_archived = false
    WHERE l.user_id = auth.uid()
      AND l.occurred_at >= (now() - make_interval(days => COALESCE(p_days, 14)))
  )
  SELECT domain, COUNT(*)::int AS logs_count
  FROM logs
  WHERE domain IS NOT NULL
  GROUP BY domain;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_domain_activity(int) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_get_domain_activity(int) TO authenticated;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_uch_user_slug ON public.user_custom_habit(user_id, slug);