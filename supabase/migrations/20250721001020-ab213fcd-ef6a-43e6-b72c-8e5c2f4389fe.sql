-- Add user_rating column to mood_predictions table
ALTER TABLE public.mood_predictions 
ADD COLUMN user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5);