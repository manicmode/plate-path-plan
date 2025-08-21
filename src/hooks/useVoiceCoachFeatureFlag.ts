import { useFeatureFlagOptimized } from './useFeatureFlagOptimized';
import { checkVoiceCoachEnabled, checkUserTier, isVoiceCoachAvailable } from '@/voice/featureFlag';

/**
 * Hook for checking Voice Coach feature availability
 * Uses SWR cache first, then falls back to existing checks
 */
export function useVoiceCoachFeatureFlag() {
  const { enabled: dbEnabled, loading } = useFeatureFlagOptimized('voice_coach_mvp');
  
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