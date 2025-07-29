import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface WorkoutAdaptation {
  id: string;
  user_id: string;
  routine_id: string;
  week_number: number;
  day_number: number;
  original_workout_data: any;
  adapted_workout_data: any;
  performance_metrics: any;
  adaptation_reasons: any;
  ai_coach_feedback: string | null;
  adaptation_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdaptationBadge {
  text: string;
  type: 'increase' | 'decrease' | 'rest' | 'maintain' | 'adaptation';
  icon?: string;
}

export const useWorkoutAdaptations = (routineId?: string) => {
  const { user } = useAuth();
  const [adaptations, setAdaptations] = useState<WorkoutAdaptation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && routineId) {
      loadAdaptations();
    }
  }, [user, routineId]);

  const loadAdaptations = async () => {
    if (!user || !routineId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('workout_adaptations')
        .select('*')
        .eq('user_id', user.id)
        .eq('routine_id', routineId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading adaptations:', error);
        return;
      }

      setAdaptations((data as WorkoutAdaptation[]) || []);
    } catch (error) {
      console.error('Error loading adaptations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAdaptationForDay = (week: number, day: number): WorkoutAdaptation | null => {
    return adaptations.find(
      adaptation => 
        adaptation.week_number === week && 
        adaptation.day_number === day &&
        adaptation.is_active
    ) || null;
  };

  const getAdaptationBadge = (adaptationType: string): AdaptationBadge => {
    switch (adaptationType) {
      case 'increase_intensity':
        return {
          text: '🔥 Boosted Intensity',
          type: 'increase',
          icon: '🔥'
        };
      case 'decrease_difficulty':
        return {
          text: '💡 Adjusted for Performance',
          type: 'decrease',
          icon: '💡'
        };
      case 'adjust_rest':
        return {
          text: '⏱️ Extra Recovery Time',
          type: 'rest',
          icon: '⏱️'
        };
      case 'maintain_current':
        return {
          text: '✅ Stay the Course',
          type: 'maintain',
          icon: '✅'
        };
      default:
        return {
          text: '🧠 AI Optimized',
          type: 'adaptation',
          icon: '🧠'
        };
    }
  };

  const getBadgeStyle = (type: AdaptationBadge['type']): string => {
    switch (type) {
      case 'increase':
        return 'bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-950/30 dark:to-red-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'decrease':
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'rest':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'maintain':
        return 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-950/30 dark:to-slate-950/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
      default:
        return 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
  };

  const hasRecentAdaptations = (): boolean => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return adaptations.some(adaptation => 
      new Date(adaptation.created_at) >= threeDaysAgo
    );
  };

  const getAdaptationTip = (adaptation: WorkoutAdaptation): string => {
    if (adaptation.ai_coach_feedback) {
      return adaptation.ai_coach_feedback;
    }

    // Fallback tips based on adaptation type
    switch (adaptation.adaptation_type) {
      case 'increase_intensity':
        return "Great progress! We've increased the intensity based on your strong performance.";
      case 'decrease_difficulty':
        return "We've adjusted the difficulty to help you build strength progressively.";
      case 'adjust_rest':
        return "Added extra recovery time to optimize your performance and reduce fatigue.";
      case 'maintain_current':
        return "Your current intensity level is perfect - keep up the excellent work!";
      default:
        return "Your workout has been personalized based on your recent performance.";
    }
  };

  return {
    adaptations,
    isLoading,
    getAdaptationForDay,
    getAdaptationBadge,
    getBadgeStyle,
    hasRecentAdaptations,
    getAdaptationTip,
    refreshAdaptations: loadAdaptations
  };
};