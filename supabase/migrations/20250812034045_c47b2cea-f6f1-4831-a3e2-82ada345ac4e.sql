-- Insert user as influencer
INSERT INTO public.user_roles (user_id, role)
VALUES ('8589c22a-00f5-4e42-a197-fe0dbd87a5d8', 'influencer')
ON CONFLICT (user_id, role) DO NOTHING;