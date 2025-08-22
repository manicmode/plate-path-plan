import { useFeatureFlagOptimized } from '@/hooks/useFeatureFlagOptimized';
import { useAdminRole } from '@/hooks/useAdminRole';

/**
 * Hook to determine if voice coach features are allowed for the current user.
 * 
 * Voice coach is allowed if:
 * - Kill switch is OFF (voice_coach_disabled = false)
 * - AND (user is admin OR MVP is enabled)
 */
export function useVoiceCoachAllowed() {
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { enabled: mvpEnabled } = useFeatureFlagOptimized("voice_coach_mvp");
  const { isAdmin } = useAdminRole();
  
  // Voice coach is allowed if kill switch is off AND (user is admin OR MVP is enabled)
  const allowed = !killSwitchDisabled && (isAdmin || mvpEnabled);
  
  return allowed;
}