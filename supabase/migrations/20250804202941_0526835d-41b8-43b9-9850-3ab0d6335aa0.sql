-- Add current logged-in user as admin if not already present
INSERT INTO public.user_roles (user_id, role)
SELECT auth.uid(), 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role
);