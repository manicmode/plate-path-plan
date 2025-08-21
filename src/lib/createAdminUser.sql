-- Run this SQL in Supabase SQL Editor after authenticating with your admin email
-- 🔁 Replace 'your-email@example.com' with your actual login email

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email ILIKE 'your-email@example.com'  -- ← Change this to your email
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with that email. Please login first, then run this script.';
  END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Admin role granted to user: %', v_user_id;
END$$;

-- Quick verification:
SELECT u.email, ur.role, ur.created_at 
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin' 
ORDER BY ur.created_at DESC 
LIMIT 5;