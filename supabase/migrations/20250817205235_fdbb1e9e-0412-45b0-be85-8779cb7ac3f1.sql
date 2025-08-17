-- Fix RLS policy on the correct table that Arena actually uses
-- The UI uses 'user_profiles', not 'profiles'

-- Ensure RLS is enabled on user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Add policy to read profiles of users who share a rank-20 group
DROP POLICY IF EXISTS "user_profiles_read_same_rank20_group" ON public.user_profiles;
CREATE POLICY "user_profiles_read_same_rank20_group"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rank20_members m_me
    JOIN public.rank20_members m_them
      ON m_me.group_id = m_them.group_id
    WHERE m_me.user_id = auth.uid()
      AND m_them.user_id = user_profiles.user_id
  )
);