-- Fix the name "User f8458…" → "Ashi Mashi"
UPDATE public.user_profiles
SET first_name = 'Ashi', last_name = 'Mashi'
WHERE user_id = 'f8458f5c-cd73-44ba-a818-6996d23e454b';

-- Sanity check
SELECT user_id, first_name, last_name, avatar_url
FROM public.user_profiles
WHERE user_id IN (
  '8589c22a-00f5-4e42-a197-fe0dbd87a5d8', -- ashkan
  'ea6022e7-0947-4322-ab30-bfff6774b334', -- Deborah
  'f8458f5c-cd73-44ba-a818-6996d23e454b'  -- Ashi Mashi
);