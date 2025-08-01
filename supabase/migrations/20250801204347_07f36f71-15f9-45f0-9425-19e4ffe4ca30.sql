-- Add is_primary_monthly column to body_scans table
ALTER TABLE public.body_scans 
ADD COLUMN is_primary_monthly BOOLEAN NOT NULL DEFAULT true;

-- Create index for faster querying of primary scans
CREATE INDEX idx_body_scans_primary_monthly ON public.body_scans(user_id, is_primary_monthly, created_at);

-- Create function to update primary monthly scans
CREATE OR REPLACE FUNCTION public.update_primary_monthly_scan()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update primary monthly scans
CREATE TRIGGER trigger_update_primary_monthly_scan
  BEFORE INSERT ON public.body_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_primary_monthly_scan();