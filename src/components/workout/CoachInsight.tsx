import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface CoachInsightProps {
  workoutData: {
    workoutType: string;
    durationMinutes: number;
    exercisesCount: number;
    setsCount: number;
    workoutData?: {
      week?: number;
      day?: number;
      routineId?: string;
      completedSteps?: number;
      totalSteps?: number;
    };
  };
  difficultyFeedback?: string;
  show: boolean;
}

interface PerformanceData {
  completed_sets_count: number;
  total_sets_count: number;
  completed_exercises_count: number;
  total_exercises_count: number;
  skipped_steps_count: number;
  difficulty_rating: string;
  performance_score: number;
}

interface AdaptationData {
  adaptation_type: string;
  ai_coach_feedback: string;
}

export const CoachInsight: React.FC<CoachInsightProps> = ({ 
  workoutData, 
  difficultyFeedback, 
  show 
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (show && user?.id) {
      loadCoachInsight();
    }
  }, [show, user?.id, workoutData, difficultyFeedback]);

  const loadCoachInsight = async () => {
    setIsTyping(true);
    setShowMessage(false);

    try {
      let performanceData: PerformanceData | null = null;
      let adaptationData: AdaptationData | null = null;

      // For AI routine workouts, fetch performance and adaptation data
      if (workoutData.workoutType === 'ai_routine' && workoutData.workoutData) {
        const { week, day, routineId } = workoutData.workoutData;

        // Fetch latest performance log
        const { data: perfData } = await supabase
          .from('workout_performance_logs')
          .select('*')
          .eq('user_id', user!.id)
          .eq('routine_id', routineId || 'current_routine')
          .eq('week_number', week || 1)
          .eq('day_number', day || 1)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (perfData) {
          performanceData = perfData as PerformanceData;
        }

        // Fetch adaptation data for next workout (if exists)
        const nextDay = ((day || 1) % 7) + 1;
        const nextWeek = nextDay === 1 ? (week || 1) + 1 : (week || 1);

        const { data: adaptData } = await supabase
          .from('workout_adaptations')
          .select('adaptation_type, ai_coach_feedback')
          .eq('user_id', user!.id)
          .eq('routine_id', routineId || 'current_routine')
          .eq('week_number', nextWeek)
          .eq('day_number', nextDay)
          .eq('is_active', true)
          .single();

        if (adaptData) {
          adaptationData = adaptData as AdaptationData;
        }
      }

      // Generate coach message
      const coachMessage = generateCoachMessage(performanceData, adaptationData, difficultyFeedback);
      
      // Simulate typing delay
      setTimeout(() => {
        setIsTyping(false);
        setMessage(coachMessage);
        setShowMessage(true);
      }, 1500);

    } catch (error) {
      console.error('Error loading coach insight:', error);
      
      // Fallback message
      setTimeout(() => {
        setIsTyping(false);
        setMessage("Great job today! Every rep counts. I'll review your performance and tune your plan accordingly. 💪");
        setShowMessage(true);
      }, 1500);
    }
  };

  const generateCoachMessage = (
    performanceData: PerformanceData | null,
    adaptationData: AdaptationData | null,
    difficulty?: string
  ): string => {
    // If we have adaptation data with AI feedback, use it
    if (adaptationData?.ai_coach_feedback) {
      return adaptationData.ai_coach_feedback;
    }

    // Generate message based on performance and adaptation
    if (performanceData && adaptationData) {
      const completionRate = Math.round((performanceData.completed_sets_count / Math.max(1, performanceData.total_sets_count)) * 100);
      const exerciseCount = performanceData.completed_exercises_count;
      const skippedSteps = performanceData.skipped_steps_count;

      switch (adaptationData.adaptation_type) {
        case 'increase_intensity':
          return `🔥 You nailed ${exerciseCount} exercises with ${completionRate}% completion and only ${skippedSteps} skips. I've upped the intensity for next time. Let's grow!`;
        
        case 'decrease_difficulty':
          if (difficulty === 'too_hard' || skippedSteps > 2) {
            return `💤 You marked today as challenging and skipped ${skippedSteps} sets. I've adjusted your rest time and reduced difficulty. Progress over perfection!`;
          }
          return `💡 I've fine-tuned your next workout based on today's ${completionRate}% completion. We're building sustainable strength!`;
        
        case 'adjust_rest':
          return `⏱️ Solid ${completionRate}% completion rate! I've optimized your rest periods for better recovery. You're getting stronger every day!`;
        
        case 'maintain_current':
          return `🧠 You completed everything smoothly with ${completionRate}% success rate. No changes for now — just keep going strong!`;
        
        default:
          return `✨ ${exerciseCount} exercises completed with ${completionRate}% success! I've personalized your next session based on today's performance.`;
      }
    }

    // Performance-only message
    if (performanceData) {
      const completionRate = Math.round((performanceData.completed_sets_count / Math.max(1, performanceData.total_sets_count)) * 100);
      const score = performanceData.performance_score || 0;

      if (score >= 90) {
        return `🔥 Outstanding ${completionRate}% completion rate! You're crushing your goals. I'm analyzing this performance to level up your training!`;
      } else if (score >= 70) {
        return `💪 Solid ${completionRate}% completion today! Consistency is key. I'll fine-tune your next workout based on this effort.`;
      } else {
        return `🌱 ${completionRate}% completion is progress! Every rep builds strength. I'm adjusting your plan for sustainable growth.`;
      }
    }

    // Difficulty-based fallback
    if (difficulty) {
      switch (difficulty) {
        case 'too_easy':
          return `🚀 Too easy, you say? I love that energy! I'll bump up the challenge next time. Let's push those limits!`;
        case 'too_hard':
          return `🤗 Tough workout today? That's how we grow! I'll dial it back slightly so you can build momentum. You've got this!`;
        case 'just_right':
          return `✅ Perfect intensity! You're in the sweet spot. I'll keep this momentum going for your next session. Keep crushing it!`;
        default:
          return `💫 Great effort today! I'm analyzing your performance patterns to create the perfect next workout. Stay strong!`;
      }
    }

    // Ultimate fallback
    return `🎯 Great job today! Every rep counts. I'll review your performance and tune your plan accordingly. Consistency builds champions!`;
  };

  if (!show) return null;

  return (
    <div className={`transition-all duration-500 ${showMessage ? 'animate-fade-in' : ''}`}>
      <Card className="mt-4 border-primary/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* AI Coach Avatar */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Coach Insight
                </Badge>
              </div>

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-sm ml-2">Coach is thinking...</span>
                </div>
              )}

              {/* Coach Message */}
              {showMessage && message && (
                <div className="bg-background/60 rounded-lg p-3 border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed">
                    {message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};