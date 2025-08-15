// 🔒 UI-LOCK: Do not change Home UI without approval. Restore tag: home-restore-2025-08-10
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

  // Show loading until we have a definitive auth state AND session is checked
  if (loading || !sessionChecked || isInitialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          
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

  // Server-side redirect to home to eliminate flicker
  if (isAuthenticated) {
    // Use window.location for immediate redirect to prevent any flash
    if (typeof window !== 'undefined') {
      window.location.replace('/home');
      return null;
    }
    return <Navigate to="/home" replace />;
  }

  // Show auth form for unauthenticated users (only after loading is complete)
  return <AuthForm />;
};

export default Index;