import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

// Legacy redirect component for old influencer routes
export default function InfluencerRedirect() {
  useEffect(() => {
    // Fire analytics for legacy redirect
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'influencer.legacy_redirect');
    }
  }, []);

  return <Navigate to="/influencer-hub" replace />;
}