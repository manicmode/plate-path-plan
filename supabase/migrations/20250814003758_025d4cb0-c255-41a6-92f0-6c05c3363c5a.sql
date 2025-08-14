-- Add missing RLS policy for rank20_members to allow insertion
DROP POLICY IF EXISTS r20_members_insert_self ON public.rank20_members;
CREATE POLICY r20_members_insert_self
ON public.rank20_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Update existing select policy to be more permissive
DROP POLICY IF EXISTS r20_members_select_member ON public.rank20_members;
CREATE POLICY r20_members_select_member
ON public.rank20_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.rank20_members m2 
    WHERE m2.group_id = rank20_members.group_id 
    AND m2.user_id = auth.uid()
  )
);