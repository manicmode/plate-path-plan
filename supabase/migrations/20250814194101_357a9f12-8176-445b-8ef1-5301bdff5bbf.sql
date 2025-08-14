-- Seed test data for rank_of_20 arena
DO $$
DECLARE
  cid uuid;
  u1 uuid := '8589c22a-00f5-4e42-a197-fe0dbd87a5d8'::uuid; -- current user (ashkan)
  u2 uuid := gen_random_uuid();   -- test user 2
  u3 uuid := gen_random_uuid();   -- test user 3
BEGIN
  -- Create a rank_of_20 challenge
  INSERT INTO public.private_challenges (title, description, creator_id, category, challenge_type, created_at)
  VALUES ('Test Rank 20', 'Dev test arena', u1, 'Arena', 'rank_of_20', now())
  RETURNING id INTO cid;

  -- Enroll current user + two test users
  INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator, joined_at)
  VALUES
    (cid, u1, true,  now()),
    (cid, u2, false, now()),
    (cid, u3, false, now());

  -- Create minimal profiles for the test users
  INSERT INTO public.user_profiles (id, first_name, last_name)
  VALUES
    (u2, 'Test', 'Two'),
    (u3, 'Test', 'Three')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Created rank_of_20 challenge % with 3 participants', cid;
END $$;