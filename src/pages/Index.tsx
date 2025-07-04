
import { useAuth } from '@/contexts/AuthContext';
import AuthForm from '@/components/auth/AuthForm';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { isAuthenticated } = useAuth();
  const { isOnboardingComplete, isLoading, markOnboardingComplete } = useOnboardingStatus();
  const navigate = useNavigate();

  console.log('Index component rendering:', { 
    isAuthenticated, 
    isOnboardingComplete, 
    isLoading,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    if (isAuthenticated && isOnboardingComplete === true) {
      console.log('User authenticated and onboarded, redirecting to /home');
      navigate('/home');
    }
  }, [isAuthenticated, isOnboardingComplete, navigate]);

  // Show loading while checking authentication and onboarding status
  if (isLoading) {
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

  // Not authenticated - show auth form
  if (!isAuthenticated) {
    console.log('User not authenticated, showing AuthForm');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <AuthForm />
      </div>
    );
  }

  // Authenticated but onboarding not complete - show onboarding
  if (isAuthenticated && isOnboardingComplete === false) {
    console.log('User authenticated but onboarding not complete, showing OnboardingScreen');
    return (
      <OnboardingScreen onComplete={() => {
        markOnboardingComplete();
        navigate('/home');
      }} />
    );
  }

  // Authenticated and onboarded - redirect to home (handled by useEffect)
  console.log('Index: authenticated and onboarded, should redirect to home');
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to home...</p>
      </div>
    </div>
  );
};

export default Index;
