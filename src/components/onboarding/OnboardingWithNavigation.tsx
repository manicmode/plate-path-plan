import { useNavigate } from 'react-router-dom';
import { OnboardingScreen } from './OnboardingScreen';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface OnboardingWithNavigationProps {
  onComplete: () => Promise<void>;
}

export function OnboardingWithNavigation({ onComplete }: OnboardingWithNavigationProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { forceRefresh, setOnboardingSkippedLocal } = useOnboardingStatus();

  const handleComplete = async () => {
    console.log('[DEBUG] OnboardingWithNavigation: Starting completion process...');
    try {
      await onComplete();
      // Analytics (optional)
      try { (window as any).analytics?.track?.('onboarding_completed'); } catch {}
      console.log('[DEBUG] OnboardingWithNavigation: onComplete finished, navigating to /home...');
      // Force navigation with replace to prevent back navigation to onboarding
      navigate('/home', { replace: true });
      console.log('[DEBUG] OnboardingWithNavigation: Navigation to /home completed');
    } catch (error) {
      console.error('[DEBUG] OnboardingWithNavigation: Error during completion:', error);
    }
  };

  const handleSkip = () => {
    console.log('[onboarding] skip: click');

    // 1) Navigate immediately - no waiting for network operations
    console.log('[onboarding] skip: navigate(start)');
    navigate('/home', { replace: true });

    // 2) Do background updates without blocking UI
    queueMicrotask(async () => {
      try {
        // A) set a short-lived local bypass
        const nowTs = Date.now();
        localStorage.setItem('voyage_onboarding_bypass_ts', String(nowTs));
        (window as any).__voyageOnboardingBypass = nowTs;

        // B) optimistic update of onboard status cache
        setOnboardingSkippedLocal?.(true);

        // C) background upsert (onboarding_skipped=true, onboarding_completed=false, show_onboarding_reminder=true)
        if (user) {
          await supabase
            .from('user_profiles')
            .upsert(
              {
                user_id: user.id,
                onboarding_completed: false,
                onboarding_skipped: true,
                show_onboarding_reminder: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          
          // Analytics (optional)
          try { (window as any).analytics?.track?.('onboarding_skipped'); } catch {}
          
          // Kick a refetch, but don't block navigation on it
          forceRefresh?.().catch((err) => console.warn('[onboarding] skip: bg forceRefresh error', err));
        }
      } catch (error) {
        console.warn('[onboarding] skip: bg update failed', error);
      }
    });
  };

  return <OnboardingScreen onComplete={handleComplete} onSkip={handleSkip} />;
}
