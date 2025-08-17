-- Function to get mutual friends count for multiple users
CREATE OR REPLACE FUNCTION public.get_mutual_counts(target_ids uuid[])
RETURNS TABLE(target_id uuid, mutuals integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_friends AS (
    -- Get all friends of current user
    SELECT 
      CASE 
        WHEN uf.user_id = current_user_id THEN uf.friend_id
        ELSE uf.user_id
      END as friend_id
    FROM public.user_friends uf
    WHERE (uf.user_id = current_user_id OR uf.friend_id = current_user_id)
      AND uf.status = 'accepted'
  ),
  target_friends AS (
    -- Get friends for each target user
    SELECT 
      unnest(target_ids) as target_user_id,
      CASE 
        WHEN uf.user_id = ANY(target_ids) THEN uf.friend_id
        ELSE uf.user_id
      END as friend_id
    FROM public.user_friends uf
    WHERE (uf.user_id = ANY(target_ids) OR uf.friend_id = ANY(target_ids))
      AND uf.status = 'accepted'
      AND NOT (uf.user_id = current_user_id AND uf.friend_id = ANY(target_ids))
      AND NOT (uf.friend_id = current_user_id AND uf.user_id = ANY(target_ids))
  )
  SELECT 
    t.target_user_id as target_id,
    COUNT(tf.friend_id)::integer as mutuals
  FROM (SELECT unnest(target_ids) as target_user_id) t
  LEFT JOIN target_friends tf ON tf.target_user_id = t.target_user_id
  LEFT JOIN user_friends uf ON uf.friend_id = tf.friend_id
  WHERE t.target_user_id != current_user_id
  GROUP BY t.target_user_id;
END;
$$;