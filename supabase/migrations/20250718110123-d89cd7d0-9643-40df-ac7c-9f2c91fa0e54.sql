-- Create smart friend recommendation function that scores friends by relevance
CREATE OR REPLACE FUNCTION public.get_smart_friend_recommendations(current_user_id uuid)
 RETURNS TABLE(
   friend_id uuid, 
   friend_name text, 
   friend_email text, 
   friend_phone text,
   relevance_score numeric,
   interaction_metadata jsonb
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH friend_base AS (
    -- Get all mutual friends
    SELECT 
      up.user_id as friend_id,
      COALESCE(up.first_name || ' ' || up.last_name, au.email) as friend_name,
      au.email as friend_email,
      up.phone as friend_phone,
      up.current_nutrition_streak,
      up.current_hydration_streak,
      up.current_supplement_streak
    FROM public.user_friends uf1
    JOIN public.user_friends uf2 ON uf1.friend_id = uf2.user_id AND uf1.user_id = uf2.friend_id
    JOIN public.user_profiles up ON uf1.friend_id = up.user_id
    JOIN auth.users au ON up.user_id = au.id
    WHERE uf1.user_id = current_user_id 
      AND uf1.status = 'accepted' 
      AND uf2.status = 'accepted'
  ),
  user_streaks AS (
    -- Get current user's streaks for comparison
    SELECT 
      current_nutrition_streak,
      current_hydration_streak,
      current_supplement_streak
    FROM public.user_profiles 
    WHERE user_id = current_user_id
  ),
  chat_interactions AS (
    -- Count recent chat interactions (last 30 days)
    SELECT 
      CASE 
        WHEN user_id = current_user_id THEN 
          COALESCE(tagged_users[1], '00000000-0000-0000-0000-000000000000'::uuid)
        ELSE user_id 
      END as friend_id,
      COUNT(*) as chat_count,
      MAX(created_at) as last_interaction
    FROM public.challenge_messages cm
    WHERE (user_id = current_user_id AND tagged_users IS NOT NULL AND array_length(tagged_users, 1) > 0)
       OR (current_user_id = ANY(tagged_users))
       OR user_id IN (SELECT friend_id FROM friend_base)
    AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
  ),
  follow_status AS (
    -- Check follow relationships
    SELECT 
      followed_user_id as friend_id,
      true as is_following,
      created_at as follow_date
    FROM public.user_follows 
    WHERE user_id = current_user_id
    UNION ALL
    SELECT 
      user_id as friend_id,
      true as is_followed_by,
      created_at as followed_date
    FROM public.user_follows 
    WHERE followed_user_id = current_user_id
  ),
  challenge_participation AS (
    -- Count shared challenge participation (last 60 days)
    SELECT 
      friend_id,
      COUNT(DISTINCT challenge_id) as shared_challenges
    FROM (
      SELECT DISTINCT 
        cm1.challenge_id,
        cm2.user_id as friend_id
      FROM public.challenge_messages cm1
      JOIN public.challenge_messages cm2 ON cm1.challenge_id = cm2.challenge_id
      WHERE cm1.user_id = current_user_id 
        AND cm2.user_id != current_user_id
        AND cm1.created_at >= NOW() - INTERVAL '60 days'
        AND cm2.created_at >= NOW() - INTERVAL '60 days'
    ) shared
    GROUP BY friend_id
  )
  SELECT 
    fb.friend_id,
    fb.friend_name,
    fb.friend_email,
    fb.friend_phone,
    -- Calculate relevance score (0-100)
    ROUND(
      -- Chat interaction score (0-30 points)
      LEAST(30, COALESCE(ci.chat_count, 0) * 3) +
      
      -- Follow relationship score (0-20 points)
      CASE 
        WHEN EXISTS(SELECT 1 FROM follow_status fs WHERE fs.friend_id = fb.friend_id AND fs.is_following) THEN 15
        WHEN EXISTS(SELECT 1 FROM follow_status fs WHERE fs.friend_id = fb.friend_id AND fs.is_followed_by) THEN 10
        ELSE 0
      END +
      
      -- Shared challenges score (0-25 points)
      LEAST(25, COALESCE(cp.shared_challenges, 0) * 5) +
      
      -- Streak proximity score (0-20 points)
      GREATEST(0, 20 - (
        ABS(COALESCE(fb.current_nutrition_streak, 0) - COALESCE(us.current_nutrition_streak, 0)) +
        ABS(COALESCE(fb.current_hydration_streak, 0) - COALESCE(us.current_hydration_streak, 0)) +
        ABS(COALESCE(fb.current_supplement_streak, 0) - COALESCE(us.current_supplement_streak, 0))
      ) / 3.0) +
      
      -- Recent activity bonus (0-5 points)
      CASE 
        WHEN ci.last_interaction >= NOW() - INTERVAL '7 days' THEN 5
        WHEN ci.last_interaction >= NOW() - INTERVAL '14 days' THEN 3
        WHEN ci.last_interaction >= NOW() - INTERVAL '30 days' THEN 1
        ELSE 0
      END,
      1
    ) as relevance_score,
    
    -- Metadata for UI display
    jsonb_build_object(
      'chat_count', COALESCE(ci.chat_count, 0),
      'shared_challenges', COALESCE(cp.shared_challenges, 0),
      'is_following', EXISTS(SELECT 1 FROM follow_status fs WHERE fs.friend_id = fb.friend_id AND fs.is_following),
      'is_followed_by', EXISTS(SELECT 1 FROM follow_status fs WHERE fs.friend_id = fb.friend_id AND fs.is_followed_by),
      'last_interaction', ci.last_interaction,
      'streak_similarity', CASE 
        WHEN ABS(COALESCE(fb.current_nutrition_streak, 0) - COALESCE(us.current_nutrition_streak, 0)) <= 2 THEN 'high'
        WHEN ABS(COALESCE(fb.current_nutrition_streak, 0) - COALESCE(us.current_nutrition_streak, 0)) <= 5 THEN 'medium'
        ELSE 'low'
      END,
      'activity_status', CASE 
        WHEN ci.last_interaction >= NOW() - INTERVAL '7 days' THEN 'recently_active'
        WHEN ci.last_interaction >= NOW() - INTERVAL '14 days' THEN 'active'
        WHEN ci.last_interaction >= NOW() - INTERVAL '30 days' THEN 'somewhat_active'
        ELSE 'inactive'
      END
    ) as interaction_metadata
    
  FROM friend_base fb
  CROSS JOIN user_streaks us
  LEFT JOIN chat_interactions ci ON fb.friend_id = ci.friend_id
  LEFT JOIN challenge_participation cp ON fb.friend_id = cp.friend_id
  ORDER BY relevance_score DESC, fb.friend_name ASC;
END;
$function$