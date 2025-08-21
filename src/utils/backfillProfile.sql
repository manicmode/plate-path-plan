-- Optional one-time backfill for creator profile
-- Replace <YOUR-USER-ID> with your actual user_id from auth.users
-- You can find your user_id by running: SELECT id, email FROM auth.users WHERE email = 'your-email@domain.com';

UPDATE public.influencer
SET display_name   = COALESCE(display_name, 'Ashkan'),
    headline       = COALESCE(headline, 'Wellness & challenges'),
    bio            = COALESCE(bio, 'Creator on Voyage focused on building healthy habits and empowering others to achieve their wellness goals through engaging challenges.'),
    category_tags  = CASE WHEN category_tags = '{}' THEN ARRAY['wellness','fitness'] ELSE category_tags END,
    is_listed      = true,
    listed_at      = now()
WHERE user_id = '<YOUR-USER-ID>';

-- Verify the update worked
SELECT id, handle, display_name, is_listed, category_tags 
FROM public.influencer 
WHERE user_id = '<YOUR-USER-ID>';

-- Test that the profile appears in the public view
SELECT id, handle, display_name, headline, category_tags 
FROM public.v_influencer_public_cards 
WHERE handle = (SELECT handle FROM public.influencer WHERE user_id = '<YOUR-USER-ID>');