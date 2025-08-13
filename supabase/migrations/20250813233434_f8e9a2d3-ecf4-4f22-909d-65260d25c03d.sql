-- A. Seed RPC (SECURITY DEFINER) used by the "Seed demo events" button
CREATE OR REPLACE FUNCTION public.seed_billboard_events(_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only creator or participant may seed (so it's safe in dev)
  IF NOT EXISTS (
    SELECT 1
    FROM public.private_challenges pc
    LEFT JOIN public.private_challenge_participations p
      ON p.private_challenge_id = pc.id AND p.user_id = auth.uid()
    WHERE pc.id = _challenge_id
      AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'not a member of this challenge';
  END IF;

  INSERT INTO public.billboard_events
    (challenge_id, author_system, author_user_id, kind, title, body, meta, created_at)
  VALUES
    (_challenge_id, true, auth.uid(), 'rank_jump', 'Sally rockets to #2!', 'Up 3 places overnight. Morning runs paying off.', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'streak', 'Tom hits a 14-day streak', 'Longest in the group so far.', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'team_record', 'Team record day', 'Average steps 12,400 — new high!', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'milestone', 'Mary crosses 100km total', 'She''s been unstoppable this week.', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'comeback', 'Danny climbs back into top 3', 'Was in 7th last week.', '{}'::jsonb, now());
END
$$;

GRANT EXECUTE ON FUNCTION public.seed_billboard_events(uuid) TO authenticated;

-- B. Read access for rank20 membership (users can read their own group/members)
ALTER TABLE public.rank20_groups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rank20_groups' AND policyname='r20_groups_select_member') THEN
    CREATE POLICY "r20_groups_select_member" ON public.rank20_groups
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.rank20_members m WHERE m.group_id = rank20_groups.id AND m.user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rank20_members' AND policyname='r20_members_select_member') THEN
    CREATE POLICY "r20_members_select_member" ON public.rank20_members
      FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.rank20_members m2 WHERE m2.group_id = rank20_members.group_id AND m2.user_id = auth.uid())
      );
  END IF;
END$$;

-- C. Billboard tables RLS (read/insert for challenge members)
ALTER TABLE public.billboard_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billboard_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billboard_reactions ENABLE ROW LEVEL SECURITY;

-- Drop then recreate to be safe (idempotent)
DROP POLICY IF EXISTS "be_select_members"  ON public.billboard_events;
DROP POLICY IF EXISTS "be_insert_members"  ON public.billboard_events;
DROP POLICY IF EXISTS "be_update_creator"  ON public.billboard_events;

CREATE POLICY "be_select_members" ON public.billboard_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.private_challenges pc
      LEFT JOIN public.private_challenge_participations p
        ON p.private_challenge_id = pc.id AND p.user_id = auth.uid()
      WHERE pc.id = billboard_events.challenge_id
        AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
    )
  );

CREATE POLICY "be_insert_members" ON public.billboard_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.private_challenges pc
      LEFT JOIN public.private_challenge_participations p
        ON p.private_challenge_id = pc.id AND p.user_id = auth.uid()
      WHERE pc.id = billboard_events.challenge_id
        AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
    )
  );

CREATE POLICY "be_update_creator" ON public.billboard_events
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.private_challenges pc WHERE pc.id = billboard_events.challenge_id AND pc.creator_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.private_challenges pc WHERE pc.id = billboard_events.challenge_id AND pc.creator_id = auth.uid())
  );