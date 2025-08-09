import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ValueSlider from '@/components/ui/ValueSlider';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Zap, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { energyEmojiFromScore, EnergyMode } from '@/utils/energy';
import EmojiPicker from '@/components/checkin/EmojiPicker';
import '@/styles/checkin.css';

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
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingLog, setExistingLog] = useState<any>(null);
  const [energyEmojiOverride, setEnergyEmojiOverride] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notesRows, setNotesRows] = useState(2);
  const energyMode: EnergyMode = energyEmojiOverride ? 'override' : 'auto';
  const energyEmoji = energyEmojiOverride ?? energyEmojiFromScore(energy);

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
        setNotes(data.journal_text || '');
        // No schema for energy emoji yet; default to auto
        setEnergyEmojiOverride(null);
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

      const moodData = {
        user_id: user.id,
        date: today,
        mood: mood,
        energy: energy,
        wellness: wellness,
        journal_text: notes.trim() || null,
      };

      // Client analytics payload including energy emoji + mode (no schema change)
      const clientPayload = {
        user_id: user.id,
        date: today,
        mood,
        energy: { score: energy, emoji: energyEmoji, mode: energyMode },
        wellness,
        notes: notes.trim() || null,
      };

      const { error } = await supabase
        .from('mood_logs')
        .upsert(moodData, { onConflict: 'user_id,date' });

      if (error) {
        console.error('Error saving mood log:', error);
        toast.error('Failed to save your mood log');
        return;
      }

      toast.success(existingLog ? 'Daily check-in updated!' : 'Daily check-in saved!');

      // Reset form
      setMood(5);
      setEnergy(5);
      setWellness(5);
      setNotes('');
      setExistingLog(null);
      onClose();

      // Trigger banner refresh by dispatching a custom event
      window.dispatchEvent(new CustomEvent('moodLogSaved'));
    } catch (error) {
      console.error('Error saving mood log:', error);
      toast.error('Failed to save your mood log');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="checkin-modal mood-modal max-w-md mx-auto rounded-3xl border-0 bg-gradient-to-br from-purple-50 to-emerald-50 dark:from-purple-900/20 dark:to-emerald-900/20">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">
            {existingLog ? 'Update Your Daily Check-In' : 'Daily Mood & Wellness Check-In'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-1">
          {/* Mood */}
          <Card className="border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Heart className="h-5 w-5 text-pink-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  Mood 
                  <span className="sr-only">Current value {mood} of 10</span>
                  <span aria-hidden className="ml-2 text-muted-foreground">{mood}/10</span>
                </span>
              </div>
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-4xl">{MOOD_EMOJIS[mood - 1]}</span>
                </div>
                <ValueSlider 
                  value={mood} 
                  onChange={setMood} 
                  ariaLabel="Mood" 
                  className="mb-6" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Energy */}
          <Card className="border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  Energy Level
                  <span className="sr-only">Current value {energy} of 10</span>
                  <span aria-hidden className="ml-2 text-muted-foreground">{energy}/10</span>
                </span>
              </div>
              <div className="space-y-3">
                <div className="text-center">
                  <EmojiPicker
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    onSelect={(e) => setEnergyEmojiOverride(e)}
                    onAuto={() => setEnergyEmojiOverride(null)}
                    currentEmoji={energyEmoji}
                  />
                  {energyMode === 'override' && (
                    <span className="ml-1 align-top text-xs text-muted-foreground" aria-hidden>•</span>
                  )}
                  <span className="sr-only">
                    <button aria-label={`Energy emoji, ${energyMode === 'auto' ? `Auto (${energyEmoji})` : `Override (${energyEmoji})`}`} />
                  </span>
                </div>
                <ValueSlider 
                  value={energy} 
                  onChange={setEnergy} 
                  ariaLabel="Energy" 
                  className="mb-6" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Wellness */}
          <Card className="border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  Overall Wellness
                  <span className="sr-only">Current value {wellness} of 10</span>
                  <span aria-hidden className="ml-2 text-muted-foreground">{wellness}/10</span>
                </span>
              </div>
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-4xl">{WELLNESS_EMOJIS[wellness - 1]}</span>
                </div>
                <ValueSlider 
                  value={wellness} 
                  onChange={setWellness} 
                  ariaLabel="Wellness" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Optional Notes
                </span>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How are you feeling today? Any specific thoughts or observations..."
                className="rounded-xl border-0 bg-white/70 dark:bg-black/30 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {notes.length}/500
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
              {isSubmitting ? 'Saving...' : existingLog ? 'Update Check-In' : 'Save Check-In'}
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