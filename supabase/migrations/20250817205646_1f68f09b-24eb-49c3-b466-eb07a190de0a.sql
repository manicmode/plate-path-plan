-- Finalize profiles/avatars access and cleanup

-- Ensure "read self" policy exists on user_profiles
DROP POLICY IF EXISTS "user_profiles_read_self" ON public.user_profiles;
CREATE POLICY "user_profiles_read_self"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Remove the old policy on profiles to avoid confusion
DROP POLICY IF EXISTS "profiles_read_same_rank20_group" ON public.profiles;

-- Confirm avatar bucket policy matches the actual bucket in URLs
DROP POLICY IF EXISTS "public_avatars_read" ON storage.objects;
CREATE POLICY "public_avatars_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');