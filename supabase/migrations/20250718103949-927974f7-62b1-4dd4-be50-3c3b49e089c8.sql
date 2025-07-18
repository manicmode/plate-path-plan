-- Create user_contacts table for storing hashed contact information
CREATE TABLE public.user_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_hash text NOT NULL,
  contact_name text NOT NULL,
  contact_type text NOT NULL DEFAULT 'phone', -- 'phone' or 'email'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_hash)
);

-- Enable RLS on user_contacts table
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for user_contacts table
CREATE POLICY "Users can view their own contacts"
ON public.user_contacts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts"
ON public.user_contacts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
ON public.user_contacts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
ON public.user_contacts
FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_user_contacts_user_id ON public.user_contacts(user_id);
CREATE INDEX idx_user_contacts_hash ON public.user_contacts(contact_hash);

-- Create function to find friends from contacts
CREATE OR REPLACE FUNCTION public.find_user_friends(contact_hashes text[])
RETURNS TABLE(
  user_id uuid,
  email text,
  phone text,
  contact_hash text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    au.email,
    up.phone,
    unnest(contact_hashes) as contact_hash
  FROM auth.users au
  JOIN public.user_profiles up ON au.id = up.user_id
  WHERE 
    encode(digest(COALESCE(au.email, ''), 'sha256'), 'hex') = ANY(contact_hashes)
    OR encode(digest(COALESCE(up.phone, ''), 'sha256'), 'hex') = ANY(contact_hashes);
END;
$$;

-- Add phone field to user_profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN phone text;
  END IF;
END $$;