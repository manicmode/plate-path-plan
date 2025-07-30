-- Add routine_type field to both routine tables
ALTER TABLE public.ai_routines 
ADD COLUMN routine_type text NOT NULL DEFAULT 'primary'::text;

ALTER TABLE public.ai_generated_routines 
ADD COLUMN routine_type text NOT NULL DEFAULT 'primary'::text;

-- Add check constraints for valid routine types
ALTER TABLE public.ai_routines 
ADD CONSTRAINT ai_routines_routine_type_check 
CHECK (routine_type IN ('primary', 'supplemental'));

ALTER TABLE public.ai_generated_routines 
ADD CONSTRAINT ai_generated_routines_routine_type_check 
CHECK (routine_type IN ('primary', 'supplemental'));

-- Update the activate_routine_safely function to handle primary vs supplemental logic
CREATE OR REPLACE FUNCTION public.activate_routine_safely(target_routine_id uuid, target_table_name text, target_user_id uuid, target_routine_type text DEFAULT 'primary')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  current_active_routine RECORD;
  activation_result JSONB;
BEGIN
  -- If activating a primary routine, deactivate any existing primary routines
  IF target_routine_type = 'primary' THEN
    -- Get currently active primary routine
    SELECT * INTO current_active_routine
    FROM public.get_user_active_routine(target_user_id)
    LIMIT 1;
    
    -- Deactivate all primary routines for this user
    UPDATE public.ai_routines 
    SET is_active = false, updated_at = now()
    WHERE user_id = target_user_id AND routine_type = 'primary' AND is_active = true;
    
    UPDATE public.ai_generated_routines 
    SET is_active = false, updated_at = now()
    WHERE user_id = target_user_id AND routine_type = 'primary' AND is_active = true;
  END IF;
  
  -- Activate the target routine based on table
  IF target_table_name = 'ai_routines' THEN
    UPDATE public.ai_routines 
    SET is_active = true, 
        start_date = CURRENT_DATE,
        current_week = 1,
        current_day_in_week = 1,
        routine_type = target_routine_type,
        updated_at = now()
    WHERE id = target_routine_id AND user_id = target_user_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Routine not found');
    END IF;
    
  ELSIF target_table_name = 'ai_generated_routines' THEN
    UPDATE public.ai_generated_routines 
    SET is_active = true, 
        routine_type = target_routine_type,
        updated_at = now()
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
    'routine_type', target_routine_type,
    'previous_active_routine', 
    CASE 
      WHEN current_active_routine.routine_id IS NOT NULL AND target_routine_type = 'primary' THEN
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
$function$;

-- Update the get_user_active_routine function to only return primary routines
CREATE OR REPLACE FUNCTION public.get_user_active_routine(user_id_param uuid)
 RETURNS TABLE(routine_id uuid, routine_name text, routine_type text, table_source text, is_active boolean, start_date date, current_week integer, current_day_in_week integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id as routine_id,
    ar.routine_name,
    ar.routine_type,
    'ai_routines'::text as table_source,
    ar.is_active,
    ar.start_date,
    ar.current_week,
    ar.current_day_in_week
  FROM public.ai_routines ar
  WHERE ar.user_id = user_id_param 
    AND ar.is_active = true 
    AND ar.routine_type = 'primary'
  
  UNION ALL
  
  SELECT 
    agr.id as routine_id,
    agr.routine_name,
    agr.routine_type,
    'ai_generated_routines'::text as table_source,
    agr.is_active,
    NULL::date as start_date,
    NULL::integer as current_week,
    NULL::integer as current_day_in_week
  FROM public.ai_generated_routines agr
  WHERE agr.user_id = user_id_param 
    AND agr.is_active = true 
    AND agr.routine_type = 'primary'
  
  ORDER BY routine_name
  LIMIT 1;
END;
$function$;