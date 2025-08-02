import { useCoachInteractions, CoachType } from '@/hooks/useCoachInteractions';

// 🎮 Coach Gamification System
// Hook to track nudge actions for different coach types

export const useNudgeTracking = () => {
  const { trackInteraction } = useCoachInteractions();

  const trackNudgeAction = async (nudgeType: string, action: 'accept' | 'dismiss' = 'accept') => {
    // Map nudge types to coach types
    let coachType: CoachType;
    
    if (nudgeType.includes('meditation') || nudgeType.includes('mindfulness')) {
      coachType = 'nutrition'; // Meditation nudges go to nutrition coach
    } else if (nudgeType.includes('exercise') || nudgeType.includes('workout') || nudgeType.includes('fitness')) {
      coachType = 'exercise';
    } else if (nudgeType.includes('breathing') || nudgeType.includes('yoga') || nudgeType.includes('sleep') || nudgeType.includes('recovery') || nudgeType.includes('thermotherapy')) {
      coachType = 'recovery';
    } else {
      // Default fallback based on context
      coachType = 'nutrition';
    }

    if (action === 'accept') {
      await trackInteraction(coachType, 'nudge_action');
    }
  };

  return { trackNudgeAction };
};