-- Fix remaining database functions with explicit search_path
ALTER FUNCTION public.accept_challenge_invitation(uuid) SET search_path = 'public', 'pg_catalog';
ALTER FUNCTION public.calculate_private_challenge_progress(uuid) SET search_path = 'public', 'pg_catalog';