-- Allow reading profiles of users in same rank-20 group
-- This enables proper name/avatar display in Arena leaderboard

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "profiles_read_same_rank20_group" ON public.profiles;

-- Create policy to read profiles of users who share a rank-20 group
CREATE POLICY "profiles_read_same_rank20_group"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rank20_members m_me
    JOIN public.rank20_members m_them
      ON m_me.group_id = m_them.group_id
    WHERE m_me.user_id = auth.uid()
      AND m_them.user_id = profiles.user_id
  )
);

-- Optional: Allow public read access to avatar storage bucket if needed
-- This ensures avatar images load properly across accounts
CREATE POLICY IF NOT EXISTS "public_avatars_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');