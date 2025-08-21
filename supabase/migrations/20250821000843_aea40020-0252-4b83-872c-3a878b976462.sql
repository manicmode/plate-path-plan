-- Align table names and harden RLS without breaking existing data.
-- Idempotent: only acts on what exists.

DO $$
BEGIN
  -- 1) Rename plural to singular if needed (FKs update automatically).
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='influencers')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='influencer') THEN
    ALTER TABLE public.influencers RENAME TO influencer;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='challenges')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='challenge') THEN
    ALTER TABLE public.challenges RENAME TO challenge;
  END IF;
END$$;

-- 2) Ensure RLS is enabled (tables may already exist).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='influencer') THEN
    EXECUTE 'ALTER TABLE public.influencer ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='challenge') THEN
    EXECUTE 'ALTER TABLE public.challenge ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='influencer_follow') THEN
    EXECUTE 'ALTER TABLE public.influencer_follow ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='challenge_join') THEN
    EXECUTE 'ALTER TABLE public.challenge_join ENABLE ROW LEVEL SECURITY';
  END IF;
END$$;

-- 3) Drop overly broad read policies (if present) and replace with scoped ones.

-- influencers: readable to authenticated (not anon); owners can write.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='influencers' AND policyname='Influencers are viewable by everyone'
  ) THEN
    DROP POLICY "Influencers are viewable by everyone" ON public.influencers;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='influencer' AND policyname='Influencers are viewable by everyone'
  ) THEN
    DROP POLICY "Influencers are viewable by everyone" ON public.influencer;
  END IF;

  -- SELECT to authenticated only
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='influencer')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer' AND policyname='influencer_select_auth'
     ) THEN
    CREATE POLICY influencer_select_auth ON public.influencer
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- Upsert owner write policies if missing (idempotent)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='influencer')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer' AND policyname='influencer_owner_all'
     ) THEN
    CREATE POLICY influencer_owner_all ON public.influencer
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- challenges: published readable to authenticated; owner full control.
DO $$
BEGIN
  -- Drop broad policy if it exists on either table name
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenges' AND policyname='Published challenges are viewable by everyone')
  THEN DROP POLICY "Published challenges are viewable by everyone" ON public.challenges; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge' AND policyname='Published challenges are viewable by everyone')
  THEN DROP POLICY "Published challenges are viewable by everyone" ON public.challenge; END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='challenge')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge' AND policyname='challenge_select_auth'
     ) THEN
    CREATE POLICY challenge_select_auth ON public.challenge
      FOR SELECT TO authenticated
      USING (
        published_at IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.influencer i
          WHERE i.id = challenge.influencer_id AND i.user_id = auth.uid()
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='challenge')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge' AND policyname='challenge_owner_all'
     ) THEN
    CREATE POLICY challenge_owner_all ON public.challenge
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.influencer i WHERE i.id = challenge.influencer_id AND i.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.influencer i WHERE i.id = challenge.influencer_id AND i.user_id = auth.uid()
      ));
  END IF;
END$$;

-- influencer_follow: scope reads to follower OR influencer owner (no global browsing of relationship graph).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_follow' AND policyname='Follow relationships are viewable by everyone')
  THEN DROP POLICY "Follow relationships are viewable by everyone" ON public.influencer_follow; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_follow' AND policyname='influencer_follow_read_scoped'
  ) THEN
    CREATE POLICY influencer_follow_read_scoped ON public.influencer_follow
      FOR SELECT TO authenticated
      USING (
        follower_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.influencer i
          WHERE i.id = influencer_id AND i.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_follow' AND policyname='influencer_follow_modify_self'
  ) THEN
    CREATE POLICY influencer_follow_modify_self ON public.influencer_follow
      FOR ALL TO authenticated
      USING (follower_id = auth.uid())
      WITH CHECK (follower_id = auth.uid());
  END IF;
END$$;

-- challenge_join: scope reads to participant OR influencer owner.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge_join' AND policyname='Challenge joins are viewable by everyone')
  THEN DROP POLICY "Challenge joins are viewable by everyone" ON public.challenge_join; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge_join' AND policyname='challenge_join_read_scoped'
  ) THEN
    CREATE POLICY challenge_join_read_scoped ON public.challenge_join
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.challenge c
          JOIN public.influencer i ON i.id = c.influencer_id
          WHERE c.id = challenge_id AND i.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge_join' AND policyname='challenge_join_modify_self'
  ) THEN
    CREATE POLICY challenge_join_modify_self ON public.challenge_join
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- 4) Grants: reinforce least-privilege (no anon).
REVOKE ALL ON public.influencer, public.challenge, public.influencer_follow, public.challenge_join FROM anon;
GRANT  SELECT, INSERT, UPDATE, DELETE ON public.influencer, public.challenge, public.influencer_follow, public.challenge_join TO authenticated;
GRANT  ALL PRIVILEGES ON public.influencer, public.challenge, public.influencer_follow, public.challenge_join TO service_role;

-- 5) (Important) Do NOT insert sample rows that reference auth.users unless those users exist.
--    Use seed scripts in dev only, and fetch actual auth.user IDs before insert.