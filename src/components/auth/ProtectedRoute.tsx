
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
    currentPath: location.pathname,
    sessionUserId: session?.user?.id || 'none'
  });

  // Critical: Always show loading while auth is initializing
  if (loading) {
    console.log('⏳ ProtectedRoute: Auth loading, showing spinner...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Authenticating...</p>
          
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

  // Critical: Only check for null session after loading is complete
  if (!loading && (session === null || session === undefined)) {
    console.log('🚨 ProtectedRoute: No session after loading complete, redirecting to / from:', location.pathname);
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Critical: Double-check authentication state
  if (!loading && !isAuthenticated) {
    console.log('🚨 ProtectedRoute: Not authenticated after loading complete, redirecting to / from:', location.pathname);
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Critical: Ensure we have a valid session with user before rendering protected content
  if (!loading && session && session.user && isAuthenticated) {
    console.log('✅ ProtectedRoute: Valid session confirmed, rendering protected content');
    return <>{children}</>;
  }

  // Fallback: If we get here, something is wrong - show loading
  console.log('⚠️ ProtectedRoute: Unexpected state, showing fallback loading');
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Validating session...</p>
      </div>
    </div>
  );
};
