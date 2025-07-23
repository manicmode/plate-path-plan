-- Create storage bucket for body scans
INSERT INTO storage.buckets (id, name, public) 
VALUES ('body-scans', 'body-scans', true);

-- Create body_scans table
CREATE TABLE public.body_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('front', 'side', 'back')),
  image_url TEXT NOT NULL,
  pose_score NUMERIC,
  pose_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.body_scans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own body scans"
ON public.body_scans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own body scans"
ON public.body_scans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body scans"
ON public.body_scans
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body scans"
ON public.body_scans
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage policies for body-scans bucket
CREATE POLICY "Users can view their own body scan images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'body-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own body scan images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'body-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own body scan images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'body-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own body scan images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'body-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for updated_at
CREATE TRIGGER update_body_scans_updated_at
BEFORE UPDATE ON public.body_scans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();