-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.update_primary_monthly_scan()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  scan_month_start DATE;
  scan_month_end DATE;
BEGIN
  -- Calculate the start and end of the month for the new scan
  scan_month_start := DATE_TRUNC('month', NEW.created_at::DATE);
  scan_month_end := scan_month_start + INTERVAL '1 month' - INTERVAL '1 day';
  
  -- Mark all scans in the same month and year as non-primary
  UPDATE public.body_scans 
  SET is_primary_monthly = false
  WHERE user_id = NEW.user_id 
    AND created_at::DATE >= scan_month_start 
    AND created_at::DATE <= scan_month_end
    AND id != NEW.id;
  
  -- Ensure the new scan is marked as primary
  NEW.is_primary_monthly = true;
  
  RETURN NEW;
END;
$$;