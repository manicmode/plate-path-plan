BEGIN;

DO $$
DECLARE
  -- detect the active Rank-of-20 challenge
  cid uuid;

  -- detect which profiles table exists
  prof_tbl text;

  -- which pcp columns exist (to build a safe INSERT)
  has_status       boolean;
  has_created_at   boolean;
  has_joined_at    boolean;

  cols text := 'id, private_challenge_id, user_id';
  sel  text := 'gen_random_uuid(), $1, p.user_id';
  sql  text;
BEGIN
  -- 1) find the single active Rank-of-20 challenge id (use only title column)
  SELECT id INTO cid
  FROM private_challenges
  WHERE COALESCE(title,'') ILIKE ANY (ARRAY['%rank%','%arena%','%20%'])
    AND status = 'active'
  ORDER BY start_at DESC NULLS LAST, start_date DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF cid IS NULL THEN
    RAISE NOTICE 'No active Rank-of-20 challenge; skipping seed.';
    RETURN;
  END IF;

  -- 2) pick profiles table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_profiles') THEN
    prof_tbl := 'user_profiles';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='profiles') THEN
    prof_tbl := 'profiles';
  ELSE
    RAISE NOTICE 'No profiles table found (profiles/user_profiles). Skipping.';
    RETURN;
  END IF;

  -- 3) inspect private_challenge_participations columns
  has_status     := EXISTS (SELECT 1 FROM information_schema.columns
                            WHERE table_name='private_challenge_participations' AND column_name='status');
  has_created_at := EXISTS (SELECT 1 FROM information_schema.columns
                            WHERE table_name='private_challenge_participations' AND column_name='created_at');
  has_joined_at  := EXISTS (SELECT 1 FROM information_schema.columns
                            WHERE table_name='private_challenge_participations' AND column_name='joined_at');

  IF has_status THEN
    cols := cols || ', status';
    sel  := sel  || ", 'active'";
  END IF;
  IF has_created_at THEN
    cols := cols || ', created_at';
    sel  := sel  || ', NOW()';
  END IF;
  IF has_joined_at THEN
    cols := cols || ', joined_at';
    sel  := sel  || ', NOW()';
  END IF;

  -- 4) build and run a minimal, idempotent insert for the most recent profile
  sql := format($f$
    INSERT INTO private_challenge_participations (%s)
    SELECT %s
    FROM %I p
    LEFT JOIN private_challenge_participations x
      ON x.private_challenge_id = $1 AND x.user_id = p.user_id
    WHERE x.id IS NULL
    ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
    LIMIT 1
  $f$, cols, sel, prof_tbl);

  EXECUTE sql USING cid;

  RAISE NOTICE 'Seed attempt done for challenge %', cid;
END
$$ LANGUAGE plpgsql;

-- summary after seed
WITH active AS (
  SELECT id AS cid
  FROM private_challenges
  WHERE COALESCE(title,'') ILIKE ANY (ARRAY['%rank%','%arena%','%20%'])
    AND status='active'
  ORDER BY start_at DESC NULLS LAST, start_date DESC NULLS LAST, created_at DESC
  LIMIT 1
)
SELECT 'pcp_after' AS src, COUNT(*) AS rows
FROM private_challenge_participations pcp JOIN active a ON pcp.private_challenge_id=a.cid;

COMMIT;