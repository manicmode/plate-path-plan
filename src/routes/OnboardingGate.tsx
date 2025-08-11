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
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);

  const pathname = location.pathname || '';
  const loading = Boolean(authLoading || onboardingLoading);
  const completed = isOnboardingComplete === true;
  const bypassed = isBypassedRoute(pathname);
  const isFinalizing = typeof window !== 'undefined' && sessionStorage.getItem('onb_finalizing') === '1';
  const isBrowser = typeof window !== 'undefined';
  const opt = isBrowser ? {
    optimistic: sessionStorage.getItem('onb_completed_optimistic') === '1',
    ts: Number(sessionStorage.getItem('onb_completed_optimistic_at') || '0'),
  } : { optimistic: false, ts: 0 };
  const OPT_MAX_MS = 10_000; // 10s safety (edge fn returns defaults fast)
  const optimisticActive = opt.optimistic && (Date.now() - opt.ts) < OPT_MAX_MS;

  // Auto-clear stale flags
  if (isBrowser && opt.optimistic && !optimisticActive) {
    sessionStorage.removeItem('onb_completed_optimistic');
    sessionStorage.removeItem('onb_completed_optimistic_at');
  }
  if (isBrowser && isFinalizing) {
    const startedAt = Number(sessionStorage.getItem('onb_finalizing_at') || '0');
    if (startedAt && (Date.now() - startedAt) > 30_000) {
      sessionStorage.removeItem('onb_finalizing');
      sessionStorage.removeItem('onb_finalizing_at');
    }
  }

  const effectiveCompleted = optimisticActive ? true : completed;


  useEffect(() => {
    if (hasRedirectedRef.current) return;
    if (!isAuthenticated) return;
    if (loading) return;
    if (isFinalizing) return;

    if (!effectiveCompleted && !bypassed) {
      hasRedirectedRef.current = true;
      navigate('/onboarding', {
        replace: true,
        state: { from: pathname + (location.search || '') },
      });
    }
  }, [isAuthenticated, loading, isFinalizing, completed, optimisticActive, effectiveCompleted, bypassed, pathname, location.search, navigate]);

  // Clear optimistic flag once DB confirms completion
  useEffect(() => {
    if (completed === true && optimisticActive) {
      sessionStorage.removeItem('onb_completed_optimistic');
      sessionStorage.removeItem('onb_completed_optimistic_at');
    }
  }, [completed, optimisticActive]);


  if (loading) {
    return <GateLoading />;
  }

  // If onboarding is finalizing, hold here to prevent redirects
  if (isFinalizing) {
    return <GateLoading />;
  }

  // Let unauthenticated users through
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  if (effectiveCompleted || bypassed) {
    return <>{children}</>;
  }

  // Not completed and not bypassed - effect will redirect
  return <GateLoading />;
}

