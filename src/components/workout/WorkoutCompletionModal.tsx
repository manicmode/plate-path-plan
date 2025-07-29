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
import { MotivationCard } from '@/components/analytics/MotivationCard';
import { CoachInsight } from './CoachInsight';
import { useLevelUp } from '@/contexts/LevelUpContext';

type DifficultyFeedback = 'too_easy' | 'just_right' | 'too_hard';

export const WorkoutCompletionModal = () => {
  const { isModalOpen, workoutData, hideCompletionModal } = useWorkoutCompletion();
  const { user } = useAuth();
  const { triggerLevelCheck } = useLevelUp();
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
      // Calculate additional performance metrics
      const completionRate = workoutData.setsCount > 0 ? 
        (workoutData.setsCount / (workoutData.exercisesCount * 3)) : 0; // Assume avg 3 sets per exercise
      
      const energyLevel = difficultyFeedback === 'too_easy' ? 5 : 
                         difficultyFeedback === 'just_right' ? 4 : 
                         difficultyFeedback === 'too_hard' ? 2 : 3;

      // Store workout completion details
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

      // Calculate performance score and award XP
      let performanceScore = 0;
      const wd = workoutData.workoutData as any; // Type assertion for JSON data
      
      if (workoutData.workoutType === 'ai_routine' && wd) {
        // Use calculate_performance_score function
        const completedSets = workoutData.setsCount;
        const totalSets = typeof wd?.totalSteps === 'number' ? wd.totalSteps : workoutData.setsCount;
        const completedExercises = workoutData.exercisesCount;
        const totalExercises = workoutData.exercisesCount;
        const skippedSteps = Math.max(0, totalSets - (typeof wd?.completedSteps === 'number' ? wd.completedSteps : workoutData.setsCount));
        
        const { data: scoreData } = await supabase.rpc('calculate_performance_score', {
          completed_sets: completedSets,
          total_sets: totalSets,
          completed_exercises: completedExercises,
          total_exercises: totalExercises,
          skipped_steps: skippedSteps,
          difficulty_rating: difficultyFeedback || 'just_right'
        });
        
        performanceScore = scoreData || 50; // Fallback score
      } else {
        // Calculate basic performance score for other workout types
        const completionRate = workoutData.setsCount > 0 ? 
          (workoutData.setsCount / (workoutData.exercisesCount * 3)) : 0;
        performanceScore = Math.round(completionRate * 70 + (energyLevel * 6));
      }

      // Award XP based on performance score
      try {
        await supabase.rpc('add_workout_xp', {
          p_user_id: user.id,
          p_routine_id: workoutData.workoutId || 'manual_workout',
          p_score: performanceScore,
          p_reason: 'Completed Workout'
        });

        // Trigger level check to see if user leveled up
        await triggerLevelCheck();

        console.log(`🎯 Awarded ${Math.floor(performanceScore)} XP for workout completion`);
      } catch (xpError) {
        console.error('Error awarding XP:', xpError);
        // Don't block the workflow if XP fails
      }

      // Store detailed performance log for AI adaptation analysis (AI routine workouts only)
      if (workoutData.workoutType === 'ai_routine' && workoutData.workoutData) {
        const wd = workoutData.workoutData as any; // Type assertion for JSON data
        
        const performanceData = {
          user_id: user.id,
          routine_id: wd?.routineId || 'current_routine',
          week_number: typeof wd?.week === 'number' ? wd.week : 1,
          day_number: typeof wd?.day === 'number' ? wd.day : 1,
          workout_title: typeof wd?.title === 'string' ? wd.title : 'AI Routine Workout',
          total_duration_minutes: workoutData.durationMinutes,
          planned_duration_minutes: 45, // Default planned duration
          completed_exercises_count: workoutData.exercisesCount,
          total_exercises_count: workoutData.exercisesCount,
          completed_sets_count: workoutData.setsCount,
          total_sets_count: typeof wd?.totalSteps === 'number' ? wd.totalSteps : workoutData.setsCount,
          skipped_steps_count: Math.max(0, (typeof wd?.totalSteps === 'number' ? wd.totalSteps : workoutData.setsCount) - (typeof wd?.completedSteps === 'number' ? wd.completedSteps : workoutData.setsCount)),
          extra_rest_seconds: Math.max(0, (workoutData.durationMinutes - 45) * 60), // Extra time beyond planned
          difficulty_rating: difficultyFeedback,
          energy_level: energyLevel,
          muscle_groups_worked: workoutData.musclesWorked,
          notes: journalEntry.trim() || null
        };

        const { error: performanceError } = await supabase
          .from('workout_performance_logs')
          .insert(performanceData);

        if (performanceError) {
          console.error('Error saving performance log:', performanceError);
        } else {
          // Trigger AI adaptation analysis for next workout
          try {
            console.log('🔄 Triggering workout adaptation analysis...');
            
            // Get current routine data for adaptation
            const { data: routineData } = await supabase
              .from('ai_routines')
              .select('routine_data, locked_days')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .single();

            if (routineData && routineData.routine_data) {
              const currentWeek = typeof wd?.week === 'number' ? wd.week : 1;
              const currentDay = typeof wd?.day === 'number' ? wd.day : 1;
              const nextDayNumber = (currentDay % 7) + 1;
              const nextWeekNumber = nextDayNumber === 1 ? currentWeek + 1 : currentWeek;
              
              // Get next workout data for adaptation analysis
              const nextWorkoutData = {
                week: nextWeekNumber,
                day: nextDayNumber,
                title: `Week ${nextWeekNumber} Day ${nextDayNumber}`,
                exercises: (routineData.routine_data as any)?.week?.[nextDayNumber - 1]?.exercises || []
              };

              // Call the adaptation analyzer
              const { data: adaptationResult } = await supabase.functions.invoke('workout-adaptation-analyzer', {
                body: {
                  performanceData,
                  routineId: 'current_routine',
                  weekNumber: currentWeek,
                  dayNumber: currentDay,
                  nextWorkoutData
                }
              });

              if (adaptationResult?.success) {
                console.log('✅ Workout adaptation analysis completed');
                
                // Show adaptation feedback
                toast({
                  title: "🧠 AI Coach Analysis Complete",
                  description: "Your next workout has been personalized based on today's performance!",
                  duration: 4000
                });
              }
            }
          } catch (adaptationError) {
            console.error('Error in adaptation analysis:', adaptationError);
            // Don't show error to user as this is a background process
          }
        }
      }

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

          {/* Coach Says Section */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-foreground">💬 Coach Says</h3>
            <MotivationCard className="border-0 shadow-none bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30" />
            
            {/* Future Adaptation Message for AI Routine Workouts */}
            {workoutData.workoutType === 'ai_routine' && difficultyFeedback && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-purple-800">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <span className="text-lg">🧠</span>
                  Your next workout will be automatically adapted based on today's performance.
                </p>
              </div>
            )}
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

          {/* Coach Insight Component */}
          <CoachInsight 
            workoutData={workoutData}
            difficultyFeedback={difficultyFeedback || undefined}
            show={!!difficultyFeedback}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};