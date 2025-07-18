// Tracker priority system and auto-fill utilities

export const TRACKER_PRIORITY = [
  'calories',      // Always first priority
  'protein',       // Second priority  
  'supplements',   // Third priority
  'hydration',     // Fourth priority
  'carbs',
  'fat', 
  'fiber',
  'micronutrients'
];

/**
 * Ensures exactly 3 trackers are selected by auto-filling missing ones based on priority
 * @param selectedTrackers - Array of currently selected tracker IDs
 * @returns Array of exactly 3 tracker IDs
 */
export const getAutoFilledTrackers = (selectedTrackers: string[]): string[] => {
  // Remove duplicates and invalid trackers
  const validSelectedTrackers = selectedTrackers.filter(tracker => 
    TRACKER_PRIORITY.includes(tracker)
  );

  if (validSelectedTrackers.length >= 3) {
    return validSelectedTrackers.slice(0, 3); // Keep only first 3
  }
  
  // Auto-fill missing trackers based on priority
  const autoFilled = [...validSelectedTrackers];
  
  for (const tracker of TRACKER_PRIORITY) {
    if (!autoFilled.includes(tracker)) {
      autoFilled.push(tracker);
      if (autoFilled.length === 3) break;
    }
  }
  
  return autoFilled;
};

/**
 * Checks if a tracker was auto-filled (not explicitly selected by user)
 * @param trackerId - The tracker to check
 * @param userSelectedTrackers - Trackers explicitly selected by user
 * @param finalTrackers - Final list of 3 trackers (including auto-filled)
 * @returns true if tracker was auto-filled
 */
export const isAutoFilledTracker = (
  trackerId: string, 
  userSelectedTrackers: string[], 
  finalTrackers: string[]
): boolean => {
  return finalTrackers.includes(trackerId) && !userSelectedTrackers.includes(trackerId);
};