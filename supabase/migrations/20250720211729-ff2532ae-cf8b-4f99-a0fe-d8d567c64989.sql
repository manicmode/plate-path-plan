-- Create hall of fame tributes table
CREATE TABLE public.hall_of_fame_tributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  champion_user_id UUID NOT NULL,
  champion_year INTEGER NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE),
  message TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  reactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hall_of_fame_tributes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view tributes" 
ON public.hall_of_fame_tributes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tributes" 
ON public.hall_of_fame_tributes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tributes" 
ON public.hall_of_fame_tributes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Champions can update pinned status on their tributes" 
ON public.hall_of_fame_tributes 
FOR UPDATE 
USING (auth.uid() = champion_user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hall_of_fame_tributes_updated_at
BEFORE UPDATE ON public.hall_of_fame_tributes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();