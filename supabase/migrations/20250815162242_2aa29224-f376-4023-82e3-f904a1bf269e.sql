-- 0) Ensure RLS is ON for all arena tables
ALTER TABLE public.rank20_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_billboard_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_groups ENABLE ROW LEVEL SECURITY;

-- 1) Lock down SECURITY DEFINER functions
ALTER FUNCTION public.my_rank20_members() STABLE;
ALTER FUNCTION public.my_rank20_members() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_members() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_members() TO authenticated, service_role;

ALTER FUNCTION public.my_rank20_leaderboard() STABLE;
ALTER FUNCTION public.my_rank20_leaderboard() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard() TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='arena_post_message'
  ) THEN
    ALTER FUNCTION public.arena_post_message(text) STABLE;
    ALTER FUNCTION public.arena_post_message(text) OWNER TO postgres;
    REVOKE ALL ON FUNCTION public.arena_post_message(text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.arena_post_message(text) TO authenticated, service_role;
  END IF;
END$$;

-- 2) Sanity: search_path already pinned to public, pg_catalog

-- 3) Prevent spoofing user_id
DROP POLICY IF EXISTS "Users can insert chat messages for their rank20 groups" ON public.rank20_chat_messages;
CREATE POLICY "Users can insert chat messages for their rank20 groups"
ON public.rank20_chat_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.rank20_groups rg
    JOIN public.rank20_members rm ON rm.group_id = rg.id
    WHERE rg.challenge_id = rank20_chat_messages.challenge_id
      AND rm.user_id = auth.uid()
  )
);

-- 4) Remove PUBLIC grants on arena tables
REVOKE ALL ON public.rank20_chat_messages FROM PUBLIC;
REVOKE ALL ON public.rank20_chat_reactions FROM PUBLIC;
REVOKE ALL ON public.rank20_billboard_messages FROM PUBLIC;