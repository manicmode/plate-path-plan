-- Create function to calculate yearly score for a user
CREATE OR REPLACE FUNCTION public.calculate_yearly_score(target_user_id uuid, target_year integer)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  daily_points_total numeric := 0;
  trophy_bonuses_total numeric := 0;
  badge_record RECORD;
  year_start date := (target_year || '-01-01')::date;
  year_end date := (target_year || '-12-31')::date;
BEGIN
  -- Calculate daily challenge points from daily_performance_scores
  SELECT COALESCE(SUM(total_score), 0) INTO daily_points_total
  FROM public.daily_performance_scores
  WHERE user_id = target_user_id
    AND date BETWEEN year_start AND year_end;
  
  -- Calculate trophy bonuses from badges earned in the year
  FOR badge_record IN
    SELECT b.name, ub.unlocked_at
    FROM public.user_badges ub
    JOIN public.badges b ON ub.badge_id = b.id
    WHERE ub.user_id = target_user_id
      AND DATE(ub.unlocked_at) BETWEEN year_start AND year_end
  LOOP
    -- Add trophy bonuses based on badge type
    CASE badge_record.name
      WHEN 'public_winner' THEN
        trophy_bonuses_total := trophy_bonuses_total + 300;
      WHEN 'private_winner' THEN
        trophy_bonuses_total := trophy_bonuses_total + 250;
      WHEN 'quick_winner' THEN
        trophy_bonuses_total := trophy_bonuses_total + 150;
      WHEN 'monthly_champion' THEN
        trophy_bonuses_total := trophy_bonuses_total + 500;
      WHEN 'perfect_month' THEN
        trophy_bonuses_total := trophy_bonuses_total + 300;
      WHEN 'special_achievement' THEN
        -- Variable bonus for special achievements (default 250 if not specified)
        trophy_bonuses_total := trophy_bonuses_total + 250;
      ELSE
        -- Default small bonus for other badges
        trophy_bonuses_total := trophy_bonuses_total + 50;
    END CASE;
  END LOOP;
  
  -- Return total yearly score
  RETURN daily_points_total + trophy_bonuses_total;
END;
$function$;