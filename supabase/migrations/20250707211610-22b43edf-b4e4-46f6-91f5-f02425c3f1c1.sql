
-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom', -- 'supplement', 'hydration', 'meal', 'custom'
  frequency_type TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'every_x_days', 'weekly', 'custom_days'
  frequency_value INTEGER DEFAULT 1, -- for 'every_x_days'
  custom_days INTEGER[] DEFAULT NULL, -- array of weekdays (0=Sunday, 1=Monday, etc.) for 'weekly' and 'custom_days'
  reminder_time TIME NOT NULL DEFAULT '09:00:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  food_item_data JSONB DEFAULT NULL, -- stores food nutrition data if reminder was created from food log
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  next_trigger_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create reminder logs table to track when reminders are marked as taken
CREATE TABLE public.reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'taken', -- 'taken', 'snoozed', 'missed'
  notes TEXT DEFAULT NULL
);

-- Add Row Level Security (RLS)
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for reminders
CREATE POLICY "Users can view their own reminders" 
  ON public.reminders 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders" 
  ON public.reminders 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" 
  ON public.reminders 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" 
  ON public.reminders 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for reminder logs
CREATE POLICY "Users can view their own reminder logs" 
  ON public.reminder_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminder logs" 
  ON public.reminder_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminder logs" 
  ON public.reminder_logs 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminder logs" 
  ON public.reminder_logs 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to calculate next trigger time
CREATE OR REPLACE FUNCTION public.calculate_next_trigger(
  reminder_id UUID
) RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  reminder_record RECORD;
  next_trigger TIMESTAMP WITH TIME ZONE;
  current_time TIMESTAMP WITH TIME ZONE := now();
  target_time TIME;
  target_date DATE;
  day_of_week INTEGER;
BEGIN
  -- Get reminder details
  SELECT * INTO reminder_record 
  FROM public.reminders 
  WHERE id = reminder_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  target_time := reminder_record.reminder_time;
  target_date := current_time::DATE;
  
  -- Calculate next trigger based on frequency type
  CASE reminder_record.frequency_type
    WHEN 'daily' THEN
      -- If today's time has passed, schedule for tomorrow
      IF (target_date + target_time) <= current_time THEN
        target_date := target_date + INTERVAL '1 day';
      END IF;
      next_trigger := target_date + target_time;
      
    WHEN 'every_x_days' THEN
      -- Calculate based on last triggered date or creation date
      IF reminder_record.last_triggered_at IS NOT NULL THEN
        target_date := (reminder_record.last_triggered_at::DATE) + (reminder_record.frequency_value || ' days')::INTERVAL;
      ELSE
        target_date := reminder_record.created_at::DATE;
      END IF;
      
      -- If calculated date is in the past, move to next occurrence
      WHILE (target_date + target_time) <= current_time LOOP
        target_date := target_date + (reminder_record.frequency_value || ' days')::INTERVAL;
      END LOOP;
      
      next_trigger := target_date + target_time;
      
    WHEN 'weekly', 'custom_days' THEN
      -- Find next occurrence of specified days
      day_of_week := EXTRACT(DOW FROM current_time); -- 0=Sunday, 1=Monday, etc.
      
      -- Find the next valid day
      FOR i IN 0..13 LOOP -- Check up to 2 weeks ahead
        target_date := (current_time + (i || ' days')::INTERVAL)::DATE;
        day_of_week := EXTRACT(DOW FROM target_date);
        
        -- Check if this day is in the custom_days array
        IF day_of_week = ANY(reminder_record.custom_days) THEN
          -- If it's today, check if time hasn't passed yet
          IF i = 0 AND (target_date + target_time) <= current_time THEN
            CONTINUE; -- Skip today, look for next occurrence
          END IF;
          
          next_trigger := target_date + target_time;
          EXIT;
        END IF;
      END LOOP;
      
    ELSE
      -- Default to daily
      next_trigger := target_date + target_time;
  END CASE;
  
  RETURN next_trigger;
END;
$$;

-- Trigger to automatically update next_trigger_at when reminder is created or updated
CREATE OR REPLACE FUNCTION public.update_reminder_next_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.next_trigger_at := public.calculate_next_trigger(NEW.id);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_reminder_next_trigger
  BEFORE INSERT OR UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reminder_next_trigger();
