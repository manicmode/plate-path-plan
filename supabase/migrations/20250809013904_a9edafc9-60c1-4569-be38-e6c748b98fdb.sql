-- Create share_cards table
CREATE TABLE IF NOT EXISTS public.share_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  template TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'og',
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  hash TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.share_cards ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY IF NOT EXISTS "Public can view public share cards"
ON public.share_cards
FOR SELECT
USING (is_public = true);

CREATE POLICY IF NOT EXISTS "Owners can view their share cards"
ON public.share_cards
FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY IF NOT EXISTS "Owners can insert share cards"
ON public.share_cards
FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY IF NOT EXISTS "Owners can update their share cards"
ON public.share_cards
FOR UPDATE
USING (auth.uid() = owner_user_id);

CREATE POLICY IF NOT EXISTS "Owners can delete their share cards"
ON public.share_cards
FOR DELETE
USING (auth.uid() = owner_user_id);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_share_cards_owner_created_at
ON public.share_cards (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_share_cards_hash
ON public.share_cards (owner_user_id, hash, size);

-- Storage bucket for generated images
INSERT INTO storage.buckets (id, name, public)
VALUES ('shares', 'shares', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'shares' bucket
DO $$ BEGIN
  -- Public read for shares bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Public can read share images'
  ) THEN
    CREATE POLICY "Public can read share images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'shares');
  END IF;

  -- Users can upload into their own folder
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can upload share images into their own folder'
  ) THEN
    CREATE POLICY "Users can upload share images into their own folder"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'shares'
      AND auth.role() = 'authenticated'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Users can update their own images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can update their own share images'
  ) THEN
    CREATE POLICY "Users can update their own share images"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'shares'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Users can delete their own images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete their own share images'
  ) THEN
    CREATE POLICY "Users can delete their own share images"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'shares'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Add shares_count to user_profiles for analytics
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS shares_count INTEGER NOT NULL DEFAULT 0;