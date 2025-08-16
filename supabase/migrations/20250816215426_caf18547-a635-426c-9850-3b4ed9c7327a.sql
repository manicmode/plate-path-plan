-- 3A) Ensure ONE active Arena challenge exists (idempotent by slug)
DO $$
DECLARE v_id uuid;
BEGIN
  -- archive any actives (index already prevents >1 active, this is just hygiene)
  UPDATE public.arena_challenges SET status='archived' WHERE status='active';

  -- insert or activate our canonical season
  INSERT INTO public.arena_challenges (slug, title, status, season_year, season_month, starts_at, metadata)
  VALUES ('rank20-season', 'Arena — Rank of 20', 'active',
          EXTRACT(YEAR FROM now())::int,
          EXTRACT(MONTH FROM now())::int,
          now(),
          jsonb_build_object('kind','rank20'))
  ON CONFLICT (slug) DO UPDATE
    SET status='active',
        season_year = EXCLUDED.season_year,
        season_month = EXCLUDED.season_month,
        starts_at = COALESCE(public.arena_challenges.starts_at, EXCLUDED.starts_at),
        metadata = EXCLUDED.metadata;
END $$;

-- fetch active id
WITH x AS (
  SELECT id FROM public.arena_challenges WHERE slug='rank20-season' AND status='active' LIMIT 1
)
SELECT 'active_challenge_id' AS what, id FROM x;

-- 3B) Migrate memberships from legacy tables if present (rank20_members OR private_challenge_participations)
DO $$
DECLARE
  v_cid uuid := (SELECT id FROM public.arena_challenges WHERE slug='rank20-season' AND status='active' LIMIT 1);
  has_r20 boolean := to_regclass('public.rank20_members') IS NOT NULL;
  has_pcp boolean := to_regclass('public.private_challenge_participations') IS NOT NULL;
  legacy_count int := 0;
BEGIN
  IF v_cid IS NULL THEN
    RAISE NOTICE 'No active arena_challenges row; skipping migration.';
    RETURN;
  END IF;

  IF has_r20 THEN
    INSERT INTO public.arena_memberships (challenge_id, user_id, status)
    SELECT v_cid, r.user_id, 'active'
    FROM public.rank20_members r
    ON CONFLICT (challenge_id, user_id) DO NOTHING;
    GET DIAGNOSTICS legacy_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % rows from rank20_members', legacy_count;
  END IF;

  IF has_pcp THEN
    -- If you previously restored an old "Arena — Rank of 20" private challenge, carry those users too.
    INSERT INTO public.arena_memberships (challenge_id, user_id, status)
    SELECT v_cid, pcp.user_id, 'active'
    FROM public.private_challenge_participations pcp
    JOIN public.private_challenges pc ON pc.id = pcp.private_challenge_id
    WHERE (pc.title ILIKE '%rank%' OR pc.category ILIKE '%arena%')
    ON CONFLICT (challenge_id, user_id) DO NOTHING;
    GET DIAGNOSTICS legacy_count = ROW_COUNT;
    RAISE NOTICE 'Migrated +% rows from private_challenge_participations', legacy_count;
  END IF;
END $$;

-- 3C) (Optional) Seed tiny leaderboard rollup so UI has something to render
DO $$
DECLARE
  v_cid uuid := (SELECT id FROM public.arena_challenges WHERE slug='rank20-season' AND status='active' LIMIT 1);
  y int := EXTRACT(YEAR FROM now())::int;
  m int := EXTRACT(MONTH FROM now())::int;
BEGIN
  IF v_cid IS NULL THEN
    RAISE NOTICE 'No active arena_challenges row; skipping rollup seed.';
    RETURN;
  END IF;

  -- Take first 20 members by joined_at and give them ranks 1..20 with score 0
  INSERT INTO public.arena_leaderboard_rollups (challenge_id, section, year, month, rank, user_id, score)
  SELECT v_cid, 'global', y, m, ROW_NUMBER() OVER (ORDER BY mship.joined_at ASC) AS rank, mship.user_id, 0::numeric
  FROM public.arena_memberships mship
  WHERE mship.challenge_id = v_cid
  ORDER BY mship.joined_at ASC
  LIMIT 20
  ON CONFLICT DO NOTHING;
END $$;

-- 3D) Verification snapshots
SELECT 'arena_challenges_active' AS what, COUNT(*)::int AS count
FROM public.arena_challenges WHERE status='active'
UNION ALL
SELECT 'arena_memberships_total', COUNT(*) FROM public.arena_memberships m
JOIN public.arena_challenges c ON c.id=m.challenge_id AND c.slug='rank20-season'
UNION ALL
SELECT 'arena_rollups_rows', COUNT(*) FROM public.arena_leaderboard_rollups r
JOIN public.arena_challenges c ON c.id=r.challenge_id AND c.slug='rank20-season';

-- 3E) Rollback helpers (keep for later if needed)
-- -- DELETE FROM public.arena_leaderboard_rollups WHERE challenge_id = (SELECT id FROM public.arena_challenges WHERE slug='rank20-season');
-- -- DELETE FROM public.arena_memberships          WHERE challenge_id = (SELECT id FROM public.arena_challenges WHERE slug='rank20-season');
-- -- UPDATE public.arena_challenges SET status='archived' WHERE slug='rank20-season';