-- Enable RLS if not already
ALTER TABLE public.rank20_groups ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own group's row (needed by policies/queries that touch groups)
DROP POLICY IF EXISTS r20_groups_select_mine ON public.rank20_groups;
CREATE POLICY r20_groups_select_mine
ON public.rank20_groups FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.rank20_members me
    WHERE me.user_id = auth.uid()
      AND me.group_id = rank20_groups.id
  )
);