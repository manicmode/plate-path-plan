-- Drop legacy policies causing infinite recursion
DROP POLICY IF EXISTS r20_members_select_mine ON public.rank20_members;
DROP POLICY IF EXISTS r20_members_select_safe ON public.rank20_members;