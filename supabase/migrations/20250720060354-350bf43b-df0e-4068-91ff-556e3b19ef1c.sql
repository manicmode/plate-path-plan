-- Create function to batch load nutrition data for a user and date
CREATE OR REPLACE FUNCTION public.batch_load_nutrition_data(user_id_param uuid, date_param date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
  foods_data jsonb;
  hydration_data jsonb;
  supplements_data jsonb;
  targets_data jsonb;
BEGIN
  -- Get foods data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'food_name', food_name,
      'calories', calories,
      'protein', protein,
      'carbs', carbs,
      'fat', fat,
      'fiber', fiber,
      'sugar', sugar,
      'sodium', sodium,
      'quality_score', quality_score,
      'serving_size', serving_size,
      'source', source,
      'image_url', image_url,
      'quality_verdict', quality_verdict,
      'quality_reasons', quality_reasons,
      'processing_level', processing_level,
      'ingredient_analysis', ingredient_analysis,
      'confidence', confidence,
      'created_at', created_at
    )
  ) INTO foods_data
  FROM public.nutrition_logs
  WHERE user_id = user_id_param 
    AND DATE(created_at) = date_param;

  -- Get hydration data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'name', name,
      'volume', volume,
      'type', type,
      'image_url', image_url,
      'created_at', created_at
    )
  ) INTO hydration_data
  FROM public.hydration_logs
  WHERE user_id = user_id_param 
    AND DATE(created_at) = date_param;

  -- Get supplements data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'name', name,
      'dosage', dosage,
      'unit', unit,
      'frequency', frequency,
      'image_url', image_url,
      'created_at', created_at
    )
  ) INTO supplements_data
  FROM public.supplement_logs
  WHERE user_id = user_id_param 
    AND DATE(created_at) = date_param;

  -- Get targets data
  SELECT jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'date', date,
    'calories', calories,
    'protein', protein,
    'carbs', carbs,
    'fat', fat,
    'fiber', fiber,
    'sugar', sugar,
    'sodium', sodium,
    'saturated_fat', saturated_fat,
    'hydration_ml', hydration_ml,
    'supplement_count', supplement_count,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO targets_data
  FROM public.daily_nutrition_targets
  WHERE user_id = user_id_param 
    AND date = date_param;

  -- Combine all data
  result := jsonb_build_object(
    'foods', COALESCE(foods_data, '[]'::jsonb),
    'hydration', COALESCE(hydration_data, '[]'::jsonb),
    'supplements', COALESCE(supplements_data, '[]'::jsonb),
    'targets', COALESCE(targets_data, 'null'::jsonb)
  );

  RETURN result;
END;
$function$;