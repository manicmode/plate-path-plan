-- 1) BACKUP (only if table exists). Creates per-table backups with today's stamp.
DO $$
DECLARE tbl text;
DECLARE bkp text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'private_challenges',
    'public_challenges',
    'private_challenge_participations',
    'public_challenge_participations',
    'user_challenge_participations',
    'challenge_members',
    'private_challenge_messages',
    'public_challenge_messages'
  ]
  LOOP
    IF to_regclass('public.'||tbl) IS NOT NULL THEN
      bkp := '_backup_' || tbl || '_20250816';
      EXECUTE format('CREATE TABLE IF NOT EXISTS %I AS TABLE %I WITH NO DATA;', bkp, tbl);
      EXECUTE format('INSERT INTO %I SELECT * FROM %I;', bkp, tbl);
    END IF;
  END LOOP;
END $$;

-- 2) CLEANUP (delete children first; never touch billboard_* or arena tables)
BEGIN;

-- If these tables don't exist, the statements are skipped via DO blocks above.
-- Use conditional deletes to avoid FK explosions.
DO $$ BEGIN IF to_regclass('public.public_challenge_participations') IS NOT NULL THEN
  EXECUTE 'DELETE FROM public_challenge_participations';
END IF; END $$;

DO $$ BEGIN IF to_regclass('public.private_challenge_participations') IS NOT NULL THEN
  EXECUTE 'DELETE FROM private_challenge_participations';
END IF; END $$;

DO $$ BEGIN IF to_regclass('public.user_challenge_participations') IS NOT NULL THEN
  EXECUTE 'DELETE FROM user_challenge_participations';
END IF; END $$;

DO $$ BEGIN IF to_regclass('public.challenge_members') IS NOT NULL THEN
  EXECUTE 'DELETE FROM challenge_members';
END IF; END $$;

DO $$ BEGIN IF to_regclass('public.private_challenge_messages') IS NOT NULL THEN
  EXECUTE 'DELETE FROM private_challenge_messages';
END IF; END $$;

DO $$ BEGIN IF to_regclass('public.public_challenge_messages') IS NOT NULL THEN
  EXECUTE 'DELETE FROM public_challenge_messages';
END IF; END $$;

DO $$ BEGIN IF to_regclass('public.private_challenges') IS NOT NULL THEN
  EXECUTE 'DELETE FROM private_challenges';
END IF; END $$;

DO $$ BEGIN IF to_regclass('public.public_challenges') IS NOT NULL THEN
  EXECUTE 'DELETE FROM public_challenges';
END IF; END $$;

COMMIT;

-- 3) VERIFY (row counts after cleanup)
-- (Lovable: run and paste results)
SELECT 'private_challenges' AS table, COUNT(*) FROM public.private_challenges
UNION ALL SELECT 'public_challenges', COUNT(*) FROM public.public_challenges
UNION ALL SELECT 'private_challenge_participations', COUNT(*) FROM public.private_challenge_participations
UNION ALL SELECT 'public_challenge_participations', COUNT(*) FROM public.public_challenge_participations;