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
  const decidedRef = useRef(false);
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
    
    // Diagnostic log
    if (import.meta.env.VITE_DEBUG_BOOT === '1') {
      console.info('[ROUTER][GUARD]', {
        ready: !loading,
        isAuthenticated,
        path: loc.pathname
      });
    }
    
    if (loading || decidedRef.current) return;

    // Don't block on authentication - let routes render when ready
    if (!isAuthenticated) return;

    // Only guard on onboarding for authenticated users
    console.log('[router] guard decision:', {
      pathname: loc.pathname,
      effectiveComplete,
      bypass,
      isAuthenticated,
      loading
    });

    // Prevent double decisions with ref guard
    decidedRef.current = true;

    if (!effectiveComplete && !bypass) {
      console.log('[router] start navigation to onboarding');
      nav('/onboarding', { replace: true });
      return;
    }
    if (effectiveComplete && (loc.pathname || '').startsWith('/onboarding')) {
      console.log('[router] start navigation to home');
      nav('/home', { replace: true });
      return;
    }
    
    console.log('[router] done - no redirect needed');
  }, [loading, ready, isAuthenticated, effectiveComplete, bypass, loc.pathname, nav]);

  if (loading && !ready) return <div className="p-4"><div className="h-5 w-28 animate-pulse rounded bg-muted" /></div>;
  return <>{children}</>;
}