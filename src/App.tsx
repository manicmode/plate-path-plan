
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
import { OptimizedChallengeProvider } from '@/contexts/OptimizedChallengeProvider';
import { SocialBoostManager } from '@/components/social/SocialBoostManager';
import { AppWithNotifications } from '@/components/AppWithNotifications';
import Layout from '@/components/Layout';
import { LoadingScreen } from '@/components/LoadingScreen';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
                          <OptimizedChallengeProvider>
                            <ChatModalProvider>
                              <SocialBoostManager>
                                <AppWithNotifications>
                                  <Suspense fallback={<LoadingScreen />}>
                                    <Routes>
                                      {/* Public route - Login/Signup page */}
                                      <Route path="/" element={<Index />} />
                                      
                                      {/* Protected routes - wrapped with ProtectedRoute */}
                                      <Route path="/home" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <Home />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/camera" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <Camera />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/analytics" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <Analytics />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/coach" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <Coach />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/explore" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <Explore />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/profile" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <Profile />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/game-and-challenge" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <GameAndChallengePage />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/supplement-hub" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <SupplementHub />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/supplements" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <Supplements />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/hydration" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <Hydration />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/progress/calories" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <ProgressCalories />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/progress/protein" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <ProgressProtein />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/progress/carbs" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <ProgressCarbs />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/progress/fat" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <ProgressFat />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/progress/hydration" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <ProgressHydration />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      <Route path="/progress/supplements" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <ProgressSupplements />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      
                                      <Route path="/firebase-setup" element={
                                        <ProtectedRoute>
                                          <Layout>
                                            <FirebaseSetup />
                                          </Layout>
                                        </ProtectedRoute>
                                      } />
                                      
                                      <Route path="/404" element={<NotFound />} />
                                      <Route path="*" element={<Navigate to="/404" replace />} />
                                    </Routes>
                                  </Suspense>
                                </AppWithNotifications>
                              </SocialBoostManager>
                              <Toaster />
                            </ChatModalProvider>
                          </OptimizedChallengeProvider>
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
