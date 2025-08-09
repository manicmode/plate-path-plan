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
import { EnergyMode } from '@/utils/energy';
import { ENERGY_MAP, MOOD_MAP, WELLNESS_MAP, emojiFromScore } from '@/utils/feelings';
import EmojiPicker from '@/components/checkin/EmojiPicker';
import '@/styles/checkin.css';

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
  
  // Emoji override modes
  const [moodEmojiOverride, setMoodEmojiOverride] = useState<string | null>(null);
  const [energyEmojiOverride, setEnergyEmojiOverride] = useState<string | null>(null);
  const [wellnessEmojiOverride, setWellnessEmojiOverride] = useState<string | null>(null);

  // Picker open states
  const [moodPickerOpen, setMoodPickerOpen] = useState(false);
  const [energyPickerOpen, setEnergyPickerOpen] = useState(false);
  const [wellnessPickerOpen, setWellnessPickerOpen] = useState(false);

  const [notesRows, setNotesRows] = useState(2);

  // Modes and current emojis
  const moodMode: EnergyMode = moodEmojiOverride ? 'override' : 'auto';
  const energyMode: EnergyMode = energyEmojiOverride ? 'override' : 'auto';
  const wellnessMode: EnergyMode = wellnessEmojiOverride ? 'override' : 'auto';

  const moodEmoji = moodEmojiOverride ?? emojiFromScore(MOOD_MAP, mood);
  const energyEmoji = energyEmojiOverride ?? emojiFromScore(ENERGY_MAP, energy);
  const wellnessEmoji = wellnessEmojiOverride ?? emojiFromScore(WELLNESS_MAP, wellness);

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

      // Client analytics payload including emoji + mode (no schema change)
      const clientPayload = {
        user_id: user.id,
        date: today,
        mood: { score: mood, emoji: moodEmoji, mode: moodMode },
        energy: { score: energy, emoji: energyEmoji, mode: energyMode },
        wellness: { score: wellness, emoji: wellnessEmoji, mode: wellnessMode },
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
      setMoodEmojiOverride(null);
      setEnergyEmojiOverride(null);
      setWellnessEmojiOverride(null);
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
        <DialogHeader className="checkin-modal-header">
          <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">
            {existingLog ? 'Update Your Daily Check-In' : 'Daily Mood & Wellness Check-In'}
          </DialogTitle>
        </DialogHeader>

        <div className="checkin-content">
          {/* Mood */}
          <Card className="checkin-card compact border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="checkin-inner p-4">
              <div className="checkin-title flex items-center space-x-2 mb-2">
                <Heart className="h-5 w-5 text-pink-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  Mood
                  <span className="sr-only">Current value {mood} of 10</span>
                  <span aria-hidden className="ml-2 text-muted-foreground">{mood}/10</span>
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-center">
                  <EmojiPicker
                    open={moodPickerOpen}
                    onOpenChange={setMoodPickerOpen}
                    items={MOOD_MAP}
                    onSelectItem={(item) => { setMood(item.value); setMoodEmojiOverride(item.emoji); }}
                    onAuto={() => setMoodEmojiOverride(null)}
                    currentEmoji={moodEmoji}
                    className="checkin-emoji-button"
                    ariaLabel="Pick mood emoji"
                    title="Pick mood"
                  />
                  {moodMode === 'override' && (
                    <span className="ml-1 align-top text-xs text-muted-foreground" aria-hidden>•</span>
                  )}
                </div>
                <ValueSlider
                  value={mood}
                  onChange={setMood}
                  ariaLabel="Mood"
                  className="checkin-slider"
                />
              </div>
            </CardContent>
          </Card>

          {/* Energy */}
          <Card className="checkin-card compact border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="checkin-inner p-4">
              <div className="checkin-title flex items-center space-x-2 mb-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  Energy Level
                  <span className="sr-only">Current value {energy} of 10</span>
                  <span aria-hidden className="ml-2 text-muted-foreground">{energy}/10</span>
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-center">
                  <EmojiPicker
                    open={energyPickerOpen}
                    onOpenChange={setEnergyPickerOpen}
                    items={ENERGY_MAP}
                    onSelectItem={(item) => { setEnergy(item.value); setEnergyEmojiOverride(item.emoji); }}
                    onAuto={() => setEnergyEmojiOverride(null)}
                    currentEmoji={energyEmoji}
                    className="checkin-emoji-button"
                    ariaLabel="Pick energy emoji"
                    title="Pick energy"
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
                  className="checkin-slider"
                />
              </div>
            </CardContent>
          </Card>

          {/* Wellness */}
          <Card className="checkin-card compact border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="checkin-inner p-4">
              <div className="checkin-title flex items-center space-x-2 mb-2">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  Overall Wellness
                  <span className="sr-only">Current value {wellness} of 10</span>
                  <span aria-hidden className="ml-2 text-muted-foreground">{wellness}/10</span>
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-center">
                  <span className="checkin-emoji">{WELLNESS_EMOJIS[wellness - 1]}</span>
                </div>
                <ValueSlider
                  value={wellness}
                  onChange={setWellness}
                  ariaLabel="Wellness"
                  className="checkin-slider"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="checkin-card compact border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
            <CardContent className="checkin-inner p-4">
              <div className="checkin-title flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900 dark:text-white">Optional Notes</span>
                <span className="text-xs text-muted-foreground">{notes.length}/500</span>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How are you feeling today? Any specific thoughts or observations..."
                className="checkin-notes rounded-xl border-0 bg-white/70 dark:bg-black/30 resize-none"
                rows={notesRows}
                onFocus={() => setNotesRows(5)}
                onBlur={() => setNotesRows(2)}
                maxLength={500}
              />
            </CardContent>
          </Card>
        </div>

        {/* Footer buttons */}
        <div className="checkin-footer">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white font-semibold"
          >
            {isSubmitting ? 'Saving...' : existingLog ? 'Update Check-In' : 'Save Check-In'}
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full rounded-2xl h-10"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};