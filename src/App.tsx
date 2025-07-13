
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/auth';
import Index from './pages/Index';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
import { OnboardingReminder } from '@/components/onboarding/OnboardingReminder';
import EmailVerificationRequired from '@/components/auth/EmailVerificationRequired';
import { ConfirmEmail } from '@/components/auth/ConfirmEmail';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

// Import existing pages
import Camera from './pages/Camera';
import Analytics from './pages/Analytics';
import Coach from './pages/Coach';
import Profile from './pages/Profile';
import Hydration from './pages/Hydration';
import Supplements from './pages/Supplements';
import AdminDashboard from './components/admin/AdminDashboard';

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated, loading, isEmailConfirmed } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Only load onboarding status if authenticated to prevent race conditions
  const { 
    isOnboardingComplete, 
    isLoading: onboardingLoading, 
    showReminder,
    markOnboardingComplete,
    isTransitioning
  } = useOnboardingStatus();

  const handleStartOnboarding = () => {
    setShowOnboarding(true);
  };

  console.log('AppContent state:', { 
    loading, 
    isAuthenticated, 
    isEmailConfirmed,
    onboardingLoading, 
    isOnboardingComplete, 
    showOnboarding, 
    showReminder 
  });

  // Show loading while auth is initializing
  if (loading) {
    console.log('AppContent: Showing auth loading state');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show auth flow or email confirmation
  if (!isAuthenticated) {
    console.log('AppContent: User not authenticated, showing auth flow');
    return (
      <Router>
        <Routes>
          <Route path="/confirm" element={<ConfirmEmail />} />
          <Route path="*" element={<Index />} />
        </Routes>
      </Router>
    );
  }

  // Check email confirmation first if authenticated
  if (isAuthenticated && !isEmailConfirmed) {
    console.log('AppContent: User authenticated but email not confirmed, showing verification screen');
    return <EmailVerificationRequired />;
  }

  // Show loading while onboarding status is being checked or transitioning
  if (onboardingLoading) {
    console.log('AppContent: Showing onboarding loading state');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isTransitioning ? 'Completing onboarding...' : 'Loading profile...'}
          </p>
        </div>
      </div>
    );
  }

  // Show onboarding if needed
  if (showOnboarding || (isOnboardingComplete === false)) {
    console.log('AppContent: Showing onboarding screen');
    return <OnboardingScreen onComplete={() => {
      console.log('Onboarding completed, transitioning to main app');
      setShowOnboarding(false);
      markOnboardingComplete();
    }} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Layout><Outlet /></Layout>}>
            <Route index element={
              <div>
                {showReminder && (
                  <OnboardingReminder onStartOnboarding={handleStartOnboarding} />
                )}
                <Home />
              </div>
            } />
            <Route path="home" element={
              <div>
                {showReminder && (
                  <OnboardingReminder onStartOnboarding={handleStartOnboarding} />
                )}
                <Home />
              </div>
            } />
            <Route path="camera" element={<Camera />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="coach" element={<Coach />} />
            <Route path="profile" element={<Profile />} />
            <Route path="hydration" element={<Hydration />} />
            <Route path="supplements" element={<Supplements />} />
            <Route path="admin" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
