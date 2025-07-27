-- Create meditation_sessions table
CREATE TABLE public.meditation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  duration INTEGER NOT NULL, -- duration in minutes
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.meditation_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies - sessions are public to read
CREATE POLICY "Anyone can view meditation sessions" ON public.meditation_sessions
FOR SELECT USING (true);

-- Only system can insert/update sessions (for now)
CREATE POLICY "System can manage meditation sessions" ON public.meditation_sessions
FOR ALL USING (false);

-- Create index for performance
CREATE INDEX idx_meditation_sessions_category_duration ON public.meditation_sessions (category, duration);

-- Add trigger for updated_at
CREATE TRIGGER update_meditation_sessions_updated_at
BEFORE UPDATE ON public.meditation_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for testing
INSERT INTO public.meditation_sessions (category, duration, title, description, audio_url) VALUES
('morning-boost', 5, 'Quick Morning Energy', 'A brief energizing session to kickstart your day', '/audio/morning-quick.mp3'),
('morning-boost', 10, 'Morning Clarity', 'Start your day with clear intention and focused energy', '/audio/morning-clarity.mp3'),
('morning-boost', 15, 'Deep Morning Activation', 'Comprehensive morning practice for sustained energy', '/audio/morning-deep.mp3'),
('morning-boost', 20, 'Complete Morning Routine', 'Full morning meditation with breathing and visualization', '/audio/morning-complete.mp3'),

('sleep-wind-down', 5, 'Quick Sleep Prep', 'Brief relaxation to prepare for restful sleep', '/audio/sleep-quick.mp3'),
('sleep-wind-down', 10, 'Evening Calm', 'Gentle transition from day to peaceful night', '/audio/sleep-calm.mp3'),
('sleep-wind-down', 15, 'Deep Sleep Meditation', 'Comprehensive relaxation for quality rest', '/audio/sleep-deep.mp3'),
('sleep-wind-down', 20, 'Complete Sleep Journey', 'Full evening practice with body scan and breathing', '/audio/sleep-complete.mp3'),

('focus-clarity', 5, 'Quick Focus Boost', 'Brief session to sharpen mental clarity', '/audio/focus-quick.mp3'),
('focus-clarity', 10, 'Mind Sharpening', 'Enhance concentration and mental acuity', '/audio/focus-sharp.mp3'),
('focus-clarity', 15, 'Deep Focus Practice', 'Comprehensive attention training', '/audio/focus-deep.mp3'),
('focus-clarity', 20, 'Complete Clarity Session', 'Full practice for sustained mental clarity', '/audio/focus-complete.mp3'),

('self-love', 5, 'Quick Self-Compassion', 'Brief practice in self-kindness', '/audio/love-quick.mp3'),
('self-love', 10, 'Heart Opening', 'Cultivate compassion and self-acceptance', '/audio/love-heart.mp3'),
('self-love', 15, 'Deep Self-Care', 'Comprehensive self-love practice', '/audio/love-deep.mp3'),
('self-love', 20, 'Complete Self-Love Journey', 'Full practice for deep self-acceptance', '/audio/love-complete.mp3'),

('anxiety-relief', 5, 'Quick Calm', 'Brief anxiety relief and grounding', '/audio/anxiety-quick.mp3'),
('anxiety-relief', 10, 'Tension Release', 'Release stress and find inner calm', '/audio/anxiety-release.mp3'),
('anxiety-relief', 15, 'Deep Relaxation', 'Comprehensive anxiety relief practice', '/audio/anxiety-deep.mp3'),
('anxiety-relief', 20, 'Complete Healing Session', 'Full practice for deep emotional healing', '/audio/anxiety-complete.mp3'),

('gratitude', 5, 'Quick Appreciation', 'Brief gratitude practice', '/audio/gratitude-quick.mp3'),
('gratitude', 10, 'Heart of Thanks', 'Cultivate appreciation and joy', '/audio/gratitude-heart.mp3'),
('gratitude', 15, 'Deep Gratitude', 'Comprehensive thankfulness practice', '/audio/gratitude-deep.mp3'),
('gratitude', 20, 'Complete Blessing Session', 'Full practice for abundant gratitude', '/audio/gratitude-complete.mp3'),

('deep-healing', 5, 'Quick Restoration', 'Brief healing and renewal', '/audio/healing-quick.mp3'),
('deep-healing', 10, 'Inner Healing', 'Restore and rejuvenate your spirit', '/audio/healing-inner.mp3'),
('deep-healing', 15, 'Deep Renewal', 'Comprehensive healing practice', '/audio/healing-deep.mp3'),
('deep-healing', 20, 'Complete Transformation', 'Full healing and restoration journey', '/audio/healing-complete.mp3'),

('manifestation', 5, 'Quick Intention', 'Brief intention setting practice', '/audio/manifest-quick.mp3'),
('manifestation', 10, 'Dream Alignment', 'Align with your deepest desires', '/audio/manifest-align.mp3'),
('manifestation', 15, 'Deep Manifestation', 'Comprehensive creation practice', '/audio/manifest-deep.mp3'),
('manifestation', 20, 'Complete Vision Session', 'Full practice for manifesting dreams', '/audio/manifest-complete.mp3');