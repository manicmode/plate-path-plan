-- Add influencer role to current user
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'influencer')
ON CONFLICT (user_id, role) 
DO NOTHING;