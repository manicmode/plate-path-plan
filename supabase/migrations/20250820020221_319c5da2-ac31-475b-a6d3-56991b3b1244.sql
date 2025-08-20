-- 1) Enrich "my habits" with created_at (keep SECURITY DEFINER + current shape)
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
    SELECT
      m.slug,
      t.name        AS title,
      t.domain      AS domain,
      t.difficulty  AS difficulty
    FROM myh m
    LEFT JOIN public.habit_template t ON t.slug = m.slug
  ),
  c AS (
    SELECT habit_slug, COUNT(*)::int AS last_30d_count
    FROM public.v_habit_logs_norm
    WHERE user_id = auth.uid()
      AND occurred_at >= (now() - interval '30 days')
    GROUP BY habit_slug
  )
  SELECT 
    meta.slug AS habit_slug,
    meta.title,
    meta.domain,
    meta.difficulty,
    myh.target_per_week,
    myh.is_paused,
    COALESCE(c.last_30d_count, 0) AS last_30d_count,
    myh.created_at
  FROM meta
  JOIN myh ON myh.slug = meta.slug
  LEFT JOIN c ON c.habit_slug = meta.slug
  ORDER BY meta.title;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_my_habits_with_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_get_my_habits_with_stats() TO authenticated;

-- 2) Delete a single habit (handles template + custom, optional log purge)
CREATE OR REPLACE FUNCTION public.rpc_delete_user_habit(
  p_slug text,
  p_purge_logs boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- disable/remove reminders (correct table/column)
  DELETE FROM public.habit_reminders
   WHERE user_id = auth.uid() AND habit_slug = p_slug;

  -- optionally purge logs (delete by habit_id via slug)
  IF p_purge_logs THEN
    DELETE FROM public.habit_log hl
    USING public.habit_template t
    WHERE hl.user_id = auth.uid()
      AND t.slug = p_slug
      AND hl.habit_id = t.id;
  END IF;

  -- remove from active list
  DELETE FROM public.user_habit
   WHERE user_id = auth.uid() AND slug = p_slug;

  -- if it's a custom habit, archive its meta (future-proof)
  IF p_slug LIKE 'custom:%' THEN
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'user_custom_habit'
    ) THEN
      EXECUTE $sql$
        UPDATE public.user_custom_habit
           SET is_archived = true, updated_at = now()
         WHERE user_id = auth.uid() AND slug = $1
           AND COALESCE(is_archived, false) = false
      $sql$ USING p_slug;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_delete_user_habit(text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_delete_user_habit(text, boolean) TO authenticated;

-- 3) Bulk delete all paused habits (optionally purge logs) – safe + fast
CREATE OR REPLACE FUNCTION public.rpc_delete_all_paused_user_habits(
  p_purge_logs boolean DEFAULT false
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- purge reminders first (correct table/column)
  DELETE FROM public.habit_reminders r
  USING public.user_habit uh
  WHERE uh.user_id = auth.uid()
    AND uh.is_paused = true
    AND r.user_id = uh.user_id
    AND r.habit_slug = uh.slug;

  -- optionally purge logs (match habit_id via template id)
  IF p_purge_logs THEN
    DELETE FROM public.habit_log hl
    USING public.user_habit uh, public.habit_template t
    WHERE uh.user_id = auth.uid()
      AND uh.is_paused = true
      AND t.slug = uh.slug
      AND hl.user_id = uh.user_id
      AND hl.habit_id = t.id;
  END IF;

  -- archive custom meta for those paused
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'user_custom_habit'
  ) THEN
    EXECUTE $sql$
      UPDATE public.user_custom_habit uch
         SET is_archived = true, updated_at = now()
      FROM public.user_habit uh
      WHERE uh.user_id = auth.uid()
        AND uh.is_paused = true
        AND uch.user_id = uh.user_id
        AND uch.slug = uh.slug
        AND COALESCE(uch.is_archived, false) = false
    $sql$;
  END IF;

  -- finally remove paused rows
  WITH del AS (
    DELETE FROM public.user_habit
     WHERE user_id = auth.uid() AND is_paused = true
     RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM del;

  RETURN COALESCE(deleted_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_delete_all_paused_user_habits(boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_delete_all_paused_user_habits(boolean) TO authenticated;