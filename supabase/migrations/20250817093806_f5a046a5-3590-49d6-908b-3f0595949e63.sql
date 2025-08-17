-- Keep RLS on
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 1) Allow users to read their own profile
DROP POLICY IF EXISTS user_profiles_read_self ON public.user_profiles;
CREATE POLICY user_profiles_read_self
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2) Allow members of the SAME active arena group to read each other
DROP POLICY IF EXISTS user_profiles_read_same_arena ON public.user_profiles;
CREATE POLICY user_profiles_read_same_arena
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.arena_memberships am_self
      JOIN public.arena_memberships am_other
        ON am_self.group_id = am_other.group_id
      WHERE am_self.user_id = auth.uid()
        AND am_other.user_id = user_profiles.user_id
        AND am_self.status = 'active'
        AND am_other.status = 'active'
    )
  );

-- 3) Helpful indexes (speeds the EXISTS join)
CREATE INDEX IF NOT EXISTS idx_am_group_user ON public.arena_memberships (group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_am_user_status ON public.arena_memberships (user_id, status);

-- 4) Grant SELECT permission to authenticated role
GRANT SELECT ON public.user_profiles TO authenticated;