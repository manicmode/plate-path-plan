
import { useAuth } from '@/contexts/auth';
import AuthForm from '@/components/auth/AuthForm';
import { Navigate } from 'react-router-dom';

const Index = () => {
  const { isAuthenticated, loading, session } = useAuth();

  console.log('Index component rendering:', { 
    isAuthenticated, 
    loading,
    hasSession: !!session,
    timestamp: new Date().toISOString()
  });

  // Show loading while checking authentication status
  if (loading) {
    console.log('Index showing loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, redirect to home
  if (isAuthenticated) {
    console.log('User authenticated, redirecting to home');
    return <Navigate to="/home" replace />;
  }

  // Only show auth form for unauthenticated users
  console.log('User not authenticated, showing AuthForm');
  return <AuthForm />;
};

export default Index;
