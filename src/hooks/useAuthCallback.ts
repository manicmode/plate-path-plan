import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth/useAuth';

export const useAuthCallback = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlHash = new URLSearchParams(window.location.hash.substring(1));
      
      // Check for Supabase auth parameters in URL
      const hasAuthParams = 
        urlParams.has('type') || 
        urlParams.has('access_token') ||
        urlHash.has('access_token') ||
        urlParams.has('token_hash') ||
        urlHash.has('token_hash') ||
        urlParams.has('code');
      
      if (!hasAuthParams) return;

      console.log('🔗 Detected Supabase auth callback parameters');
      setIsProcessing(true);
      
      try {
        // Force auth processing
        await supabase.auth.getSession();
        await supabase.auth.getUser();
        
        // Clean up URL immediately
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Wait for authentication state to be established
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        const waitForAuth = async (): Promise<void> => {
          return new Promise((resolve) => {
            const checkAuth = () => {
              attempts++;
              
              if (attempts >= maxAttempts) {
                console.log('⏰ Auth timeout reached, navigating anyway');
                resolve();
                return;
              }
              
              // Check if auth is ready (not loading and authenticated)
              if (!authLoading && isAuthenticated) {
                console.log('✅ Auth callback successful, user authenticated');
                resolve();
                return;
              }
              
              // Continue waiting
              setTimeout(checkAuth, 100);
            };
            
            checkAuth();
          });
        };
        
        await waitForAuth();
        
        // Navigate to home using React Router
        console.log('📍 Navigating to /home');
        navigate('/home', { replace: true });
        
      } catch (error) {
        console.error('Error handling auth callback:', error);
        // Always navigate to avoid blank screens
        navigate('/home', { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, isAuthenticated, authLoading]);

  return { isProcessing };
};