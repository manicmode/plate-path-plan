
import { useAuth } from '@/contexts/auth';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthRecovery } from '@/hooks/useAuthRecovery';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const { showRecovery, handleRecovery } = useAuthRecovery({ isLoading: loading });

  // Only show loading if auth is actually initializing (not just switching between authenticated routes)
  // This prevents the flash when navigating between protected routes
  if (loading) {
    return null; // Return nothing during auth loading - let parent handle loading state
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Render children without additional loading or wrapper
  return <>{children}</>;
};
