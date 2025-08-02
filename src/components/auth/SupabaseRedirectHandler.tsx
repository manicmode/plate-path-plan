import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const SupabaseRedirectHandler = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleSupabaseRedirect = async () => {
      const type = searchParams.get('type');
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      // Only handle signup and recovery redirects with tokens
      if (!type || !['signup', 'recovery'].includes(type)) {
        return;
      }

      // If we have tokens but haven't processed them yet
      if (accessToken && refreshToken && !isProcessing && !loading) {
        setIsProcessing(true);
        
        try {
          console.log('🔐 Setting Supabase session from URL tokens...');
          
          // Set the session using the tokens from URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('❌ Failed to set session:', error);
            return;
          }

          if (data.session) {
            console.log('✅ Session set successfully, user authenticated');
            
            // Clean up URL params
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('type');
            newSearchParams.delete('access_token');
            newSearchParams.delete('refresh_token');
            newSearchParams.delete('expires_in');
            newSearchParams.delete('token_type');
            
            // Navigate to home with clean URL
            navigate('/home', { replace: true });
          }
        } catch (error) {
          console.error('❌ Error during session setup:', error);
        } finally {
          setIsProcessing(false);
        }
      }
      
      // If user is already authenticated and we have confirmation params, just redirect
      else if (isAuthenticated && !loading && !isProcessing) {
        console.log('✅ User already authenticated, redirecting to home');
        navigate('/home', { replace: true });
      }
    };

    handleSupabaseRedirect();
  }, [searchParams, navigate, isAuthenticated, loading, isProcessing]);

  return null;
};