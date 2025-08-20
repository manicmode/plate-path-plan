-- Make the RPC run with elevated rights, but still filter by the caller's auth.uid()
CREATE OR REPLACE FUNCTION public.rpc_get_my_habits_with_stats()
RETURNS TABLE(
  habit_slug text, 
  title text, 
  domain habit_domain, 
  difficulty text, 
  target_per_week integer, 
  is_paused boolean, 
  last_30d_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
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

-- Tighten grants: revoke public, grant to authenticated
REVOKE ALL ON FUNCTION public.rpc_get_my_habits_with_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_get_my_habits_with_stats() TO authenticated;