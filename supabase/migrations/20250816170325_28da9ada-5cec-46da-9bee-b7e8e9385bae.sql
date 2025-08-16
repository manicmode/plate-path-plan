BEGIN;

-- 0) SAFETY: ensure backup tables exist
DO $$
BEGIN
  IF to_regclass('_backup_private_challenges_20250816') IS NULL THEN
    RAISE EXCEPTION 'Missing backup table: _backup_private_challenges_20250816';
  END IF;
END $$;

-- 1) Compute R20 candidate challenge IDs from backup (support name/title + type/category flags)
WITH cols AS (
  SELECT column_name FROM information_schema.columns
  WHERE table_name = '_backup_private_challenges_20250816'
),
candidates AS (
  SELECT b.id
  FROM _backup_private_challenges_20250816 b
  WHERE
    -- name/title heuristics
    COALESCE( (CASE WHEN EXISTS(SELECT 1 FROM cols WHERE column_name='name')  THEN b.name  END), '' ) ILIKE ANY (ARRAY['%rank%', '%arena%', '%20%'])
 OR COALESCE( (CASE WHEN EXISTS(SELECT 1 FROM cols WHERE column_name='title') THEN b.title END), '' ) ILIKE ANY (ARRAY['%rank%', '%arena%', '%20%'])
 OR COALESCE( (CASE WHEN EXISTS(SELECT 1 FROM cols WHERE column_name='challenge_type') THEN b.challenge_type END), '' ) ILIKE '%rank%'
 OR COALESCE( (CASE WHEN EXISTS(SELECT 1 FROM cols WHERE column_name='category')       THEN b.category       END), '' ) ILIKE '%rank%'
)

-- 2) Restore the R20 challenges themselves
, ins_challenges AS (
  INSERT INTO private_challenges
  SELECT b.*
  FROM _backup_private_challenges_20250816 b
  JOIN candidates c ON c.id = b.id
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)

-- 3) Restore memberships for those challenges (if backup exists)
, ins_members AS (
  WITH has AS (
    SELECT to_regclass('_backup_challenge_members_20250816') AS t
  )
  INSERT INTO challenge_members
  SELECT m.*
  FROM _backup_challenge_members_20250816 m
  JOIN candidates c ON c.id = m.challenge_id
  WHERE (SELECT t IS NOT NULL FROM has)
  ON CONFLICT (challenge_id, user_id) DO NOTHING
  RETURNING challenge_id
)

-- 4) Restore participations (both styles, only if the table exists)
, ins_private_part AS (
  WITH has AS (
    SELECT to_regclass('_backup_private_challenge_participations_20250816') AS t
  )
  INSERT INTO private_challenge_participations
  SELECT u.*
  FROM _backup_private_challenge_participations_20250816 u
  JOIN candidates c ON c.id = u.private_challenge_id
  WHERE (SELECT t IS NOT NULL FROM has)
  ON CONFLICT (id) DO NOTHING
  RETURNING private_challenge_id
)
, ins_user_part AS (
  WITH has AS (
    SELECT to_regclass('_backup_user_challenge_participations_20250816') AS t
  )
  INSERT INTO user_challenge_participations
  SELECT u.*
  FROM _backup_user_challenge_participations_20250816 u
  JOIN candidates c ON c.id = u.challenge_id
  WHERE (SELECT t IS NOT NULL FROM has)
  ON CONFLICT (challenge_id, user_id) DO NOTHING
  RETURNING challenge_id
)

-- 5) Summary
SELECT 'private_challenges_restored' AS what, COUNT(*) FROM ins_challenges
UNION ALL SELECT 'challenge_members_restored', COUNT(*) FROM ins_members
UNION ALL SELECT 'private_participations_restored', COUNT(*) FROM ins_private_part
UNION ALL SELECT 'user_participations_restored', COUNT(*) FROM ins_user_part;

COMMIT;