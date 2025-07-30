-- Create function to enforce single active routine per user
CREATE OR REPLACE FUNCTION public.enforce_single_active_routine()
RETURNS TRIGGER AS $$
BEGIN
  -- If the routine is being set to active
  IF NEW.is_active = true THEN
    -- Deactivate all other routines for this user in ai_routines table
    UPDATE public.ai_routines 
    SET is_active = false, updated_at = now()
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_active = true;
    
    -- Deactivate all other routines for this user in ai_generated_routines table
    UPDATE public.ai_generated_routines 
    SET is_active = false, updated_at = now()
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_active = true;
    
    -- If this is ai_routines table, also deactivate ai_generated_routines
    IF TG_TABLE_NAME = 'ai_routines' THEN
      UPDATE public.ai_generated_routines 
      SET is_active = false, updated_at = now()
      WHERE user_id = NEW.user_id 
        AND is_active = true;
    END IF;
    
    -- If this is ai_generated_routines table, also deactivate ai_routines
    IF TG_TABLE_NAME = 'ai_generated_routines' THEN
      UPDATE public.ai_routines 
      SET is_active = false, updated_at = now()
      WHERE user_id = NEW.user_id 
        AND is_active = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for both routine tables
DROP TRIGGER IF EXISTS enforce_single_active_ai_routine ON public.ai_routines;
CREATE TRIGGER enforce_single_active_ai_routine
  BEFORE UPDATE ON public.ai_routines
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_active_routine();

DROP TRIGGER IF EXISTS enforce_single_active_ai_generated_routine ON public.ai_generated_routines;
CREATE TRIGGER enforce_single_active_ai_generated_routine
  BEFORE UPDATE ON public.ai_generated_routines
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_active_routine();

-- Create function to get user's active routine across all tables
CREATE OR REPLACE FUNCTION public.get_user_active_routine(target_user_id UUID)
RETURNS TABLE(
  routine_id UUID,
  routine_name TEXT,
  routine_type TEXT,
  table_source TEXT,
  is_active BOOLEAN,
  start_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id as routine_id,
    ar.routine_name,
    'ai_legacy' as routine_type,
    'ai_routines' as table_source,
    ar.is_active,
    ar.start_date,
    ar.updated_at
  FROM public.ai_routines ar
  WHERE ar.user_id = target_user_id AND ar.is_active = true
  
  UNION ALL
  
  SELECT 
    agr.id as routine_id,
    agr.routine_name,
    'ai_generated' as routine_type,
    'ai_generated_routines' as table_source,
    agr.is_active,
    NULL::DATE as start_date,
    agr.updated_at
  FROM public.ai_generated_routines agr
  WHERE agr.user_id = target_user_id AND agr.is_active = true
  
  ORDER BY updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely activate a routine with proper deactivation
CREATE OR REPLACE FUNCTION public.activate_routine_safely(
  target_routine_id UUID,
  target_table_name TEXT,
  target_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  current_active_routine RECORD;
  activation_result JSONB;
BEGIN
  -- Get currently active routine
  SELECT * INTO current_active_routine
  FROM public.get_user_active_routine(target_user_id)
  LIMIT 1;
  
  -- Activate the target routine based on table
  IF target_table_name = 'ai_routines' THEN
    UPDATE public.ai_routines 
    SET is_active = true, 
        start_date = CURRENT_DATE,
        current_week = 1,
        current_day_in_week = 1,
        updated_at = now()
    WHERE id = target_routine_id AND user_id = target_user_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Routine not found');
    END IF;
    
  ELSIF target_table_name = 'ai_generated_routines' THEN
    UPDATE public.ai_generated_routines 
    SET is_active = true, updated_at = now()
    WHERE id = target_routine_id AND user_id = target_user_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Routine not found');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid table name');
  END IF;
  
  -- Build result
  activation_result := jsonb_build_object(
    'success', true,
    'activated_routine_id', target_routine_id,
    'activated_table', target_table_name,
    'previous_active_routine', 
    CASE 
      WHEN current_active_routine.routine_id IS NOT NULL THEN
        jsonb_build_object(
          'id', current_active_routine.routine_id,
          'name', current_active_routine.routine_name,
          'type', current_active_routine.routine_type,
          'table_source', current_active_routine.table_source
        )
      ELSE NULL
    END
  );
  
  RETURN activation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Data audit: Clean up any existing multiple active routines
-- Deactivate all but the most recent active routine per user in ai_routines
WITH ranked_routines AS (
  SELECT id, user_id, 
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
  FROM public.ai_routines 
  WHERE is_active = true
)
UPDATE public.ai_routines 
SET is_active = false, updated_at = now()
WHERE id IN (
  SELECT id FROM ranked_routines WHERE rn > 1
);

-- Deactivate all but the most recent active routine per user in ai_generated_routines
WITH ranked_generated_routines AS (
  SELECT id, user_id, 
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
  FROM public.ai_generated_routines 
  WHERE is_active = true
)
UPDATE public.ai_generated_routines 
SET is_active = false, updated_at = now()
WHERE id IN (
  SELECT id FROM ranked_generated_routines WHERE rn > 1
);

-- Final cleanup: If user has active routines in both tables, keep only the most recent
WITH all_active_routines AS (
  SELECT id, user_id, 'ai_routines' as table_name, updated_at
  FROM public.ai_routines 
  WHERE is_active = true
  
  UNION ALL
  
  SELECT id, user_id, 'ai_generated_routines' as table_name, updated_at
  FROM public.ai_generated_routines 
  WHERE is_active = true
),
ranked_all AS (
  SELECT id, user_id, table_name,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
  FROM all_active_routines
),
routines_to_deactivate AS (
  SELECT id, table_name FROM ranked_all WHERE rn > 1
)
-- Deactivate older routines from ai_routines
UPDATE public.ai_routines 
SET is_active = false, updated_at = now()
WHERE id IN (
  SELECT id FROM routines_to_deactivate WHERE table_name = 'ai_routines'
);

-- Deactivate older routines from ai_generated_routines  
WITH all_active_routines AS (
  SELECT id, user_id, 'ai_routines' as table_name, updated_at
  FROM public.ai_routines 
  WHERE is_active = true
  
  UNION ALL
  
  SELECT id, user_id, 'ai_generated_routines' as table_name, updated_at
  FROM public.ai_generated_routines 
  WHERE is_active = true
),
ranked_all AS (
  SELECT id, user_id, table_name,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
  FROM all_active_routines
),
routines_to_deactivate AS (
  SELECT id, table_name FROM ranked_all WHERE rn > 1
)
UPDATE public.ai_generated_routines 
SET is_active = false, updated_at = now()
WHERE id IN (
  SELECT id FROM routines_to_deactivate WHERE table_name = 'ai_generated_routines'
);