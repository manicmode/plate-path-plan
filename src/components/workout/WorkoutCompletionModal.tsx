import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Share2, Zap, CheckCircle, Clock, Target, Flame } from 'lucide-react';
import { useWorkoutCompletion } from '@/contexts/WorkoutCompletionContext';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

type DifficultyFeedback = 'too_easy' | 'just_right' | 'too_hard';

export const WorkoutCompletionModal = () => {
  const { isModalOpen, workoutData, hideCompletionModal } = useWorkoutCompletion();
  const { user } = useAuth();
  const [difficultyFeedback, setDifficultyFeedback] = useState<DifficultyFeedback | null>(null);
  const [journalEntry, setJournalEntry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdjustPrompt, setShowAdjustPrompt] = useState(false);

  // Motivational messages pool
  const motivationalMessages = [
    "🔥 You're building discipline. Tomorrow will feel easier.",
    "💪 Every rep counts toward a stronger you!",
    "🌟 Consistency beats perfection. You showed up today!",
    "🚀 Your body is adapting. Keep pushing forward!",
    "⚡ You just proved to yourself that you can do hard things.",
    "🏆 Champions are made one workout at a time.",
    "💎 You're forging strength, inside and out.",
    "🎯 Today's effort is tomorrow's strength.",
    "🔋 You just invested in your future self.",
    "✨ Progress over perfection. You're crushing it!"
  ];

  const [motivationalMessage] = useState(() => 
    motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
  );

  // Optional: Play celebration sound (if browser supports it)
  useEffect(() => {
    if (isModalOpen && workoutData) {
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
      });

      // Optional: Play celebration sound (if browser supports it)
      try {
        const audioData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+vzzm8gBSRw5fTWgi0ELXbB7tWXRwwUVqLn6axbFgpGnt+';
        const audio = new Audio(audioData);
        audio.volume = 0.1; // Low volume
        audio.play().catch(() => {}); // Silently fail if not allowed
      } catch (error) {
        // Ignore audio errors
      }
    }
  }, [isModalOpen, workoutData]);

  const handleDifficultySelect = (feedback: DifficultyFeedback) => {
    setDifficultyFeedback(feedback);
    if (feedback === 'too_easy' || feedback === 'too_hard') {
      setShowAdjustPrompt(true);
    } else {
      setShowAdjustPrompt(false);
    }
  };

  const handleSubmit = async () => {
    if (!workoutData || !user?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('workout_completions')
        .insert({
          user_id: user.id,
          workout_id: workoutData.workoutId,
          workout_type: workoutData.workoutType,
          duration_minutes: workoutData.durationMinutes,
          exercises_count: workoutData.exercisesCount,
          sets_count: workoutData.setsCount,
          muscles_worked: workoutData.musclesWorked,
          difficulty_feedback: difficultyFeedback,
          journal_entry: journalEntry.trim() || null,
          motivational_message: motivationalMessage,
          workout_data: workoutData.workoutData || {}
        });

      if (error) throw error;

      toast({
        title: "🎉 Workout Complete!",
        description: "Your workout has been saved successfully.",
      });

      hideCompletionModal();
    } catch (error) {
      console.error('Error saving workout completion:', error);
      toast({
        title: "Error",
        description: "Failed to save workout. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!workoutData) return;

    const shareText = `💪 Just completed a ${workoutData.durationMinutes} minute workout!\n🎯 ${workoutData.exercisesCount} exercises, ${workoutData.setsCount} sets\n🔥 Worked: ${workoutData.musclesWorked.join(', ')}\n\n${motivationalMessage}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Workout Achievement',
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText);
        toast({
          title: "Shared!",
          description: "Workout summary copied to clipboard."
        });
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Shared!",
        description: "Workout summary copied to clipboard."
      });
    }
  };

  const handleAdjustWorkout = () => {
    // Future implementation: Navigate to AI routine preferences or workout adjustment
    toast({
      title: "🎯 Feedback Noted",
      description: "We'll adjust your future workouts based on this feedback!"
    });
    setShowAdjustPrompt(false);
  };

  if (!workoutData) return null;

  const getDifficultyButtonClass = (feedback: DifficultyFeedback) => {
    const baseClass = "flex-1 h-12 text-sm font-medium transition-all duration-200";
    const isSelected = difficultyFeedback === feedback;
    
    switch (feedback) {
      case 'too_easy':
        return `${baseClass} ${isSelected 
          ? 'bg-blue-500 text-white' 
          : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
        }`;
      case 'just_right':
        return `${baseClass} ${isSelected 
          ? 'bg-green-500 text-white' 
          : 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40'
        }`;
      case 'too_hard':
        return `${baseClass} ${isSelected 
          ? 'bg-orange-500 text-white' 
          : 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40'
        }`;
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto max-h-[95vh] overflow-y-auto bg-card border-border">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center animate-pulse">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            🏁 Workout Complete!
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            You crushed it! Here's your session recap
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Workout Recap */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Workout Recap
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium text-foreground">{workoutData.durationMinutes} min</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-muted-foreground">Exercises:</span>
                <span className="font-medium text-foreground">{workoutData.exercisesCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                <span className="text-muted-foreground">Sets:</span>
                <span className="font-medium text-foreground">{workoutData.setsCount}</span>
              </div>
            </div>

            {workoutData.musclesWorked.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Muscles Worked:</p>
                <div className="flex flex-wrap gap-1">
                  {workoutData.musclesWorked.map((muscle, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {muscle}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Feedback */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">How did this feel?</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => handleDifficultySelect('too_easy')}
                className={getDifficultyButtonClass('too_easy')}
                variant="outline"
              >
                Too Easy
              </Button>
              <Button
                onClick={() => handleDifficultySelect('just_right')}
                className={getDifficultyButtonClass('just_right')}
                variant="outline"
              >
                Just Right ✅
              </Button>
              <Button
                onClick={() => handleDifficultySelect('too_hard')}
                className={getDifficultyButtonClass('too_hard')}
                variant="outline"
              >
                Too Hard
              </Button>
            </div>

            {showAdjustPrompt && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  Would you like me to adjust your next workout?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdjustWorkout} className="bg-blue-500 hover:bg-blue-600">
                    Yes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAdjustPrompt(false)}>
                    No
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Journal Entry */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">💬 Quick Note (Optional)</h3>
            <Textarea
              placeholder="How are you feeling? Any thoughts about today's workout..."
              value={journalEntry}
              onChange={(e) => setJournalEntry(e.target.value)}
              className="min-h-[80px] bg-background border-border"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {journalEntry.length}/500
            </p>
          </div>

          {/* Motivational Message */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-center font-medium text-foreground">
              {motivationalMessage}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1 flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share this win
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Complete 🎉'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};