
import { useAuth } from '@/contexts/auth';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthRecovery } from '@/hooks/useAuthRecovery';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const { showRecovery, handleRecovery } = useAuthRecovery({ isLoading: loading });

  console.log('🔒 ProtectedRoute: Checking auth state...', { 
    loading, 
    hasSession: !!session, 
    isAuthenticated,
    currentPath: location.pathname 
  });

  // Show loading with recovery option
  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading, showing spinner...');
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

  // ✅ CRITICAL: If loading is false and no session, redirect to sign-in immediately
  if (!loading && session === null) {
    console.log('🚨 ProtectedRoute: No session detected, redirecting to /sign-in from:', location.pathname);
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  // Additional check: If not authenticated, redirect to sign-in
  if (!loading && !isAuthenticated) {
    console.log('🚨 ProtectedRoute: Not authenticated, redirecting to /sign-in from:', location.pathname);
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  console.log('✅ ProtectedRoute: Authenticated, rendering protected content');
  return <>{children}</>;
};
