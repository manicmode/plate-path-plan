import { TrackerKey } from '@/lib/trackers/trackerRegistry';
import { toast } from '@/hooks/use-toast';

export type HomeTrackers = [TrackerKey, TrackerKey, TrackerKey];

// Default trackers if none set
const DEFAULT_HOME_TRACKERS: HomeTrackers = ['calories', 'hydration', 'supplements'];

/**
 * Get current home trackers from localStorage
 */
export async function getHomeTrackers(): Promise<HomeTrackers> {
  try {
    // Try localStorage first (faster)
    const stored = localStorage.getItem('user_preferences');
    if (stored) {
      const prefs = JSON.parse(stored);
      if (prefs.selectedTrackers && Array.isArray(prefs.selectedTrackers) && prefs.selectedTrackers.length === 3) {
        return prefs.selectedTrackers as HomeTrackers;
      }
    }
  } catch (error) {
    console.warn('[UserPrefs] Failed to load trackers:', error);
  }

  return DEFAULT_HOME_TRACKERS;
}

/**
 * Safe setter for home tracker at specific index
 * Prevents duplicates and persists optimistically
 */
export async function setHomeTrackerAt(index: 0 | 1 | 2, key: TrackerKey): Promise<void> {
  const currentTrackers = await getHomeTrackers();
  
  // Prevent duplicates
  if (currentTrackers.includes(key)) {
    throw new Error(`Tracker already selected in another slot`);
  }

  // Create new array with swap
  const newTrackers = [...currentTrackers] as HomeTrackers;
  const oldKey = newTrackers[index];
  newTrackers[index] = key;

  // Optimistic update to localStorage
  const currentPrefs = JSON.parse(localStorage.getItem('user_preferences') || '{}');
  const newPrefs = {
    ...currentPrefs,
    selectedTrackers: newTrackers
  };
  
  try {
    localStorage.setItem('user_preferences', JSON.stringify(newPrefs));

    // Emit event for listeners
    window.dispatchEvent(new CustomEvent('homeTrackerChanged', {
      detail: { index, key, trackers: newTrackers }
    }));

    // Future: Add Supabase persistence here when the database column is available
    // For now, the optimistic update is sufficient
    
  } catch (error) {
    // Rollback on error
    const rollbackPrefs = {
      ...currentPrefs,
      selectedTrackers: currentTrackers
    };
    localStorage.setItem('user_preferences', JSON.stringify(rollbackPrefs));
    
    // Emit rollback event
    window.dispatchEvent(new CustomEvent('homeTrackerChanged', {
      detail: { index, key: oldKey, trackers: currentTrackers }
    }));

    console.error('[UserPrefs] setHomeTrackerAt failed:', error);
    throw error;
  }
}