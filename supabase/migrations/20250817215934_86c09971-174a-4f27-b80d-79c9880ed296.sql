-- Helper: same-group check without recursive policy traps
CREATE OR REPLACE FUNCTION public.same_group(u uuid, v uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rank20_members a
    JOIN public.rank20_members b ON a.group_id = b.group_id
    WHERE a.user_id = u AND b.user_id = v
  );
$$;

ALTER TABLE public.rank20_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS r20m_select_same_group ON public.rank20_members;
CREATE POLICY r20m_select_same_group
ON public.rank20_members
FOR SELECT
TO authenticated
USING ( public.same_group(auth.uid(), user_id) );