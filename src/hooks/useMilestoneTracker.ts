import { useState, useEffect, useCallback, useRef } from 'react';
import { useBadges } from '@/contexts/BadgeContext';
import { useSound } from '@/hooks/useSound';

interface MilestoneState {
  lastCheckedNutritionStreak: number;
  lastCheckedHydrationStreak: number;
  lastCheckedSupplementStreak: number;
  recentMilestones: string[];
}

const MILESTONE_STORAGE_KEY = 'milestone_tracker_state';
const MILESTONE_EXPIRY_HOURS = 24; // Clear recent milestones after 24 hours

/**
 * Hook to track and play sounds for real milestone achievements
 * Only plays sounds when users hit new longest streaks or significant progress milestones
 */
export const useMilestoneTracker = () => {
  const { userStreaks } = useBadges();
  const { playProgressUpdate } = useSound();
  
  // Track which milestones have already triggered sounds (session-only)
  const triggeredSoundMilestones = useRef<string[]>([]);
  
  const [milestoneState, setMilestoneState] = useState<MilestoneState>(() => {
    try {
      const stored = localStorage.getItem(MILESTONE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Clear expired milestones
        const expiredTime = Date.now() - (MILESTONE_EXPIRY_HOURS * 60 * 60 * 1000);
        const validMilestones = parsed.recentMilestones?.filter((milestone: string) => {
          const timestamp = milestone.split('_').pop();
          return timestamp && parseInt(timestamp) > expiredTime;
        }) || [];
        
        return {
          ...parsed,
          recentMilestones: validMilestones
        };
      }
    } catch (error) {
      console.log('Error loading milestone state:', error);
    }
    
    return {
      lastCheckedNutritionStreak: 0,
      lastCheckedHydrationStreak: 0,
      lastCheckedSupplementStreak: 0,
      recentMilestones: []
    };
  });

  const checkForNewMilestones = useCallback(() => {
    if (!userStreaks) return;

    const currentNutrition = userStreaks.current_nutrition_streak || 0;
    const currentHydration = userStreaks.current_hydration_streak || 0;
    const currentSupplement = userStreaks.current_supplement_streak || 0;

    const newMilestones: string[] = [];
    const timestamp = Date.now();

    // Check for new longest streaks (these are the main milestones)
    if (currentNutrition > milestoneState.lastCheckedNutritionStreak && currentNutrition >= 3) {
      const milestoneKey = `nutrition_streak_${currentNutrition}_${timestamp}`;
      if (!milestoneState.recentMilestones.some(m => m.includes(`nutrition_streak_${currentNutrition}_`))) {
        newMilestones.push(milestoneKey);
      }
    }

    if (currentHydration > milestoneState.lastCheckedHydrationStreak && currentHydration >= 3) {
      const milestoneKey = `hydration_streak_${currentHydration}_${timestamp}`;
      if (!milestoneState.recentMilestones.some(m => m.includes(`hydration_streak_${currentHydration}_`))) {
        newMilestones.push(milestoneKey);
      }
    }

    if (currentSupplement > milestoneState.lastCheckedSupplementStreak && currentSupplement >= 3) {
      const milestoneKey = `supplement_streak_${currentSupplement}_${timestamp}`;
      if (!milestoneState.recentMilestones.some(m => m.includes(`supplement_streak_${currentSupplement}_`))) {
        newMilestones.push(milestoneKey);
      }
    }

    // If we have new milestones, check if sound should be played and update state
    if (newMilestones.length > 0) {
      // Check if any of these milestones are truly new (haven't triggered sound before)
      const milestonesNeedingSound = newMilestones.filter(milestone => {
        const milestoneKey = milestone.split('_').slice(0, 3).join('_'); // e.g., "nutrition_streak_5"
        return !triggeredSoundMilestones.current.includes(milestoneKey);
      });

      // Only play sound if there are milestones that haven't triggered sound before
      if (milestonesNeedingSound.length > 0) {
        const milestoneIds = milestonesNeedingSound.map(milestone => milestone.split('_').slice(0, 3).join('_'));
        console.log("✅ New milestone hit, playing sound:", milestoneIds);
        playProgressUpdate();
        
        // Add to triggered sound milestones (session-only)
        triggeredSoundMilestones.current = [...triggeredSoundMilestones.current, ...milestoneIds];
      }
      
      const newState = {
        lastCheckedNutritionStreak: Math.max(currentNutrition, milestoneState.lastCheckedNutritionStreak),
        lastCheckedHydrationStreak: Math.max(currentHydration, milestoneState.lastCheckedHydrationStreak),
        lastCheckedSupplementStreak: Math.max(currentSupplement, milestoneState.lastCheckedSupplementStreak),
        recentMilestones: [...milestoneState.recentMilestones, ...newMilestones]
      };

      setMilestoneState(newState);
      localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify(newState));
    }
  }, [userStreaks, milestoneState, playProgressUpdate]);

  // Check for milestones when streak data changes
  useEffect(() => {
    checkForNewMilestones();
  }, [checkForNewMilestones]);

  return {
    checkForNewMilestones,
    hasRecentMilestone: milestoneState.recentMilestones.length > 0
  };
};