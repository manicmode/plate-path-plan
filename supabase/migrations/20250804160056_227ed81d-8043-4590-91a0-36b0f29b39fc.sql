-- Create storage buckets for influencer content
INSERT INTO storage.buckets (id, name, public) VALUES ('challenge-banners', 'challenge-banners', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('influencer-profiles', 'influencer-profiles', true);

-- Create policies for challenge banner uploads
CREATE POLICY "Anyone can view challenge banners" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'challenge-banners');

CREATE POLICY "Influencers can upload challenge banners" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'challenge-banners' AND (has_role(auth.uid(), 'influencer'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Influencers can update their challenge banners" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'challenge-banners' AND (has_role(auth.uid(), 'influencer'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Influencers can delete their challenge banners" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'challenge-banners' AND (has_role(auth.uid(), 'influencer'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- Create policies for profile image uploads
CREATE POLICY "Anyone can view profile images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'influencer-profiles');

CREATE POLICY "Influencers can upload profile images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'influencer-profiles' AND (has_role(auth.uid(), 'influencer'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Influencers can update their profile images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'influencer-profiles' AND (has_role(auth.uid(), 'influencer'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- Add banner_image_url field to private_challenges if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_challenges' AND column_name = 'banner_image_url') THEN
        ALTER TABLE private_challenges ADD COLUMN banner_image_url TEXT;
    END IF;
END $$;

-- Add username field to influencers table for public profiles
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS welcome_message TEXT;