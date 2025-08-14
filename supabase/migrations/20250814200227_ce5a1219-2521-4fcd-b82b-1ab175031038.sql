-- Seed rank_of_20 arena using existing users and fix user_profiles upsert
DO $$
DECLARE
  cid uuid;
  u1 uuid := '8589c22a-00f5-4e42-a197-fe0dbd87a5d8'::uuid; -- me
  u2 uuid;
  u3 uuid;
BEGIN
  -- Pick two most recent other users
  SELECT id INTO u2
  FROM auth.users
  WHERE id <> u1
  ORDER BY created_at DESC
  LIMIT 1 OFFSET 0;

  SELECT id INTO u3
  FROM auth.users
  WHERE id <> u1
  ORDER BY created_at DESC
  LIMIT 1 OFFSET 1;

  IF u2 IS NULL OR u3 IS NULL THEN
    RAISE EXCEPTION 'Need at least 3 existing users in auth.users (found: %). Create 2 test accounts, then re-run.',
      (SELECT count(*) FROM auth.users);
  END IF;

  -- Ensure profiles (single ON CONFLICT on user_id)
  INSERT INTO public.user_profiles (id, user_id, first_name, last_name)
  VALUES (u1, u1, 'Ashkan', 'YOU')
  ON CONFLICT (user_id) DO UPDATE
    SET first_name = COALESCE(public.user_profiles.first_name, EXCLUDED.first_name),
        last_name  = COALESCE(public.user_profiles.last_name,  EXCLUDED.last_name);

  INSERT INTO public.user_profiles (id, user_id, first_name, last_name)
  VALUES (u2, u2, 'Test', 'Two')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_profiles (id, user_id, first_name, last_name)
  VALUES (u3, u3, 'Test', 'Three')
  ON CONFLICT (user_id) DO NOTHING;

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
  END IF;

  -- Enroll all three (skip if already enrolled)
  IF NOT EXISTS (
    SELECT 1 FROM public.private_challenge_participations
    WHERE private_challenge_id = cid AND user_id = u1
  ) THEN
    INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator, joined_at)
    VALUES (cid, u1, true, now());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.private_challenge_participations
    WHERE private_challenge_id = cid AND user_id = u2
  ) THEN
    INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator, joined_at)
    VALUES (cid, u2, false, now());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.private_challenge_participations
    WHERE private_challenge_id = cid AND user_id = u3
  ) THEN
    INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator, joined_at)
    VALUES (cid, u3, false, now());
  END IF;

  RAISE NOTICE 'Rank_of_20 challenge % now has % participants.',
    cid, (SELECT count(*) FROM public.private_challenge_participations WHERE private_challenge_id = cid);
END $$;