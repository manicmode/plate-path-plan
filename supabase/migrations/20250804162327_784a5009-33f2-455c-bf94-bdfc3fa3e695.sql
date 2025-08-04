-- Add brand collaboration and rewards columns to private_challenges
ALTER TABLE public.private_challenges 
ADD COLUMN brand_name TEXT,
ADD COLUMN promo_code TEXT,
ADD COLUMN product_url TEXT,
ADD COLUMN reward_description TEXT,
ADD COLUMN is_sponsored BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN reward_image_url TEXT,
ADD COLUMN views INTEGER NOT NULL DEFAULT 0,
ADD COLUMN clicks INTEGER NOT NULL DEFAULT 0;

-- Create challenge-rewards storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('challenge-rewards', 'challenge-rewards', true);

-- Storage policies for challenge-rewards bucket
CREATE POLICY "Challenge rewards are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'challenge-rewards');

CREATE POLICY "Influencers can upload challenge rewards" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'challenge-rewards' 
  AND auth.uid() IN (
    SELECT user_id FROM public.influencers WHERE is_active = true
  )
);

CREATE POLICY "Influencers can update their challenge rewards" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'challenge-rewards' 
  AND auth.uid() IN (
    SELECT user_id FROM public.influencers WHERE is_active = true
  )
);

CREATE POLICY "Influencers can delete their challenge rewards" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'challenge-rewards' 
  AND auth.uid() IN (
    SELECT user_id FROM public.influencers WHERE is_active = true
  )
);

-- Function to increment challenge views
CREATE OR REPLACE FUNCTION public.increment_challenge_views(challenge_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
BEGIN
  UPDATE public.private_challenges 
  SET views = views + 1
  WHERE id = challenge_id_param;
END;
$$;

-- Function to increment challenge clicks
CREATE OR REPLACE FUNCTION public.increment_challenge_clicks(challenge_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
BEGIN
  UPDATE public.private_challenges 
  SET clicks = clicks + 1
  WHERE id = challenge_id_param;
END;
$$;