import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const SupabaseRedirectGate = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Parse URL parameters synchronously
    const searchParams = new URLSearchParams(location.search);
    const type = searchParams.get('type');
    
    // Check if this is a Supabase auth redirect
    if (type === 'signup' || type === 'recovery' || type === 'magiclink') {
      const redirectUrl = `/auth/callback${location.search}`;
      console.log('🛜 Redirecting to Supabase Auth Callback:', redirectUrl);
      console.log('🔍 Detected auth type:', type);
      console.log('📋 Full query string:', location.search);
      
      // Immediately redirect to auth callback with full query string
      navigate(redirectUrl, { replace: true });
    }
  }, [navigate, location.search]);

  // This component renders nothing
  return null;
};