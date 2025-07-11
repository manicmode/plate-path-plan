
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
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

// Import existing pages
import Camera from './pages/Camera';
import Analytics from './pages/Analytics';
import Coach from './pages/Coach';
import Profile from './pages/Profile';
import Hydration from './pages/Hydration';
import Supplements from './pages/Supplements';

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Only load onboarding status if authenticated to prevent race conditions
  const { 
    isOnboardingComplete, 
    isLoading: onboardingLoading, 
    showReminder,
    markOnboardingComplete 
  } = useOnboardingStatus();

  const handleStartOnboarding = () => {
    setShowOnboarding(true);
  };

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-ring loading-lg"></span>
      </div>
    );
  }

  // Not authenticated - show auth flow
  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<Index />} />
        </Routes>
      </Router>
    );
  }

  // Show loading while onboarding status is being checked
  if (onboardingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-ring loading-lg"></span>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => {
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
