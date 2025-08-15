-- 1) Drop the self-referential policy that causes recursion
DROP POLICY IF EXISTS "r20_members_select_member" ON public.rank20_members;

-- 2) Helper function that checks membership without triggering recursion
-- IMPORTANT: must be SECURITY DEFINER and owned by the table owner (usually postgres)
CREATE OR REPLACE FUNCTION public.is_member_of_rank20_group(
  group_id_param uuid,
  uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rank20_members m
    WHERE m.group_id = group_id_param
      AND m.user_id = uid
  );
$$;

-- Allow app roles to call it
GRANT EXECUTE ON FUNCTION public.is_member_of_rank20_group(uuid, uuid) TO authenticated, service_role;

-- 3) Safe SELECT policy that uses the helper (no recursion)
CREATE POLICY "r20_members_select_safe"
ON public.rank20_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_member_of_rank20_group(rank20_members.group_id, auth.uid())
);