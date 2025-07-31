-- Create body_scan_reminders table
CREATE TABLE public.body_scan_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_scan_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  next_due_scan_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scan_streak INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.body_scan_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own body scan reminders" 
ON public.body_scan_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own body scan reminders" 
ON public.body_scan_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body scan reminders" 
ON public.body_scan_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add new columns to body_scans table for timeline tracking
ALTER TABLE public.body_scans 
ADD COLUMN IF NOT EXISTS side_image_url TEXT,
ADD COLUMN IF NOT EXISTS back_image_url TEXT,
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS scan_index INTEGER,
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS month INTEGER;

-- Update existing body_scans to set year and month from created_at
UPDATE public.body_scans 
SET 
  year = EXTRACT(YEAR FROM created_at),
  month = EXTRACT(MONTH FROM created_at)
WHERE year IS NULL OR month IS NULL;

-- Create function to update body scan reminders
CREATE OR REPLACE FUNCTION public.update_body_scan_reminder(
  p_user_id UUID,
  p_scan_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  current_streak INTEGER := 1;
  last_scan_date DATE;
  new_scan_date DATE := p_scan_date::DATE;
BEGIN
  -- Get the last scan date
  SELECT last_scan_at::DATE, scan_streak 
  INTO last_scan_date, current_streak
  FROM public.body_scan_reminders 
  WHERE user_id = p_user_id;
  
  -- Calculate streak
  IF last_scan_date IS NOT NULL THEN
    -- If last scan was within 35 days (allowing 5 day grace period), continue streak
    IF new_scan_date - last_scan_date <= 35 THEN
      current_streak := current_streak + 1;
    ELSE
      -- Reset streak
      current_streak := 1;
    END IF;
  END IF;
  
  -- Insert or update reminder record
  INSERT INTO public.body_scan_reminders (
    user_id,
    last_scan_at,
    next_due_scan_at,
    scan_streak,
    reminder_sent_at
  ) VALUES (
    p_user_id,
    p_scan_date,
    p_scan_date + INTERVAL '30 days',
    current_streak,
    NULL
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    last_scan_at = EXCLUDED.last_scan_at,
    next_due_scan_at = EXCLUDED.next_due_scan_at,
    scan_streak = EXCLUDED.scan_streak,
    reminder_sent_at = NULL,
    updated_at = now();
END;
$$;

-- Create function to calculate scan index
CREATE OR REPLACE FUNCTION public.calculate_scan_index(
  p_user_id UUID,
  p_year INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  next_index INTEGER;
BEGIN
  -- Get the next scan index for the year
  SELECT COALESCE(MAX(scan_index), 0) + 1
  INTO next_index
  FROM public.body_scans
  WHERE user_id = p_user_id AND year = p_year;
  
  RETURN next_index;
END;
$$;

-- Create trigger to update timestamps
CREATE TRIGGER update_body_scan_reminders_updated_at
BEFORE UPDATE ON public.body_scan_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();