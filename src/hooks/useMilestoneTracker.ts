import { useEffect, useRef } from 'react';
import { useBadges } from '@/contexts/BadgeContext';
import { useSound } from '@/hooks/useSound';

interface MilestoneState {
  lastCheckedNutritionStreak: number;
  lastCheckedHydrationStreak: number;
  lastCheckedSupplementStreak: number;
  recentMilestones: string[];
  lastSoundTriggeredFor: string[]; // Track which milestones already triggered sounds
}

const MILESTONE_STORAGE_KEY = 'milestone_tracker_state';
const MILESTONE_EXPIRY_HOURS = 24; // Clear recent milestones after 24 hours

// Initialize milestone state from localStorage
const initializeMilestoneState = (): MilestoneState => {
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
        recentMilestones: validMilestones,
        lastSoundTriggeredFor: parsed.lastSoundTriggeredFor || []
      };
    }
  } catch (error) {
    console.log('Error loading milestone state:', error);
  }
  
  return {
    lastCheckedNutritionStreak: 0,
    lastCheckedHydrationStreak: 0,
    lastCheckedSupplementStreak: 0,
    recentMilestones: [],
    lastSoundTriggeredFor: []
  };
};

/**
 * Hook to track and play sounds for real milestone achievements
 * Only plays sounds when users hit new longest streaks or significant progress milestones
 */
export const useMilestoneTracker = () => {
  const { userStreaks } = useBadges();
  const { playProgressUpdate } = useSound();
  
  // Use useRef to persist milestone state across renders without causing re-renders
  const milestoneStateRef = useRef<MilestoneState>(initializeMilestoneState());
  const lastUserStreaksRef = useRef<typeof userStreaks>(null);

  // Standalone function that doesn't depend on React state
  const checkForNewMilestones = () => {
    if (!userStreaks) {
      console.log("❌ No userStreaks data available for milestone check");
      return;
    }

    const currentNutrition = userStreaks.current_nutrition_streak || 0;
    const currentHydration = userStreaks.current_hydration_streak || 0;
    const currentSupplement = userStreaks.current_supplement_streak || 0;

    const newMilestones: string[] = [];
    const timestamp = Date.now();
    const currentState = milestoneStateRef.current;

    // Check for new longest streaks (these are the main milestones)
    if (currentNutrition > currentState.lastCheckedNutritionStreak && currentNutrition >= 3) {
      const milestoneKey = `nutrition_streak_${currentNutrition}_${timestamp}`;
      if (!currentState.recentMilestones.some(m => m.includes(`nutrition_streak_${currentNutrition}_`))) {
        newMilestones.push(milestoneKey);
      }
    }

    if (currentHydration > currentState.lastCheckedHydrationStreak && currentHydration >= 3) {
      const milestoneKey = `hydration_streak_${currentHydration}_${timestamp}`;
      if (!currentState.recentMilestones.some(m => m.includes(`hydration_streak_${currentHydration}_`))) {
        newMilestones.push(milestoneKey);
      }
    }

    if (currentSupplement > currentState.lastCheckedSupplementStreak && currentSupplement >= 3) {
      const milestoneKey = `supplement_streak_${currentSupplement}_${timestamp}`;
      if (!currentState.recentMilestones.some(m => m.includes(`supplement_streak_${currentSupplement}_`))) {
        newMilestones.push(milestoneKey);
      }
    }

    // If we have new milestones, check if sound should be played and update state
    if (newMilestones.length > 0) {
      // Check if any of these milestones are truly new (haven't triggered sound before)
      const milestonesNeedingSound = newMilestones.filter(milestone => {
        const milestoneKey = milestone.split('_').slice(0, 3).join('_'); // e.g., "nutrition_streak_5"
        return !currentState.lastSoundTriggeredFor.includes(milestoneKey);
      });

      if (milestonesNeedingSound.length > 0) {
        const milestoneIds = milestonesNeedingSound.map(m => m.split('_').slice(0, 3).join('_'));
        console.log("✅ Milestone sound should now be fixed - playing for:", milestoneIds);
        playProgressUpdate();
        
        // Update the ref state
        const newState = {
          lastCheckedNutritionStreak: Math.max(currentNutrition, currentState.lastCheckedNutritionStreak),
          lastCheckedHydrationStreak: Math.max(currentHydration, currentState.lastCheckedHydrationStreak),
          lastCheckedSupplementStreak: Math.max(currentSupplement, currentState.lastCheckedSupplementStreak),
          recentMilestones: [...currentState.recentMilestones, ...newMilestones],
          lastSoundTriggeredFor: [
            ...currentState.lastSoundTriggeredFor,
            ...milestoneIds
          ]
        };

        milestoneStateRef.current = newState;
        localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify(newState));
      } else {
        console.log("❌ Sound not played - milestone already triggered for:", newMilestones.map(m => m.split('_').slice(0, 3).join('_')));
      }
    } else {
      console.log("❌ Sound not played - no new milestones detected");
    }
  };

  // Only check for milestones when userStreaks actually changes
  useEffect(() => {
    // Only run if userStreaks has actually changed (not just on mount)
    if (userStreaks && userStreaks !== lastUserStreaksRef.current) {
      console.log("🔍 useMilestoneTracker: UserStreaks changed, checking for new milestones...");
      lastUserStreaksRef.current = userStreaks;
      checkForNewMilestones();
    } else if (userStreaks) {
      console.log("🔇 useMilestoneTracker: UserStreaks unchanged, skipping milestone check (no sound)");
    }
  }, [userStreaks]);

  return {
    checkForNewMilestones,
    hasRecentMilestone: milestoneStateRef.current.recentMilestones.length > 0
  };
};