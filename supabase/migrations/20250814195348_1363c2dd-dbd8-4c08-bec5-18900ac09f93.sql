-- Seed/repair rank_of_20 arena with profiles fix
DO $$
DECLARE
  cid uuid;
  u1 uuid := '8589c22a-00f5-4e42-a197-fe0dbd87a5d8'::uuid; -- me
  u2 uuid := gen_random_uuid();   -- test user 2
  u3 uuid := gen_random_uuid();   -- test user 3
BEGIN
  -- Reuse latest rank_of_20 challenge by me; else create one
  SELECT id INTO cid
  FROM public.private_challenges
  WHERE creator_id = u1 AND challenge_type = 'rank_of_20'
  ORDER BY created_at DESC
  LIMIT 1;

  IF cid IS NULL THEN
    INSERT INTO public.private_challenges (
      title, description, creator_id, category, challenge_type,
      duration_days, start_date, created_at
    )
    VALUES (
      'Test Rank 20', 'Dev test arena', u1, 'Arena', 'rank_of_20',
      30, CURRENT_DATE, now()
    )
    RETURNING id INTO cid;

    INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator, joined_at)
    VALUES (cid, u1, true, now()),
           (cid, u2, false, now()),
           (cid, u3, false, now());
  END IF;

  -- Ensure at least 3 participants (add u2/u3 if missing)
  IF (SELECT count(*) FROM public.private_challenge_participations WHERE private_challenge_id = cid) < 3 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.private_challenge_participations WHERE private_challenge_id = cid AND user_id = u2
    ) THEN
      INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator, joined_at)
      VALUES (cid, u2, false, now());
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.private_challenge_participations WHERE private_challenge_id = cid AND user_id = u3
    ) THEN
      INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator, joined_at)
      VALUES (cid, u3, false, now());
    END IF;
  END IF;

  -- Ensure minimal profiles for ALL participants (insert BOTH id and user_id)
  INSERT INTO public.user_profiles (id, user_id, first_name, last_name)
  SELECT pcp.user_id, pcp.user_id, 'Test', 'Member'
  FROM public.private_challenge_participations pcp
  LEFT JOIN public.user_profiles up ON up.user_id = pcp.user_id
  WHERE pcp.private_challenge_id = cid AND up.user_id IS NULL
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Ensured rank_of_20 challenge % with participants: %',
    cid, (SELECT count(*) FROM public.private_challenge_participations WHERE private_challenge_id = cid);
END $$;