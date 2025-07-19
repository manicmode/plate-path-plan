
import { Suspense, lazy } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NutritionProvider } from '@/contexts/NutritionContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { IngredientAlertProvider } from '@/contexts/IngredientAlertContext';
import { BadgeProvider } from '@/contexts/BadgeContext';
import { AuthProvider } from '@/contexts/auth';
import { ChatModalProvider } from '@/contexts/ChatModalContext';
import { SmartTimingProvider } from '@/contexts/SmartTimingContext';
import { SocialBoostManager } from '@/components/social/SocialBoostManager';
import { AppWithNotifications } from '@/components/AppWithNotifications';
import Layout from '@/components/Layout';
import { LoadingScreen } from '@/components/LoadingScreen';
import ErrorBoundary from '@/components/ErrorBoundary';

// Lazy load components
const Index = lazy(() => import('@/pages/Index'));
const Home = lazy(() => import('@/pages/Home'));
const Camera = lazy(() => import('@/pages/Camera'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Coach = lazy(() => import('@/pages/Coach'));
const Explore = lazy(() => import('@/pages/Explore'));
const Profile = lazy(() => import('@/pages/Profile'));
const GameAndChallengePage = lazy(() => import('@/pages/GameAndChallengePage'));
const SupplementHub = lazy(() => import('@/pages/SupplementHub'));
const Supplements = lazy(() => import('@/pages/Supplements'));
const Hydration = lazy(() => import('@/pages/Hydration'));
const ProgressCalories = lazy(() => import('@/pages/ProgressCalories'));
const ProgressProtein = lazy(() => import('@/pages/ProgressProtein'));
const ProgressCarbs = lazy(() => import('@/pages/ProgressCarbs'));
const ProgressFat = lazy(() => import('@/pages/ProgressFat'));
const ProgressHydration = lazy(() => import('@/pages/ProgressHydration'));
const ProgressSupplements = lazy(() => import('@/pages/ProgressSupplements'));
const FirebaseSetup = lazy(() => import('@/pages/FirebaseSetup'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <ThemeProvider>
            <TooltipProvider>
              <AuthProvider>
                <SmartTimingProvider>
                  <NutritionProvider>
                    <NotificationProvider>
                      <IngredientAlertProvider>
                        <BadgeProvider>
                          <ChatModalProvider>
                            <SocialBoostManager>
                              <AppWithNotifications>
                                <Layout>
                            <Suspense fallback={<LoadingScreen />}>
                              <Routes>
                                <Route path="/" element={<Index />} />
                                <Route path="/home" element={<Home />} />
                                <Route path="/camera" element={<Camera />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/coach" element={<Coach />} />
                                <Route path="/explore" element={<Explore />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/game-and-challenge" element={<GameAndChallengePage />} />
                                <Route path="/supplement-hub" element={<SupplementHub />} />
                                <Route path="/supplements" element={<Supplements />} />
                                <Route path="/hydration" element={<Hydration />} />
                                <Route path="/progress/calories" element={<ProgressCalories />} />
                                <Route path="/progress/protein" element={<ProgressProtein />} />
                                <Route path="/progress/carbs" element={<ProgressCarbs />} />
                                <Route path="/progress/fat" element={<ProgressFat />} />
                                <Route path="/progress/hydration" element={<ProgressHydration />} />
                                <Route path="/progress/supplements" element={<ProgressSupplements />} />
                                <Route path="/firebase-setup" element={<FirebaseSetup />} />
                                <Route path="/404" element={<NotFound />} />
                                <Route path="*" element={<Navigate to="/404" replace />} />
                              </Routes>
                            </Suspense>
                                </Layout>
                              </AppWithNotifications>
                            </SocialBoostManager>
                            <Toaster />
                          </ChatModalProvider>
                      </BadgeProvider>
                    </IngredientAlertProvider>
                  </NotificationProvider>
                </NutritionProvider>
              </SmartTimingProvider>
            </AuthProvider>
            </TooltipProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
