import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Zap, Shield, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

const MOOD_EMOJIS = ['😢', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩', '🥳', '😍'];
const WELLNESS_EMOJIS = ['🤒', '😷', '😴', '😐', '🙂', '😊', '💪', '✨', '🌟', '🚀'];

interface DailyMoodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyMoodModal: React.FC<DailyMoodModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [mood, setMood] = useState<number>(5);
  const [energy, setEnergy] = useState<number>(5);
  const [wellness, setWellness] = useState<number>(5);
  const [journalText, setJournalText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingLog, setExistingLog] = useState<any>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadTodaysMoodLog();
    }
  }, [isOpen, user]);

  const loadTodaysMoodLog = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Error loading mood log:', error);
        return;
      }

      if (data) {
        setExistingLog(data);
        setMood(data.mood || 5);
        setEnergy(data.energy || 5);
        setWellness(data.wellness || 5);
        setJournalText(data.journal_text || '');
      }
    } catch (error) {
      console.error('Error loading mood log:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Simple AI-like tag detection based on journal text
      const aiTags = detectTags(journalText);

      const moodData = {
        user_id: user.id,
        date: today,
        mood,
        energy,
        wellness,
        journal_text: journalText.trim() || null,
        ai_detected_tags: aiTags.length > 0 ? aiTags : null,
      };

      const { error } = await supabase
        .from('mood_logs')
        .upsert(moodData, { onConflict: 'user_id,date' });

      if (error) {
        console.error('Error saving mood log:', error);
        toast.error('Failed to save your mood log');
        return;
      }

      toast.success("Thanks for logging! We'll use this to improve your monthly insights 🧠💚", {
        duration: 4000,
      });

      // Reset form
      setMood(5);
      setEnergy(5);
      setWellness(5);
      setJournalText('');
      setExistingLog(null);
      onClose();
    } catch (error) {
      console.error('Error saving mood log:', error);
      toast.error('Failed to save your mood log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const detectTags = (text: string): string[] => {
    if (!text) return [];
    
    const lowerText = text.toLowerCase();
    const tags: string[] = [];

    // Physical symptoms
    if (lowerText.includes('headache') || lowerText.includes('head hurt')) tags.push('headache');
    if (lowerText.includes('bloat') || lowerText.includes('bloated')) tags.push('bloating');
    if (lowerText.includes('tired') || lowerText.includes('fatigue')) tags.push('fatigue');
    if (lowerText.includes('nausea') || lowerText.includes('sick')) tags.push('nausea');
    if (lowerText.includes('pain') || lowerText.includes('ache')) tags.push('pain');
    
    // Emotional states
    if (lowerText.includes('stress') || lowerText.includes('anxious')) tags.push('stress');
    if (lowerText.includes('happy') || lowerText.includes('joy')) tags.push('positive_mood');
    if (lowerText.includes('sad') || lowerText.includes('down')) tags.push('low_mood');
    if (lowerText.includes('angry') || lowerText.includes('irritated')) tags.push('irritation');
    
    // Sleep related
    if (lowerText.includes('sleep') || lowerText.includes('insomnia')) tags.push('sleep_issues');
    
    return tags;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto rounded-3xl border-0 bg-gradient-to-br from-purple-50 to-emerald-50 dark:from-purple-900/20 dark:to-emerald-900/20">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">
            {existingLog ? 'Update Your Daily Log' : 'Daily Mood & Wellness Check-in'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-1">
          {/* Mood */}
          <Card className="border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Heart className="h-5 w-5 text-pink-500" />
                <span className="font-semibold text-gray-900 dark:text-white">Mood</span>
              </div>
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-4xl">{MOOD_EMOJIS[mood - 1]}</span>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {mood}/10
                  </p>
                </div>
                <Slider
                  value={[mood]}
                  onValueChange={(value) => setMood(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Energy */}
          <Card className="border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold text-gray-900 dark:text-white">Energy Level</span>
              </div>
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {energy}/10
                  </p>
                </div>
                <Slider
                  value={[energy]}
                  onValueChange={(value) => setEnergy(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Wellness */}
          <Card className="border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="font-semibold text-gray-900 dark:text-white">Overall Wellness</span>
              </div>
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-4xl">{WELLNESS_EMOJIS[wellness - 1]}</span>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {wellness}/10
                  </p>
                </div>
                <Slider
                  value={[wellness]}
                  onValueChange={(value) => setWellness(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Journal */}
          <Card className="border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  Optional Notes
                </span>
              </div>
              <Textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Any notable symptoms, thoughts, or feelings? (e.g., headache, bloating, feeling grateful...)"
                className="rounded-xl border-0 bg-white/70 dark:bg-black/30 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {journalText.length}/500
              </p>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white font-semibold"
            >
              {isSubmitting ? 'Saving...' : existingLog ? 'Update Log' : 'Save Mood Log'}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full rounded-2xl"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};