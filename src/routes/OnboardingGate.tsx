import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useNavigate, useLocation } from 'react-router-dom';

const BYPASSED = ['/onboarding','/auth','/reset-password','/magic-link','/verify','/privacy','/terms','/s/','/shared-routine'];
const isBypassedRoute = (p: string) => !!p && BYPASSED.some(x => p.startsWith(x));

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isOnboardingComplete, isLoading: obLoading } = useOnboardingStatus();
  const nav = useNavigate();
  const loc = useLocation();
  const redirected = useRef(false);
  const [ready, setReady] = useState(false);

  const loading = authLoading || obLoading;
  const bypass = isBypassedRoute(loc.pathname || '');
  const flagsComplete = (() => {
    try {
      return sessionStorage.getItem('__voyagePostOnboarding') === '1' ||
             sessionStorage.getItem('onb_completed_optimistic') === '1';
    } catch { return false; }
  })();
  const effectiveComplete = !!isOnboardingComplete || flagsComplete;

  useEffect(() => {
    if (!loading && !ready) setReady(true);
    if (loading || !isAuthenticated || redirected.current) return;

    // STEP 2: Forensics - log route guard decisions
    console.log('[router] guard decision:', {
      pathname: loc.pathname,
      effectiveComplete,
      bypass,
      isAuthenticated,
      loading
    });

    if (!effectiveComplete && !bypass) {
      console.log('[router] start navigation to onboarding');
      redirected.current = true;
      nav('/onboarding', { replace: true });
      return;
    }
    if (effectiveComplete && (loc.pathname || '').startsWith('/onboarding')) {
      console.log('[router] start navigation to home');
      redirected.current = true;
      nav('/home', { replace: true });
      return;
    }
    
    console.log('[router] done - no redirect needed');
  }, [loading, ready, isAuthenticated, effectiveComplete, bypass, loc.pathname, nav]);

  if (loading && !ready) return <div className="p-4"><div className="h-5 w-28 animate-pulse rounded bg-muted" /></div>;
  return <>{children}</>;
}