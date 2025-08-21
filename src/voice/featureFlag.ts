// Feature flag management for Voice Coach
export const checkVoiceCoachEnabled = (): boolean => {
  // Environment kill switch
  const envEnabled = import.meta.env.VITE_VOICE_COACH_ENABLED !== 'false';
  
  // For now, simple feature flag - can be extended with remote config
  const remoteEnabled = true; // TODO: Add remote config check
  
  return envEnabled && remoteEnabled;
};

export const checkUserTier = (): boolean => {
  // For MVP, assume top tier for all authenticated users
  // TODO: Add actual plan tier checking from user profile
  return true;
};

// Legacy function - use useVoiceCoachFeatureFlag hook instead
export const isVoiceCoachAvailable = (): boolean => {
  return checkVoiceCoachEnabled() && checkUserTier();
};