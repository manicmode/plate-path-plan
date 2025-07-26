
import { useAuth } from '@/contexts/auth';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthRecovery } from '@/hooks/useAuthRecovery';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import AuthForm from '@/components/auth/AuthForm';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, loading } = useAuth();
  const { showRecovery, handleRecovery } = useAuthRecovery({ isLoading: loading });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Check both URL params and hash for recovery parameters
    const type = searchParams.get('type') || new URLSearchParams(window.location.hash.substring(1)).get('type');
    const code = searchParams.get('code') || new URLSearchParams(window.location.hash.substring(1)).get('code');

    console.log('🔍 Index: Checking URL for recovery parameters:', {
      type,
      hasCode: !!code,
      currentURL: window.location.href,
      searchParams: searchParams.toString(),
      hash: window.location.hash
    });

    if (type === 'recovery' && code) {
      console.log('🔑 Index: Password recovery flow detected - redirecting to reset page');
      navigate(`/reset-password#code=${code}&type=recovery`, {
        replace: true
      });
    }
  }, [searchParams, navigate]);

  console.log('🏠 Index component rendering:', {
    hasUser: !!user, 
    loading,
    searchParams: searchParams.toString(),
    currentURL: window.location.href,
    timestamp: new Date().toISOString()
  });

  // Critical: Wait until auth.loading === false before any routing decisions
  if (loading) {
    console.log('🏠 Index: Showing loading state - auth loading');
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

  // Critical: Only redirect to /home when user is authenticated
  if (user && !loading) {
    console.log('🏠 Index: User authenticated, redirecting to home');
    return <Navigate to="/home" replace />;
  }

  // Critical: Only show auth form when auth is resolved and no user
  if (!user && !loading) {
    console.log('🏠 Index: User not authenticated, showing AuthForm');
    return <AuthForm />;
  }

  // This should never be reached
  console.log('🏠 Index: Unexpected state - showing fallback loading');
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Initializing...</p>
      </div>
    </div>
  );
};

export default Index;