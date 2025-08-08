import { useAuth } from '@/contexts/auth';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthRecovery } from '@/hooks/useAuthRecovery';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import AuthForm from '@/components/auth/AuthForm';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const { showRecovery, handleRecovery } = useAuthRecovery({ isLoading: loading });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().finally(() => {
      setSessionChecked(true);
      // Add a small delay to prevent flash on initial load
      setTimeout(() => setIsInitialLoad(false), 100);
    });
  }, []);

  useEffect(() => {
    // Check both URL params and hash for recovery parameters
    const type = searchParams.get('type') || new URLSearchParams(window.location.hash.substring(1)).get('type');
    const code = searchParams.get('code') || new URLSearchParams(window.location.hash.substring(1)).get('code');

    if (type === 'recovery' && code) {
      navigate(`/reset-password#code=${code}&type=recovery`, {
        replace: true
      });
    }
  }, [searchParams, navigate]);

  console.log('🐛 DEBUG Index render:', {
    loading,
    sessionChecked,
    isInitialLoad,
    isAuthenticated,
    showRecovery,
    shouldShowLoading: loading || !sessionChecked || isInitialLoad,
    url: window.location.href,
    timestamp: new Date().toISOString()
  });

  // Force faster loading - skip initial load delay to prevent white page
  if (isInitialLoad && Date.now() - performance.timing.navigationStart > 2000) {
    setIsInitialLoad(false);
  }

  // Show loading until we have a definitive auth state AND session is checked
  if ((loading || !sessionChecked || isInitialLoad) && Date.now() - performance.timing.navigationStart < 3000) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
          
          {showRecovery && (
            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
              <p className="text-sm text-muted-foreground">
                Taking longer than expected?
              </p>
              <Button 
                onClick={handleRecovery}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reset & Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Force show auth form if taking too long or auth state is clear
  console.log('🐛 DEBUG Index: Showing content', { isAuthenticated, timestamp: new Date().toISOString() });

  // EMERGENCY FALLBACK - Always show something
  if (!isAuthenticated) {
    console.log('🐛 DEBUG Index: Showing AuthForm');
    return (
      <div style={{ background: '#ffffff', color: '#000000', minHeight: '100vh', padding: '20px' }}>
        <h1>VOYAGE - Sign In</h1>
        <AuthForm />
      </div>
    );
  }

  // Redirect to home if authenticated (no flash because of proper loading state above)
  if (isAuthenticated) {
    console.log('🐛 DEBUG Index: Redirecting to home');
    return <Navigate to="/home" replace />;
  }

  // Show auth form for unauthenticated users (only after loading is complete)
  console.log('🐛 DEBUG Index: Showing AuthForm');
  return <AuthForm />;
};

export default Index;