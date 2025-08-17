-- Restore safe read on public.profiles (same group) to prevent visibility loss

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_self" ON public.profiles;
CREATE POLICY "profiles_read_self"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_read_same_rank20_group" ON public.profiles;
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