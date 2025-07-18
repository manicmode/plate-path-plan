-- Create challenge_messages table for storing chat messages
CREATE TABLE public.challenge_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id text NOT NULL,
  user_id uuid NOT NULL,
  username text NOT NULL,
  text text,
  emoji text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  tagged_users uuid[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on challenge_messages table
ALTER TABLE public.challenge_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for challenge_messages table
CREATE POLICY "Users can view challenge messages"
ON public.challenge_messages
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create messages"
ON public.challenge_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
ON public.challenge_messages
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.challenge_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_challenge_messages_challenge_id ON public.challenge_messages(challenge_id);
CREATE INDEX idx_challenge_messages_user_id ON public.challenge_messages(user_id);
CREATE INDEX idx_challenge_messages_timestamp ON public.challenge_messages(timestamp DESC);

-- Create friends table for mutual friend relationships
CREATE TABLE public.user_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on user_friends table
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;

-- Create policies for user_friends table
CREATE POLICY "Users can view their own friendships"
ON public.user_friends
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests"
ON public.user_friends
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendships"
ON public.user_friends
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships"
ON public.user_friends
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Add indexes for better performance
CREATE INDEX idx_user_friends_user_id ON public.user_friends(user_id);
CREATE INDEX idx_user_friends_friend_id ON public.user_friends(friend_id);
CREATE INDEX idx_user_friends_status ON public.user_friends(status);

-- Create function to get mutual friends
CREATE OR REPLACE FUNCTION public.get_mutual_friends(current_user_id uuid)
RETURNS TABLE(
  friend_id uuid,
  friend_name text,
  friend_email text,
  friend_phone text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id as friend_id,
    COALESCE(up.first_name || ' ' || up.last_name, au.email) as friend_name,
    au.email as friend_email,
    up.phone as friend_phone
  FROM public.user_friends uf1
  JOIN public.user_friends uf2 ON uf1.friend_id = uf2.user_id AND uf1.user_id = uf2.friend_id
  JOIN public.user_profiles up ON uf1.friend_id = up.user_id
  JOIN auth.users au ON up.user_id = au.id
  WHERE uf1.user_id = current_user_id 
    AND uf1.status = 'accepted' 
    AND uf2.status = 'accepted';
END;
$$;

-- Add first_name and last_name to user_profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN first_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN last_name text;
  END IF;
END $$;

-- Create function to add friend based on contact sync
CREATE OR REPLACE FUNCTION public.add_friend_from_contact(contact_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Check if friendship already exists
  IF EXISTS (
    SELECT 1 FROM public.user_friends 
    WHERE (user_id = current_user_id AND friend_id = contact_user_id)
       OR (user_id = contact_user_id AND friend_id = current_user_id)
  ) THEN
    RETURN false;
  END IF;
  
  -- Create bidirectional friendship
  INSERT INTO public.user_friends (user_id, friend_id, status)
  VALUES 
    (current_user_id, contact_user_id, 'accepted'),
    (contact_user_id, current_user_id, 'accepted');
    
  RETURN true;
END;
$$;