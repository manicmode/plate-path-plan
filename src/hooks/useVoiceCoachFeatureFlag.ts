import { useFeatureFlag } from './useFeatureFlag';
import { checkVoiceCoachEnabled, checkUserTier, isVoiceCoachAvailable } from '@/voice/featureFlag';

/**
 * Hook for checking Voice Coach feature availability
 * Combines database feature flags with environment and user tier checks
 */
export function useVoiceCoachFeatureFlag() {
  const { enabled: dbEnabled, loading } = useFeatureFlag('voice_coach_mvp');
  
  // Combine database flag with existing environment/tier checks
  const isAvailable = dbEnabled && checkVoiceCoachEnabled() && checkUserTier();
  const isFullyAvailable = isVoiceCoachAvailable() && dbEnabled;
  
  return {
    enabled: isAvailable,
    fullyAvailable: isFullyAvailable,
    loading,
    // Individual flag states for debugging
    dbEnabled,
    envEnabled: checkVoiceCoachEnabled(),
    tierEnabled: checkUserTier()
  };
}