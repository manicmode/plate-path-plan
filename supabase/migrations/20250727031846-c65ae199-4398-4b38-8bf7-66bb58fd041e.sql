-- Create recovery_reminders table
CREATE TABLE public.recovery_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- e.g. 'meditation', 'breathing', 'stretching'
  content_id TEXT,            -- optional, allows reminders for specific sessions
  title TEXT NOT NULL,
  reminder_time TIME NOT NULL,
  repeat_pattern TEXT DEFAULT 'daily', -- daily, weekly, custom
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Enable Row Level Security
ALTER TABLE public.recovery_reminders ENABLE ROW LEVEL SECURITY;

-- RLS: Select
CREATE POLICY "Users can view their own reminders" ON public.recovery_reminders
FOR SELECT USING (auth.uid() = user_id);

-- RLS: Insert
CREATE POLICY "Users can insert their own reminders" ON public.recovery_reminders
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: Update
CREATE POLICY "Users can update their own reminders" ON public.recovery_reminders
FOR UPDATE USING (auth.uid() = user_id);

-- RLS: Delete
CREATE POLICY "Users can delete their own reminders" ON public.recovery_reminders
FOR DELETE USING (auth.uid() = user_id);

-- Trigger: Auto-update timestamp
CREATE TRIGGER update_recovery_reminders_updated_at
BEFORE UPDATE ON public.recovery_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();