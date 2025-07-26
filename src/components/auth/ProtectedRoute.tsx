
import { useAuth } from '@/contexts/auth';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthRecovery } from '@/hooks/useAuthRecovery';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { loading, user } = useAuth();
  const location = useLocation();

  console.log('🔒 ProtectedRoute: Checking auth state...', { 
    loading, 
    hasUser: !!user,
    currentPath: location.pathname
  });

  // Critical: Return null while auth is loading to prevent premature redirects
  if (loading) {
    console.log('⏳ ProtectedRoute: Auth loading, returning null to prevent premature redirects');
    return null;
  }

  // Critical: Only redirect when auth is fully resolved and no user exists
  if (!user) {
    console.log('🚨 ProtectedRoute: No user after loading complete, redirecting to /sign-in from:', location.pathname);
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  // Critical: Only render children when we have a confirmed user
  console.log('✅ ProtectedRoute: Valid user confirmed, rendering protected content');
  return <>{children}</>;
};
