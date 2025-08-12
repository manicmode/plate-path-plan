-- Update policy: only influencers can create public challenges
-- Adapting to existing user_roles table structure with role enum
DROP POLICY IF EXISTS challenges_insert_owner ON public.challenges;
CREATE POLICY challenges_insert_owner
  ON public.challenges
  FOR INSERT
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (
      visibility <> 'public'
      OR EXISTS (
        SELECT 1 FROM public.user_roles r
        WHERE r.user_id = auth.uid() AND r.role = 'influencer'
      )
    )
  );

-- Keep existing select policy
DROP POLICY IF EXISTS challenges_select_public_or_owner ON public.challenges;
CREATE POLICY challenges_select_public_or_owner
  ON public.challenges
  FOR SELECT
  USING (visibility = 'public' OR owner_user_id = auth.uid());

-- Keep existing update policy  
DROP POLICY IF EXISTS challenges_update_owner ON public.challenges;
CREATE POLICY challenges_update_owner
  ON public.challenges
  FOR UPDATE
  USING (owner_user_id = auth.uid());

-- Keep existing delete policy
DROP POLICY IF EXISTS challenges_delete_owner ON public.challenges;
CREATE POLICY challenges_delete_owner
  ON public.challenges
  FOR DELETE
  USING (owner_user_id = auth.uid());