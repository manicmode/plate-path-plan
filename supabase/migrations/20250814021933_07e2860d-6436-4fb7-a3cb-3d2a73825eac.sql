-- Step 2: Insert the top 3 detected users into Hydration Boost participation
-- Using the most recent 3 users from auth.users (will be populated after the read query)

-- First, let's ensure the challenge exists and get recent users
WITH recent_users AS (
  SELECT id, email, created_at, 
         ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM auth.users 
  WHERE email IS NOT NULL 
    AND email NOT ILIKE '%noreply%'
    AND email NOT ILIKE '%anon%'
)
INSERT INTO public.private_challenge_participations 
  (id, private_challenge_id, user_id, joined_at, is_creator)
SELECT 
  gen_random_uuid(),
  'bb000000-1111-2222-3333-444444444444',
  ru.id,
  now(),
  CASE WHEN ru.rn = 1 THEN true ELSE false END
FROM recent_users ru
WHERE ru.rn <= 3
ON CONFLICT DO NOTHING;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pcp_user_challenge
  ON public.private_challenge_participations (user_id, private_challenge_id);