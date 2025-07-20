-- Create hall_of_fame_winners table
CREATE TABLE IF NOT EXISTS public.hall_of_fame_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  user_id UUID NOT NULL,
  group_id INTEGER NOT NULL,
  final_score NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(year, group_id)
);

-- Enable RLS
ALTER TABLE public.hall_of_fame_winners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view hall of fame winners" 
ON public.hall_of_fame_winners 
FOR SELECT 
USING (true);

CREATE POLICY "System can create hall of fame winners" 
ON public.hall_of_fame_winners 
FOR INSERT 
WITH CHECK (true);

-- Add hall_of_fame_winner field to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS hall_of_fame_winner BOOLEAN DEFAULT false;

-- Create function to process yearly hall of fame
CREATE OR REPLACE FUNCTION public.process_yearly_hall_of_fame(target_year integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  user_record RECORD;
  group_counter INTEGER := 0;
  current_group INTEGER := 1;
  group_users UUID[] := '{}';
  group_scores JSONB := '{}';
  max_score NUMERIC;
  winner_user_id UUID;
  results JSONB := '{"groups_processed": 0, "winners": []}'::jsonb;
BEGIN
  -- Get all users ordered by their yearly score (highest first)
  FOR user_record IN
    SELECT 
      up.user_id,
      public.calculate_yearly_score(up.user_id, target_year) as yearly_score
    FROM public.user_profiles up
    WHERE up.user_id IS NOT NULL
    ORDER BY yearly_score DESC
  LOOP
    -- Add user to current group
    group_users := group_users || user_record.user_id;
    group_scores := group_scores || jsonb_build_object(user_record.user_id::text, user_record.yearly_score);
    group_counter := group_counter + 1;
    
    -- Process group when we reach 20 users or it's the last user
    IF group_counter = 20 OR user_record.user_id = (
      SELECT up.user_id FROM public.user_profiles up ORDER BY public.calculate_yearly_score(up.user_id, target_year) DESC LIMIT 1 OFFSET (
        SELECT COUNT(*) - 1 FROM public.user_profiles WHERE user_id IS NOT NULL
      )
    ) THEN
      -- Find winner in this group (user with highest score)
      max_score := 0;
      winner_user_id := NULL;
      
      FOR i IN 1..array_length(group_users, 1) LOOP
        IF (group_scores->>group_users[i]::text)::numeric > max_score THEN
          max_score := (group_scores->>group_users[i]::text)::numeric;
          winner_user_id := group_users[i];
        END IF;
      END LOOP;
      
      -- Insert winner into hall_of_fame_winners
      INSERT INTO public.hall_of_fame_winners (year, user_id, group_id, final_score)
      VALUES (target_year, winner_user_id, current_group, max_score)
      ON CONFLICT (year, group_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        final_score = EXCLUDED.final_score;
      
      -- Update winner's profile
      UPDATE public.user_profiles 
      SET hall_of_fame_winner = true 
      WHERE user_id = winner_user_id;
      
      -- Add to results
      results := jsonb_set(
        results, 
        '{winners}', 
        (results->'winners') || jsonb_build_object(
          'group_id', current_group,
          'user_id', winner_user_id,
          'score', max_score,
          'group_size', array_length(group_users, 1)
        )
      );
      
      -- Reset for next group
      group_users := '{}';
      group_scores := '{}';
      group_counter := 0;
      current_group := current_group + 1;
    END IF;
  END LOOP;
  
  -- Update results with total groups processed
  results := jsonb_set(results, '{groups_processed}', to_jsonb(current_group - 1));
  
  RETURN results;
END;
$function$;

-- Enable pg_cron and pg_net extensions for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;