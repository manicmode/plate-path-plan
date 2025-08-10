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

    // Soft gate: redirect only when not completed and not explicitly skipped
    if (isOnboardingComplete === false && onboardingSkipped !== true && !pathname.startsWith('/onboarding')) {
      navigate('/onboarding', {
        replace: true,
        state: { from: pathname + (location.search || '') },
      });
    }
  }, [isAuthenticated, isLoading, isOnboardingComplete, onboardingSkipped, location.pathname, location.search, navigate]);

  return <>{children}</>;
}
