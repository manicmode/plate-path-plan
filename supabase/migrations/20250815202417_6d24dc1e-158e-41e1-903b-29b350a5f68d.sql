-- ---------- RLS POLICIES (add these so the UI can read/write) ----------
DROP POLICY IF EXISTS r20_msgs_select ON public.rank20_chat_messages;
CREATE POLICY r20_msgs_select
ON public.rank20_chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.rank20_groups g
    JOIN public.rank20_members m ON m.group_id = g.id
    WHERE g.challenge_id = rank20_chat_messages.challenge_id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS r20_msgs_insert ON public.rank20_chat_messages;
CREATE POLICY r20_msgs_insert
ON public.rank20_chat_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.rank20_groups g
    JOIN public.rank20_members m ON m.group_id = g.id
    WHERE g.challenge_id = rank20_chat_messages.challenge_id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS r20_members_select_mine ON public.rank20_members;
CREATE POLICY r20_members_select_mine
ON public.rank20_members FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.rank20_members me
    WHERE me.user_id = auth.uid()
      AND me.group_id = rank20_members.group_id
  )
);

DROP POLICY IF EXISTS pcp_select_mine ON public.private_challenge_participations;
CREATE POLICY pcp_select_mine
ON public.private_challenge_participations FOR SELECT
USING (user_id = auth.uid());

-- ---------- LEADERBOARD SHIM (guarded; only if the target exists) ----------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='my_rank20_leaderboard'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.rank20_leaderboard()
      RETURNS TABLE(user_id uuid, display_name text, avatar_url text, points integer, streak integer)
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = pg_catalog, public
      AS $leaderboard$ SELECT * FROM public.my_rank20_leaderboard() $leaderboard$;
    ';
    EXECUTE 'ALTER FUNCTION public.rank20_leaderboard() OWNER TO postgres';
    EXECUTE 'REVOKE ALL ON FUNCTION public.rank20_leaderboard() FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rank20_leaderboard() TO authenticated, service_role';
  END IF;
END
$$;

-- ---------- Quick sanity after apply ----------
SELECT
  polname, schemaname, tablename, cmd
FROM pg_policies
WHERE tablename IN ('rank20_chat_messages','rank20_members','private_challenge_participations')
ORDER BY tablename, polname;

SELECT
  p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('rank20_leaderboard')
ORDER BY p.proname;