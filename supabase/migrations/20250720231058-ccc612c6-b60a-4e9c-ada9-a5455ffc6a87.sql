-- Create mood_logs table for daily mood and wellness tracking
CREATE TABLE public.mood_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INTEGER CHECK (mood >= 1 AND mood <= 10),
  energy INTEGER CHECK (energy >= 1 AND energy <= 10),
  wellness INTEGER CHECK (wellness >= 1 AND wellness <= 10),
  journal_text TEXT,
  ai_detected_tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for mood logs
CREATE POLICY "Users can view their own mood logs" 
ON public.mood_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mood logs" 
ON public.mood_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood logs" 
ON public.mood_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood logs" 
ON public.mood_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_mood_logs_updated_at
BEFORE UPDATE ON public.mood_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_mood_logs_user_date ON public.mood_logs(user_id, date DESC);