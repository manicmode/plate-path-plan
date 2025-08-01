-- Add avatar_url field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN avatar_url TEXT;

-- Add caricature generation tracking
ALTER TABLE public.user_profiles 
ADD COLUMN caricature_generation_count INTEGER DEFAULT 0;

-- Create trigger to update updated_at when avatar changes
CREATE OR REPLACE FUNCTION update_avatar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_avatar_timestamp_trigger
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_avatar_timestamp();