import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface OnboardingGateProps {
  children: ReactNode;
}

export default function OnboardingGate({ children }: OnboardingGateProps) {
  const { isAuthenticated } = useAuth();
  const { isOnboardingComplete, isLoading, onboardingSkipped } = useOnboardingStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only guard authenticated users
    if (!isAuthenticated) return;
    // Wait for onboarding status to resolve
    if (isLoading) return;

    const pathname = location.pathname || '';

    // Compute temporary local bypass window
    const BYPASS_MS = 10_000;
    const ts = Number(localStorage.getItem('voyage_onboarding_bypass_ts') || 0);
    const winTs = (window as any).__voyageOnboardingBypass || 0;
    const bypassActive = Date.now() - Math.max(ts, winTs) < BYPASS_MS;

    console.log('[ONBOARD] Gate check', {
      isAuthenticated,
      isLoading,
      isOnboardingComplete,
      onboardingSkipped,
      bypassActive,
      pathname,
    });

    // Soft gate: redirect only when not completed and not explicitly skipped and no active bypass
    if (
      isOnboardingComplete === false &&
      onboardingSkipped !== true &&
      !bypassActive &&
      !pathname.startsWith('/onboarding')
    ) {
      console.log('[ONBOARD] Redirecting to /onboarding');
      navigate('/onboarding', {
        replace: true,
        state: { from: pathname + (location.search || '') },
      });
    }
  }, [isAuthenticated, isLoading, isOnboardingComplete, onboardingSkipped, location.pathname, location.search, navigate]);

  // Clear bypass once onboarding is complete or explicitly skipped
  useEffect(() => {
    if (isOnboardingComplete || onboardingSkipped) {
      try {
        localStorage.removeItem('voyage_onboarding_bypass_ts');
        (window as any).__voyageOnboardingBypass = 0;
        console.log('[ONBOARD] Cleared onboarding bypass');
      } catch {}
    }
  }, [isOnboardingComplete, onboardingSkipped]);

  return <>{children}</>;
}
