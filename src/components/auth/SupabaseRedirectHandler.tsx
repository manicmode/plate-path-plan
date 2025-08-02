import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const SupabaseRedirectHandler = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            setError('Failed to authenticate. Please try logging in manually.');
            setIsProcessing(false);
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
          setError('An unexpected error occurred during authentication.');
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

  // Show loading screen while processing tokens
  if (isProcessing || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold text-foreground">
            Confirming your account...
          </h2>
          <p className="text-muted-foreground">
            Please wait while we verify your email confirmation.
          </p>
        </div>
      </div>
    );
  }

  // Show error state if something went wrong
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-destructive text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">
            Authentication Error
          </h2>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={() => navigate('/', { replace: true })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};