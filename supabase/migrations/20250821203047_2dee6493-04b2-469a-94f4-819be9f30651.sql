-- Create a test admin user (idempotent)
-- Replace with your login email
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email ILIKE 'ashkan_e20000@yahoo.com'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with that email';
  END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END$$;

-- Quick check:
SELECT user_id, role, created_at FROM public.user_roles
WHERE role='admin' ORDER BY created_at DESC LIMIT 5;