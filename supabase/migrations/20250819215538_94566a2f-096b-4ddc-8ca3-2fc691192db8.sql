-- Update rpc_list_active_habits to be SECURITY DEFINER to ensure reliable access to habit_template
CREATE OR REPLACE FUNCTION public.rpc_list_active_habits(p_domain habit_domain DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  description text,
  domain habit_domain,
  difficulty text,
  category text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.slug, t.name AS title, t.summary AS description, t.domain, t.difficulty, t.category
  FROM public.habit_template t
  WHERE t.is_active = true
    AND (p_domain IS NULL OR t.domain = p_domain)
  ORDER BY t.name;
$$;