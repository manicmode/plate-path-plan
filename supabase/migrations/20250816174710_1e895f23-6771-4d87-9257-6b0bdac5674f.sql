-- 4) Minimal, idempotent insert into rank20_members (guarded for schema)
DO $$
DECLARE
  has_group_id boolean := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='rank20_members' AND column_name='group_id'
  );
  has_created_at boolean := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='rank20_members' AND column_name='created_at'
  );
  gid uuid;
  uid uuid;
BEGIN
  -- choose target group
  SELECT g.id INTO gid
  FROM rank20_groups g
  ORDER BY g.created_at ASC NULLS LAST, g.id
  LIMIT 1;

  IF gid IS NULL THEN
    RAISE NOTICE 'No rank20_groups found; skipping.';
    RETURN;
  END IF;

  -- choose the seeded user (most recent participation on active R20)
  WITH active AS (
    SELECT id AS cid FROM private_challenges
    WHERE COALESCE(title,'') ILIKE ANY (ARRAY['%rank%','%arena%','%20%'])
      AND status='active'
    ORDER BY start_date DESC NULLS LAST, created_at DESC
    LIMIT 1
  )
  SELECT pcp.user_id INTO uid
  FROM private_challenge_participations pcp JOIN active a ON pcp.private_challenge_id=a.cid
  ORDER BY pcp.joined_at DESC NULLS LAST
  LIMIT 1;

  IF uid IS NULL THEN
    RAISE NOTICE 'No participation user found; skipping rank20_members seed.';
    RETURN;
  END IF;

  -- insert only if missing
  IF NOT EXISTS (
    SELECT 1 FROM rank20_members r
    WHERE ((has_group_id AND r.group_id = gid) OR (NOT has_group_id))
      AND r.user_id = uid
  ) THEN
    IF has_group_id AND has_created_at THEN
      INSERT INTO rank20_members (user_id, group_id, created_at)
      VALUES (uid, gid, NOW());
    ELSIF has_group_id THEN
      INSERT INTO rank20_members (user_id, group_id)
      VALUES (uid, gid);
    ELSE
      INSERT INTO rank20_members (user_id) VALUES (uid);
    END IF;
    RAISE NOTICE 'Inserted rank20_members row for user %', uid;
  ELSE
    RAISE NOTICE 'rank20_members row already exists for user %', uid;
  END IF;
END
$$ LANGUAGE plpgsql;