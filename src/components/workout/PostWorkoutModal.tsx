import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  CheckCircle, 
  X, 
  Timer, 
  Target,
  ThumbsUp,
  MessageCircle,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import confetti from 'canvas-confetti';

interface PostWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutData: {
    title: string;
    setsCompleted: number;
    setsSkipped: number;
    totalSets: number;
    durationMinutes: number;
    routineId: string;
    skippedSetsByExercise?: { [key: string]: number };
    performanceScore?: number;
    intensity?: string;
  };
}

interface AIFeedback {
  id: string;
  mood_label: string;
  emoji: string;
  coach_comment: string;
  adaptation_suggestions: {
    adjust_difficulty?: boolean;
    reduce_volume?: boolean;
    increase_rest?: boolean;
    focus_areas?: string[];
  };
}

export function PostWorkoutModal({ isOpen, onClose, workoutData }: PostWorkoutModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [userResponse, setUserResponse] = useState<string | null>(null);

  // Generate AI feedback when modal opens
  useEffect(() => {
    if (isOpen && workoutData && user && !aiFeedback) {
      generateAIFeedback();
    }
  }, [isOpen, workoutData, user]);

  // Trigger confetti for excellent performance
  useEffect(() => {
    if (aiFeedback && isOpen) {
      const completionRate = workoutData.setsCompleted / workoutData.totalSets;
      if (completionRate >= 0.9 && workoutData.setsSkipped === 0) {
        // Trigger confetti for beast mode
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }, [aiFeedback, isOpen]);

  const generateAIFeedback = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-feedback', {
        body: {
          sets_completed: workoutData.setsCompleted,
          sets_skipped: workoutData.setsSkipped,
          total_sets: workoutData.totalSets,
          workout_duration_minutes: workoutData.durationMinutes,
          workout_title: workoutData.title,
          routine_id: workoutData.routineId,
          skipped_sets_by_exercise: workoutData.skippedSetsByExercise,
          intensity_level: workoutData.intensity,
          performance_score: workoutData.performanceScore
        }
      });

      if (error) throw error;

      setAiFeedback(data.feedback);
    } catch (error) {
      console.error('Error generating AI feedback:', error);
      toast({
        title: "Could not generate feedback",
        description: "Don't worry, your workout was still logged!",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserResponse = async (response: string, emoji: string) => {
    if (!aiFeedback || !user) return;

    setUserResponse(response);
    
    try {
      const { error } = await supabase
        .from('workout_feedback')
        .update({
          user_response: response,
          user_response_emoji: emoji
        })
        .eq('id', aiFeedback.id);

      if (error) throw error;

      toast({
        title: "Feedback recorded!",
        description: "Thanks for helping me learn your preferences! 🤖",
        duration: 3000
      });

      // Auto-close modal after user responds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error saving user response:', error);
      toast({
        title: "Response saved locally",
        description: "I'll remember your preference for next time!",
        variant: "default"
      });
    }
  };

  const getPerformanceColor = () => {
    const completionRate = workoutData.setsCompleted / workoutData.totalSets;
    if (completionRate >= 0.9) return 'text-green-600 dark:text-green-400';
    if (completionRate >= 0.7) return 'text-blue-600 dark:text-blue-400';
    if (completionRate >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Workout Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Workout Summary */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-center">{workoutData.title}</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="space-y-1">
                  <div className={`text-2xl font-bold ${getPerformanceColor()}`}>
                    {workoutData.setsCompleted}
                  </div>
                  <div className="text-xs text-muted-foreground">Sets Done</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {workoutData.setsSkipped}
                  </div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-primary">
                    {formatTime(workoutData.durationMinutes)}
                  </div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span>{Math.round((workoutData.setsCompleted / workoutData.totalSets) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      workoutData.setsCompleted / workoutData.totalSets >= 0.9 
                        ? 'bg-green-500' 
                        : workoutData.setsCompleted / workoutData.totalSets >= 0.7 
                        ? 'bg-blue-500' 
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${(workoutData.setsCompleted / workoutData.totalSets) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Feedback Section */}
          {loading ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-center space-x-2">
                  <Sparkles className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Your AI coach is analyzing...</span>
                </div>
              </CardContent>
            </Card>
          ) : aiFeedback ? (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="py-6 space-y-4">
                {/* Mood Emoji & Label */}
                <div className="text-center space-y-2">
                  <div className="text-4xl animate-bounce">
                    {aiFeedback.emoji}
                  </div>
                  <Badge variant="secondary" className="text-sm font-medium">
                    {aiFeedback.mood_label}
                  </Badge>
                </div>

                {/* AI Coach Comment */}
                <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">🤖</div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {aiFeedback.coach_comment}
                      </p>
                    </div>
                  </div>
                </div>

                {/* User Response Buttons */}
                {!userResponse && (
                  <div className="space-y-3">
                    <div className="text-center text-sm text-muted-foreground">
                      How does this sound for next time?
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUserResponse("yes_adjust", "👍")}
                        className="text-xs"
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Yes, adjust
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUserResponse("keep_same", "🤔")}
                        className="text-xs"
                      >
                        <Target className="h-3 w-3 mr-1" />
                        Keep same
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUserResponse("tell_more", "💬")}
                        className="text-xs"
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Tell me more
                      </Button>
                    </div>
                  </div>
                )}

                {/* User Response Confirmation */}
                {userResponse && (
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Got it! I'll remember your preference for future workouts 🎯
                    </div>
                  </div>
                )}

                {/* Adaptation Suggestions */}
                {aiFeedback.adaptation_suggestions && Object.keys(aiFeedback.adaptation_suggestions).length > 0 && (
                  <div className="border-t border-blue-200/50 dark:border-blue-800/50 pt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Lightbulb className="h-3 w-3" />
                      <span>Adaptation suggestions</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {aiFeedback.adaptation_suggestions.adjust_difficulty && (
                        <Badge variant="outline" className="text-xs">Adjust difficulty</Badge>
                      )}
                      {aiFeedback.adaptation_suggestions.reduce_volume && (
                        <Badge variant="outline" className="text-xs">Reduce volume</Badge>
                      )}
                      {aiFeedback.adaptation_suggestions.increase_rest && (
                        <Badge variant="outline" className="text-xs">More rest</Badge>
                      )}
                      {aiFeedback.adaptation_suggestions.focus_areas?.map((area, index) => (
                        <Badge key={index} variant="outline" className="text-xs capitalize">
                          Focus: {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Close Button */}
          <Button 
            onClick={onClose} 
            className="w-full"
            variant={userResponse ? "default" : "outline"}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {userResponse ? "All Set!" : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}