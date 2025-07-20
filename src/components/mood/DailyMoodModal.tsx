
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Zap, Shield, Sparkles, Brain, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

const MOOD_EMOJIS = ['😢', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩', '🥳', '😍'];
const WELLNESS_EMOJIS = ['🤒', '😷', '😴', '😐', '🙂', '😊', '💪', '✨', '🌟', '🚀'];

interface DailyMoodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DetectedTag {
  tag: string;
  confidence: number;
  confirmed: boolean;
}

export const DailyMoodModal: React.FC<DailyMoodModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [mood, setMood] = useState<number>(5);
  const [energy, setEnergy] = useState<number>(5);
  const [wellness, setWellness] = useState<number>(5);
  const [journalText, setJournalText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingLog, setExistingLog] = useState<any>(null);
  
  // AI Tagging states
  const [detectedTags, setDetectedTags] = useState<DetectedTag[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadTodaysMoodLog();
    }
  }, [isOpen, user]);

  // AI analyze journal text when it changes (with debounce)
  useEffect(() => {
    if (journalText.trim().length > 10) {
      const timeoutId = setTimeout(() => {
        analyzeJournalText(journalText);
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    } else {
      setDetectedTags([]);
      setAiAnalysisResult(null);
    }
  }, [journalText]);

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
        
        // Set existing tags as confirmed
        if (data.ai_detected_tags && data.ai_detected_tags.length > 0) {
          const existingTags = data.ai_detected_tags.map((tag: string) => ({
            tag,
            confidence: 1.0,
            confirmed: true
          }));
          setDetectedTags(existingTags);
        }
      }
    } catch (error) {
      console.error('Error loading mood log:', error);
    }
  };

  const analyzeJournalText = async (text: string) => {
    if (!user || text.trim().length === 0) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-mood-journal', {
        body: { journalText: text }
      });

      if (error) {
        console.error('Error analyzing journal:', error);
        return;
      }

      setAiAnalysisResult(data);
      
      if (data.tags && data.tags.length > 0) {
        const newTags = data.tags.map((tag: string) => ({
          tag,
          confidence: data.confidence || 0.8,
          confirmed: false // User needs to confirm AI suggestions
        }));
        setDetectedTags(newTags);
      } else {
        setDetectedTags([]);
      }
    } catch (error) {
      console.error('Error analyzing journal:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTagConfirmation = (tagToToggle: string) => {
    setDetectedTags(prev => 
      prev.map(detectedTag => 
        detectedTag.tag === tagToToggle 
          ? { ...detectedTag, confirmed: !detectedTag.confirmed }
          : detectedTag
      )
    );
  };

  const removeTag = (tagToRemove: string) => {
    setDetectedTags(prev => prev.filter(tag => tag.tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get confirmed tags for storage
      const confirmedTags = detectedTags
        .filter(tag => tag.confirmed)
        .map(tag => tag.tag);

      const moodData = {
        user_id: user.id,
        date: today,
        mood,
        energy,
        wellness,
        journal_text: journalText.trim() || null,
        ai_detected_tags: confirmedTags.length > 0 ? confirmedTags : null,
      };

      const { error } = await supabase
        .from('mood_logs')
        .upsert(moodData, { onConflict: 'user_id,date' });

      if (error) {
        console.error('Error saving mood log:', error);
        toast.error('Failed to save your mood log');
        return;
      }

      const tagMessage = confirmedTags.length > 0 
        ? ` with ${confirmedTags.length} patterns detected 🏷️`
        : '';
      
      toast.success(`Thanks for logging! We'll use this to improve your monthly insights 🧠💚${tagMessage}`, {
        duration: 4000,
      });

      // Reset form
      setMood(5);
      setEnergy(5);
      setWellness(5);
      setJournalText('');
      setDetectedTags([]);
      setAiAnalysisResult(null);
      setExistingLog(null);
      onClose();
    } catch (error) {
      console.error('Error saving mood log:', error);
      toast.error('Failed to save your mood log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTagCategory = (tag: string): string => {
    const categories = {
      physical: ['headache', 'bloating', 'fatigue', 'nausea', 'joint_pain', 'muscle_tension', 'digestive_issues', 'skin_problems', 'dizziness', 'pain'],
      emotional: ['anxious', 'stressed', 'depressed', 'irritable', 'motivated', 'content', 'overwhelmed', 'focused', 'happy', 'sad', 'angry', 'grateful'],
      sleep: ['insomnia', 'restless_sleep', 'oversleeping', 'sleep_quality_poor', 'sleep_quality_good', 'tired', 'well_rested'],
      energy: ['energetic', 'sluggish', 'alert', 'brain_fog', 'lethargic', 'refreshed', 'burnt_out'],
      digestive: ['bloated', 'constipated', 'stomach_ache', 'acid_reflux', 'good_digestion', 'cramps', 'indigestion']
    };

    for (const [category, tags] of Object.entries(categories)) {
      if (tags.includes(tag)) return category;
    }
    return 'other';
  };

  const getCategoryColor = (category: string): string => {
    const colors = {
      physical: 'bg-red-100 text-red-700 border-red-200',
      emotional: 'bg-blue-100 text-blue-700 border-blue-200',
      sleep: 'bg-purple-100 text-purple-700 border-purple-200',
      energy: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      digestive: 'bg-green-100 text-green-700 border-green-200',
      other: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[category as keyof typeof colors] || colors.other;
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
                {isAnalyzing && (
                  <div className="flex items-center space-x-1 text-xs text-blue-600">
                    <Brain className="h-3 w-3" />
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>AI analyzing...</span>
                  </div>
                )}
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

          {/* AI Detected Tags */}
          {detectedTags.length > 0 && (
            <Card className="border-0 bg-white/50 dark:bg-black/20 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Brain className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Detected Patterns
                  </span>
                  {aiAnalysisResult && (
                    <Badge variant="outline" className="text-xs">
                      {aiAnalysisResult.source === 'ai' ? '🤖 AI' : '🔍 Keywords'}
                    </Badge>
                  )}
                </div>
                
                {aiAnalysisResult && !existingLog && (
                  <p className="text-xs text-gray-600 mb-3">
                    {aiAnalysisResult.message} • Tap to confirm relevant patterns
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {detectedTags.map((detectedTag) => {
                    const category = getTagCategory(detectedTag.tag);
                    const colorClass = getCategoryColor(category);
                    
                    return (
                      <div
                        key={detectedTag.tag}
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs ${colorClass} 
                          ${!detectedTag.confirmed && !existingLog ? 'opacity-60 cursor-pointer hover:opacity-100' : ''}`}
                        onClick={() => !existingLog && toggleTagConfirmation(detectedTag.tag)}
                      >
                        <span>{detectedTag.tag.replace(/_/g, ' ')}</span>
                        {existingLog ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTag(detectedTag.tag);
                            }}
                            className="hover:bg-red-200 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        ) : (
                          <div className="flex items-center">
                            {detectedTag.confirmed ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <div className="h-3 w-3 rounded border border-current opacity-50" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isAnalyzing}
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
