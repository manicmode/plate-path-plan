-- STEP 1A: Tables (additive, idempotent)
-- We keep everything in public schema but prefixed with arena_*

-- 0) Extensions we rely on
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Core challenge (one active at a time, but enforce in app/RPC)
CREATE TABLE IF NOT EXISTS public.arena_challenges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE,
  title        text NOT NULL,
  status       text NOT NULL CHECK (status IN ('draft','active','archived')) DEFAULT 'draft',
  season_year  int,
  season_month int,
  starts_at    timestamptz NOT NULL DEFAULT now(),
  ends_at      timestamptz,
  created_by   uuid,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arena_challenges_status       ON public.arena_challenges(status);
CREATE INDEX IF NOT EXISTS idx_arena_challenges_season       ON public.arena_challenges(season_year, season_month);
CREATE INDEX IF NOT EXISTS idx_arena_challenges_starts_at    ON public.arena_challenges(starts_at DESC);

-- 2) Optional grouping (e.g., Rank of 20 cohorts)
CREATE TABLE IF NOT EXISTS public.arena_groups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.arena_challenges(id) ON DELETE CASCADE,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arena_groups_challenge ON public.arena_groups(challenge_id);

-- 3) Memberships (single row per user per challenge)
CREATE TABLE IF NOT EXISTS public.arena_memberships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.arena_challenges(id) ON DELETE CASCADE,
  group_id     uuid REFERENCES public.arena_groups(id) ON DELETE SET NULL,
  user_id      uuid NOT NULL,
  status       text NOT NULL CHECK (status IN ('active','left','banned')) DEFAULT 'active',
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_arena_memberships_user       ON public.arena_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_memberships_challenge  ON public.arena_memberships(challenge_id);

-- 4) Leaderboard rollups (reads are cheap, writes via jobs)
CREATE TABLE IF NOT EXISTS public.arena_leaderboard_rollups (
  challenge_id uuid NOT NULL REFERENCES public.arena_challenges(id) ON DELETE CASCADE,
  section      text NOT NULL DEFAULT 'global',               -- e.g., 'global','friends','local'
  year         int  NOT NULL,
  month        int  NOT NULL,
  rank         int  NOT NULL,
  user_id      uuid NOT NULL,
  score        numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (challenge_id, section, year, month, rank)
);

CREATE INDEX IF NOT EXISTS idx_arena_rollups_user ON public.arena_leaderboard_rollups(user_id);

-- STEP 1B: RLS (simple, non-recursive)
ALTER TABLE public.arena_challenges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_groups                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_memberships           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_leaderboard_rollups   ENABLE ROW LEVEL SECURITY;

-- Challenges: any authenticated user can read active challenges
DROP POLICY IF EXISTS p_arena_challenges_select ON public.arena_challenges;
CREATE POLICY p_arena_challenges_select
  ON public.arena_challenges
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Groups: readable to authenticated for the active challenge(s)
DROP POLICY IF EXISTS p_arena_groups_select ON public.arena_groups;
CREATE POLICY p_arena_groups_select
  ON public.arena_groups
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.arena_challenges c
    WHERE c.id = arena_groups.challenge_id AND c.status = 'active'
  ));

-- Memberships: user can read own membership rows (UI may call RPCs for broader reads)
DROP POLICY IF EXISTS p_arena_memberships_select_self ON public.arena_memberships;
CREATE POLICY p_arena_memberships_select_self
  ON public.arena_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Rollups: everyone authenticated can read (data is de-identified by leaderboard UI anyway)
DROP POLICY IF EXISTS p_arena_rollups_select ON public.arena_leaderboard_rollups;
CREATE POLICY p_arena_rollups_select
  ON public.arena_leaderboard_rollups
  FOR SELECT
  TO authenticated
  USING (true);

-- No direct INSERT/UPDATE/DELETE for clients; writes go through SECURITY DEFINER RPCs.

-- STEP 1C: Verification (non-destructive reads)
-- Expect 4 rows returned (one per table with a 'OK' label)
SELECT 'arena_challenges'            AS table, 'OK' AS status, to_regclass('public.arena_challenges') IS NOT NULL AS exists
UNION ALL SELECT 'arena_groups','OK',               to_regclass('public.arena_groups') IS NOT NULL
UNION ALL SELECT 'arena_memberships','OK',          to_regclass('public.arena_memberships') IS NOT NULL
UNION ALL SELECT 'arena_leaderboard_rollups','OK',  to_regclass('public.arena_leaderboard_rollups') IS NOT NULL;