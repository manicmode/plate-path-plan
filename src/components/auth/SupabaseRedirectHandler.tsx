import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/useAuth';

export const SupabaseRedirectHandler = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const type = searchParams.get('type');
    
    // Only handle signup and recovery redirects
    if (!type || !['signup', 'recovery'].includes(type)) {
      return;
    }

    // Wait for auth to finish loading
    if (loading) {
      return;
    }

    // If user is authenticated after confirmation, redirect to home
    if (isAuthenticated) {
      console.log('✅ Email confirmation successful, redirecting to home');
      
      // Clean up URL params and redirect
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('type');
      newSearchParams.delete('access_token');
      newSearchParams.delete('refresh_token');
      newSearchParams.delete('expires_in');
      newSearchParams.delete('token_type');
      
      // Update URL to clean state
      if (newSearchParams.toString()) {
        setSearchParams(newSearchParams);
      } else {
        // Navigate to home if no other params remain
        navigate('/home', { replace: true });
      }
    }
  }, [isAuthenticated, loading, searchParams, navigate, setSearchParams]);

  return null;
};