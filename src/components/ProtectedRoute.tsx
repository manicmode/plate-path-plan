
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();

  console.log('ProtectedRoute check:', { 
    isAuthenticated, 
    loading,
    timestamp: new Date().toISOString()
  });

  // Show loading while checking authentication status
  if (loading) {
    return <LoadingScreen />;
  }

  // If user is not authenticated, redirect to login page
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/" replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};
