import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface OnboardingGateProps {
  children: ReactNode;
}

export default function OnboardingGate({ children }: OnboardingGateProps) {
  const { isAuthenticated } = useAuth();
  const { isOnboardingComplete, isLoading } = useOnboardingStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only guard authenticated users
    if (!isAuthenticated) return;
    // Wait for onboarding status to resolve
    if (isLoading) return;

    const pathname = location.pathname || '';

    // If onboarding is incomplete, redirect to /onboarding from anywhere except onboarding itself
    if (isOnboardingComplete === false && !pathname.startsWith('/onboarding')) {
      navigate('/onboarding', {
        replace: true,
        state: { from: pathname + (location.search || '') },
      });
    }
  }, [isAuthenticated, isLoading, isOnboardingComplete, location.pathname, location.search, navigate]);

  return <>{children}</>;
}
