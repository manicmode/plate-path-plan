import { ReactNode, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { Skeleton } from '@/components/ui/skeleton';

interface OnboardingGateProps {
  children: ReactNode;
}

const isBypassedRoute = (pathname: string) => {
  if (!pathname) return false;
  return (
    pathname.startsWith('/onboarding') ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/') ||
    pathname === '/reset-password' ||
    pathname === '/magic-link' ||
    pathname === '/verify' ||
    pathname === '/privacy' ||
    pathname === '/terms'
  );
};

const GateLoading = () => (
  <div className="p-4">
    <Skeleton className="h-5 w-28" />
  </div>
);

export default function OnboardingGate({ children }: OnboardingGateProps) {
  const { isAuthenticated } = useAuth();
  const { isOnboardingComplete, isLoading } = useOnboardingStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);

  const pathname = location.pathname || '';
  const loading = isLoading;
  const completed = isOnboardingComplete === true;
  const bypassed = isBypassedRoute(pathname);

  try {
    if ((import.meta as any)?.env?.MODE !== 'production') {
      console.info('[GATE]', { path: pathname, loading, completed });
    }
  } catch {}


  useEffect(() => {
    if (hasRedirectedRef.current) return;
    if (!isAuthenticated) return;
    if (loading) return;

    if (!completed && !bypassed) {
      hasRedirectedRef.current = true;
      navigate('/onboarding', {
        replace: true,
        state: { from: pathname + (location.search || '') },
      });
    }
  }, [isAuthenticated, loading, completed, bypassed, pathname, location.search, navigate]);


  if (loading) {
    return <GateLoading />;
  }

  if (completed || bypassed) {
    return <>{children}</>;
  }

  // Not completed and not bypassed - effect will redirect
  return <GateLoading />;
}

