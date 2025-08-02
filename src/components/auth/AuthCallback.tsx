import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SmartLoadingScreen } from '@/components/SmartLoadingScreen';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing auth callback');
        
        // Get the auth tokens from URL
        const access_token = searchParams.get('access_token');
        const refresh_token = searchParams.get('refresh_token');
        const type = searchParams.get('type');
        
        console.log('🔍 Auth callback params:', { type, hasAccessToken: !!access_token });

        if (access_token && refresh_token) {
          // Set the session with the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.error('❌ Session setup error:', error);
            setError(error.message);
            return;
          }

          console.log('✅ Session established successfully');
          
          // Wait a moment for auth state to propagate
          setTimeout(() => {
            navigate('/home', { replace: true });
          }, 500);
        } else {
          console.log('🔄 No tokens in URL, redirecting to home');
          navigate('/home', { replace: true });
        }
      } catch (err) {
        console.error('❌ Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => navigate('/home', { replace: true })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Continue to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <SmartLoadingScreen>
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Completing sign up...</h3>
        <p className="text-muted-foreground">You'll be redirected shortly.</p>
      </div>
    </SmartLoadingScreen>
  );
};