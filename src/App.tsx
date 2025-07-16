import { Toaster } from 'sonner';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useNavigate } from 'react-router-dom';
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
import { SavingScreen } from './components/SavingScreen';
import { OnboardingWithNavigation } from './components/onboarding/OnboardingWithNavigation';
import { LoadingScreen } from './components/LoadingScreen';

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
  const { isAuthenticated, loading, isEmailConfirmed, refreshUser, user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [authTransitioning, setAuthTransitioning] = useState(false);

  // Only load onboarding status if authenticated to prevent race conditions
  const { 
    isOnboardingComplete, 
    isLoading: onboardingLoading, 
    showReminder,
    markOnboardingComplete
  } = useOnboardingStatus();

  // Check if onboarding was just completed by checking localStorage
  const onboardingJustCompleted = user && localStorage.getItem(`onboarding_complete_${user.id}`) === 'true';

  // Bootstrap loading state - combines auth and onboarding initialization
  const isBootstrapping = loading || (isAuthenticated && isEmailConfirmed && onboardingLoading);

  // Add debug logging at the top
  console.log('[DEBUG] route', window.location.pathname);

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
    showReminder,
    authTransitioning
  });

  // Handle auth transitions to prevent 404 flash
  useState(() => {
    if (!loading && !isAuthenticated) {
      setAuthTransitioning(true);
      // Reset transition state after a brief delay
      setTimeout(() => setAuthTransitioning(false), 100);
    }
  });

  // Show bootstrap loading screen while initializing
  if (isBootstrapping || authTransitioning) {
    console.log('AppContent: Showing bootstrap loading state');
    return <LoadingScreen />;
  }

  // Not authenticated - show auth flow or email confirmation
  if (!isAuthenticated) {
    console.log('AppContent: User not authenticated, showing auth flow');
    return (
      <Router>
        <Routes>
          <Route path="/confirm" element={<ConfirmEmail />} />
          <Route path="/confirm-email" element={<ConfirmEmail />} />
          <Route path="/auth/confirm" element={<ConfirmEmail />} />
          <Route path="/onboarding" element={<Index />} />
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

  // Show onboarding only when explicitly needed, not loading, and not already complete
  // But NEVER show onboarding if it was just completed (defensive check)
  if ((showOnboarding || (isOnboardingComplete === false && !onboardingLoading)) && isOnboardingComplete !== true && !onboardingJustCompleted) {
    console.log('AppContent: Showing onboarding screen');
    return (
      <Router>
        <OnboardingWithNavigation 
          onComplete={async () => {
            console.log('[DEBUG] App.tsx: Onboarding completed callback triggered');
            
            try {
              setAuthTransitioning(true);
              
              // Mark onboarding complete first
              await markOnboardingComplete();
              console.log('[DEBUG] App.tsx: Onboarding marked complete');
              
              // Immediately set states to prevent flashing
              setShowOnboarding(false);
              
              // Force immediate state update to prevent re-rendering onboarding
              if (user) {
                localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
              }
              
              // Refresh user profile after onboarding completion
              await refreshUser();
              console.log('[DEBUG] App.tsx: User profile refreshed');
              
              setAuthTransitioning(false);
              console.log('[DEBUG] App.tsx: Navigation to home should happen now');
              
            } catch (error) {
              console.error('[DEBUG] App.tsx: Error completing onboarding:', error);
              setAuthTransitioning(false);
            }
          }} 
        />
      </Router>
    );
  }

  console.log('🧩 App.tsx: Rendering main app router - user should see home page now');

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
            <Route path="/home" element={<Home />} />
            <Route path="camera" element={<Camera />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="coach" element={<Coach />} />
            <Route path="profile" element={<Profile />} />
            <Route path="hydration" element={<Hydration />} />
            <Route path="supplements" element={<Supplements />} />
            <Route path="admin" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
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

        {/* Toast notifications */}
        <Toaster position="top-center" richColors />
        
      </ThemeProvider>
    </QueryClientProvider>
  );
}


export default App;
