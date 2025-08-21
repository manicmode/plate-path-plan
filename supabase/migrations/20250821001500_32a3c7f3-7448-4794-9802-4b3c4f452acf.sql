-- ============================================
-- Influencer / Challenge core (idempotent hardening)
-- ============================================

-- Ensure tables exist (as in your patch)
CREATE TABLE IF NOT EXISTS public.influencer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL UNIQUE,
  display_name text NOT NULL,
  avatar_url text,
  banner_url text,
  tagline text,
  bio text,
  verified boolean DEFAULT false,
  niches text[] DEFAULT '{}',
  socials jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES public.influencer(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  banner_url text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  published_at timestamptz,              -- NULL = draft
  is_paid boolean DEFAULT false,
  price_cents integer,
  -- Use MAX PARTICIPANTS (immutable intent). We'll drop any old spots_left.
  max_participants integer,              -- NULL = unlimited
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_at > start_at),
  CONSTRAINT valid_price CHECK (is_paid = false OR (is_paid = true AND price_cents > 0)),
  CONSTRAINT valid_capacity CHECK (max_participants IS NULL OR max_participants > 0)
);

-- If a previous attempt created spots_left, clean it up safely.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='challenge' AND column_name='spots_left'
  ) THEN
    ALTER TABLE public.challenge DROP COLUMN spots_left;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.influencer_follow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES public.influencer(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(influencer_id, follower_id)
);

CREATE TABLE IF NOT EXISTS public.challenge_join (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenge(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- ============================================
-- updated_at triggers (idempotent)
-- ============================================
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='tr_influencer_updated_at'
  ) THEN
    CREATE TRIGGER tr_influencer_updated_at
      BEFORE UPDATE ON public.influencer
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='tr_challenge_updated_at'
  ) THEN
    CREATE TRIGGER tr_challenge_updated_at
      BEFORE UPDATE ON public.challenge
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;
END$$;

-- ============================================
-- Capacity guard (prevent over-booking)
-- ============================================
CREATE OR REPLACE FUNCTION public.challenge_join_capacity_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cap int;
DECLARE cnt int;
BEGIN
  SELECT max_participants INTO cap FROM public.challenge WHERE id = NEW.challenge_id;
  IF cap IS NULL THEN
    RETURN NEW; -- unlimited
  END IF;

  SELECT COUNT(*) INTO cnt FROM public.challenge_join WHERE challenge_id = NEW.challenge_id;
  IF cnt >= cap THEN
    RAISE EXCEPTION 'Challenge is full';
  END IF;

  RETURN NEW;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='tr_challenge_join_capacity'
  ) THEN
    CREATE TRIGGER tr_challenge_join_capacity
      BEFORE INSERT ON public.challenge_join
      FOR EACH ROW EXECUTE FUNCTION public.challenge_join_capacity_guard();
  END IF;
END$$;

-- ============================================
-- RLS enable + policies (tight scope)
-- ============================================
ALTER TABLE public.influencer       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_follow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_join   ENABLE ROW LEVEL SECURITY;

-- Drop any broad legacy policies
DROP POLICY IF EXISTS "Influencers are viewable by everyone" ON public.influencer;
DROP POLICY IF EXISTS "Published challenges are viewable by everyone" ON public.challenge;
DROP POLICY IF EXISTS "Follow relationships are viewable by everyone" ON public.influencer_follow;
DROP POLICY IF EXISTS "Challenge joins are viewable by everyone" ON public.challenge_join;

-- Influencer: readable by authenticated; owner full control
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer' AND policyname='influencer_select_auth'
  ) THEN
    CREATE POLICY influencer_select_auth ON public.influencer
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer' AND policyname='influencer_owner_all'
  ) THEN
    CREATE POLICY influencer_owner_all ON public.influencer
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- Challenge: published visible to authenticated; owner full control
DO $$
BEGIN
  IF NOT EXISTS (
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

  IF NOT EXISTS (
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

-- Follows: only follower or influencer owner may see; follower may insert/delete own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_follow' AND policyname='influencer_follow_read_scoped'
  ) THEN
    CREATE POLICY influencer_follow_read_scoped ON public.influencer_follow
      FOR SELECT TO authenticated
      USING (
        follower_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.influencer i WHERE i.id = influencer_id AND i.user_id = auth.uid())
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

-- Joins: only participant or influencer owner may see; participant can insert/delete own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge_join' AND policyname='challenge_join_read_scoped'
  ) THEN
    CREATE POLICY challenge_join_read_scoped ON public.challenge_join
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.challenge c
          JOIN public.influencer i ON i.id = c.influencer_id
          WHERE c.id = challenge_id AND i.user_id = auth.uid()
        )
      );
  END IF;

  -- Only allow joining published challenges
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge_join' AND policyname='challenge_join_modify_self'
  ) THEN
    CREATE POLICY challenge_join_modify_self ON public.challenge_join
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.challenge c WHERE c.id = challenge_id AND c.published_at IS NOT NULL)
      );
  END IF;
END$$;

-- ============================================
-- Grants (explicitly revoke PUBLIC, keep anon out)
-- ============================================
REVOKE ALL ON public.influencer, public.challenge, public.influencer_follow, public.challenge_join FROM PUBLIC, anon;
GRANT  SELECT, INSERT, UPDATE, DELETE ON public.influencer, public.challenge, public.influencer_follow, public.challenge_join TO authenticated;
GRANT  ALL PRIVILEGES ON public.influencer, public.challenge, public.influencer_follow, public.challenge_join TO service_role;

-- ============================================
-- Indexes (if missing)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_influencer_handle         ON public.influencer(handle);
CREATE INDEX IF NOT EXISTS idx_influencer_user_id        ON public.influencer(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_influencer_id   ON public.challenge(influencer_id);
CREATE INDEX IF NOT EXISTS idx_challenge_published       ON public.challenge(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenge_dates           ON public.challenge(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_follow_influencer_id      ON public.influencer_follow(influencer_id);
CREATE INDEX IF NOT EXISTS idx_follow_follower_id        ON public.influencer_follow(follower_id);
CREATE INDEX IF NOT EXISTS idx_join_challenge_id         ON public.challenge_join(challenge_id);
CREATE INDEX IF NOT EXISTS idx_join_user_id              ON public.challenge_join(user_id);