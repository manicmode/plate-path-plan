
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
import { OnboardingReminder } from '@/components/onboarding/OnboardingReminder';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

const queryClient = new QueryClient();

function App() {
  const { isAuthenticated, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { 
    isOnboardingComplete, 
    isLoading: onboardingLoading, 
    showReminder,
    markOnboardingComplete 
  } = useOnboardingStatus();

  const handleStartOnboarding = () => {
    setShowOnboarding(true);
  };

  if (loading || onboardingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-ring loading-lg"></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
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
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={
                  <div>
                    {showReminder && (
                      <OnboardingReminder onStartOnboarding={handleStartOnboarding} />
                    )}
                    <Index />
                  </div>
                } />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ThemeProvider>
        </QueryClientProvider>
      </div>
    </Router>
  );
}

export default App;
