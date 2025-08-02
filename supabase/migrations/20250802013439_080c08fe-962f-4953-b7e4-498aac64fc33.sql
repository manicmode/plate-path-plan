-- Add caricature_urls field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN caricature_urls text[] DEFAULT '{}';

-- Create storage bucket for caricatures if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('caricatures', 'caricatures', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for caricature uploads
CREATE POLICY "Users can view caricature images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'caricatures');

CREATE POLICY "Users can upload their own caricatures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'caricatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own caricatures" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'caricatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own caricatures" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'caricatures' AND auth.uid()::text = (storage.foldername(name))[1]);