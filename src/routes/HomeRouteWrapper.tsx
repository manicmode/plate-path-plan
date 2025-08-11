import React, { useEffect } from 'react';
import { isDebug } from '@/utils/debugFlag';

// Non-lazy import
import Home from '@/pages/Home';
// Lazy import for normal navigations
const LazyHome = React.lazy(() => import('@/pages/Home'));

export default function HomeRouteWrapper() {
  const fromOnboarding =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('__voyagePostOnboarding') === '1';

  useEffect(() => {
    if (fromOnboarding) {
      // consume the flag so future visits use lazy as usual
      sessionStorage.removeItem('__voyagePostOnboarding');
    }
  }, [fromOnboarding]);

  if (fromOnboarding) {
    
    return <Home />;
  }

  
  return (
    <React.Suspense fallback={isDebug() ? <div style={{padding:16}}>Loading…</div> : null}>
      <LazyHome />
    </React.Suspense>
  );
}