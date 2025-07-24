-- Fix the final batch of database functions with mutable search paths

CREATE OR REPLACE FUNCTION public.trigger_yearly_scores_preview_update()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  response jsonb;
BEGIN
  SELECT net.http_post(
    url := 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/update-yearly-scores-preview',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
    body := '{"manual_trigger": true, "timestamp": "' || now()::text || '"}'::jsonb
  ) INTO response;
  
  RETURN response;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_challenge_progress(participation_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  participation_record RECORD;
  total_days INTEGER;
  completed_days INTEGER;
  current_streak INTEGER := 0;
  best_streak INTEGER := 0;
  temp_streak INTEGER := 0;
  daily_data JSONB;
  completion_pct NUMERIC;
BEGIN
  -- Get participation details
  SELECT * INTO participation_record 
  FROM public.user_challenge_participations 
  WHERE id = participation_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate total days and completed days
  total_days := participation_record.end_date - participation_record.start_date + 1;
  daily_data := participation_record.daily_completions;
  
  -- Count completed days and calculate streaks
  completed_days := 0;
  FOR i IN 0..(total_days-1) LOOP
    IF (daily_data->((participation_record.start_date + i)::TEXT))::BOOLEAN IS TRUE THEN
      completed_days := completed_days + 1;
      temp_streak := temp_streak + 1;
      best_streak := GREATEST(best_streak, temp_streak);
      IF participation_record.start_date + i = CURRENT_DATE - INTERVAL '1 day' OR 
         participation_record.start_date + i = CURRENT_DATE THEN
        current_streak := temp_streak;
      END IF;
    ELSE
      temp_streak := 0;
    END IF;
  END LOOP;
  
  -- Calculate completion percentage
  completion_pct := CASE 
    WHEN total_days > 0 THEN (completed_days::NUMERIC / total_days::NUMERIC) * 100
    ELSE 0 
  END;
  
  -- Update participation record
  UPDATE public.user_challenge_participations 
  SET 
    current_progress = completed_days,
    streak_count = current_streak,
    best_streak = best_streak,
    completion_percentage = completion_pct,
    is_completed = (completion_pct >= 100 OR CURRENT_DATE > end_date),
    completed_at = CASE WHEN completion_pct >= 100 AND completed_at IS NULL THEN now() ELSE completed_at END,
    last_progress_update = now()
  WHERE id = participation_id_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_follow_status(target_user_id uuid)
 RETURNS TABLE(is_following boolean, is_followed_by boolean, followers_count integer, following_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM public.user_follows 
      WHERE user_id = current_user_id AND followed_user_id = target_user_id
    ) as is_following,
    EXISTS(
      SELECT 1 FROM public.user_follows 
      WHERE user_id = target_user_id AND followed_user_id = current_user_id
    ) as is_followed_by,
    COALESCE(up.followers_count, 0) as followers_count,
    COALESCE(up.following_count, 0) as following_count
  FROM public.user_profiles up
  WHERE up.user_id = target_user_id;
END;
$function$;