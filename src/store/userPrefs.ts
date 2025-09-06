import { TrackerKey } from '@/lib/trackers/trackerRegistry';
import { toast } from '@/hooks/use-toast';

export type HomeTrackers = [TrackerKey, TrackerKey, TrackerKey];

// Default trackers if none set
const DEFAULT_HOME_TRACKERS: HomeTrackers = ['calories', 'hydration', 'supplements'];

// Diagnostics flag
const DIAG_ENABLED = import.meta.env.VITE_TRACKER_QUICKSWAP_DIAG === 'true';

/**
 * Get current home trackers from localStorage (sync version)
 */
export function getHomeTrackers(): HomeTrackers {
  try {
    // Try localStorage first (faster)
    const stored = localStorage.getItem('user_preferences');
    if (stored) {
      const prefs = JSON.parse(stored);
      if (prefs.selectedTrackers && Array.isArray(prefs.selectedTrackers) && prefs.selectedTrackers.length === 3) {
        const trackers = prefs.selectedTrackers as HomeTrackers;
        if (DIAG_ENABLED) {
          console.debug('[UserPrefs] getHomeTrackers', trackers);
        }
        return trackers;
      }
    }
  } catch (error) {
    console.warn('[UserPrefs] Failed to load trackers:', error);
  }

  if (DIAG_ENABLED) {
    console.debug('[UserPrefs] getHomeTrackers (default)', DEFAULT_HOME_TRACKERS);
  }
  return DEFAULT_HOME_TRACKERS;
}

/**
 * Validate and set complete home trackers array
 * Prevents duplicates and persists optimistically
 */
export async function setHomeTrackers(next: HomeTrackers): Promise<void> {
  // Validate length
  if (!Array.isArray(next) || next.length !== 3) {
    throw new Error('Home trackers must be exactly 3 items');
  }

  // Validate no duplicates
  const unique = new Set(next);
  if (unique.size !== 3) {
    throw new Error('Home trackers cannot contain duplicates');
  }

  if (DIAG_ENABLED) {
    console.debug('[UserPrefs] setHomeTrackers', next);
  }

  const currentTrackers = getHomeTrackers();
  
  // Optimistic update to localStorage
  const currentPrefs = JSON.parse(localStorage.getItem('user_preferences') || '{}');
  const newPrefs = {
    ...currentPrefs,
    selectedTrackers: next
  };
  
  try {
    localStorage.setItem('user_preferences', JSON.stringify(newPrefs));

    // Emit event for listeners
    window.dispatchEvent(new CustomEvent('homeTrackerChanged', {
      detail: { trackers: next }
    }));

    // Future: Add Supabase persistence here when the database column is available
    
  } catch (error) {
    // Rollback on error
    const rollbackPrefs = {
      ...currentPrefs,
      selectedTrackers: currentTrackers
    };
    localStorage.setItem('user_preferences', JSON.stringify(rollbackPrefs));
    
    // Emit rollback event
    window.dispatchEvent(new CustomEvent('homeTrackerChanged', {
      detail: { trackers: currentTrackers }
    }));

    console.error('[UserPrefs] setHomeTrackers failed:', error);
    throw error;
  }
}

/**
 * Safe setter for home tracker at specific index
 * Prevents duplicates and persists optimistically
 */
export async function setHomeTrackerAt(index: 0 | 1 | 2, key: TrackerKey): Promise<void> {
  const currentTrackers = getHomeTrackers();
  
  // Prevent duplicates
  if (currentTrackers.includes(key)) {
    throw new Error(`Tracker already selected in another slot`);
  }

  // Create new array with swap
  const newTrackers = [...currentTrackers] as HomeTrackers;
  newTrackers[index] = key;

  // Use the main setter for consistency
  await setHomeTrackers(newTrackers);
}