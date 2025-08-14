-- 1) Create a non-rank_of_20 private challenge with all required fields
INSERT INTO public.private_challenges (
  id, 
  title, 
  description, 
  creator_id, 
  category, 
  challenge_type, 
  duration_days,
  start_date,
  max_participants,
  status,
  created_at
)
VALUES (
  'bb000000-1111-2222-3333-444444444444'::uuid,
  '30-Day Hydration Boost',
  'Drink 8+ glasses per day for 30 days.',
  '8589c22a-00f5-4e42-a197-fe0dbd87a5d8'::uuid,
  'wellness',
  'custom',
  30,
  CURRENT_DATE,
  20,
  'active',
  now()
);

-- 2) Add three known test users as participants
INSERT INTO public.private_challenge_participations (id, private_challenge_id, user_id, joined_at, is_creator)
VALUES
  (gen_random_uuid(), 'bb000000-1111-2222-3333-444444444444'::uuid, '8589c22a-00f5-4e42-a197-fe0dbd87a5d8'::uuid, now(), true),
  (gen_random_uuid(), 'bb000000-1111-2222-3333-444444444444'::uuid, 'ea6022e7-0947-4322-ab30-bfff6774b334'::uuid, now(), false),
  (gen_random_uuid(), 'bb000000-1111-2222-3333-444444444444'::uuid, 'f8458f5c-cd73-44ba-a818-6996d23e454b'::uuid, now(), false);

-- 3) Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_private_challenges_type_created_at
  ON public.private_challenges (challenge_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pcp_user_challenge
  ON public.private_challenge_participations (user_id, private_challenge_id);