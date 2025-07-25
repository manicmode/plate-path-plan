
import { Suspense, lazy } from 'react';
import { Toaster } from '@/components/ui/sonner';
import BodyScanReminderChecker from '@/components/BodyScanReminderChecker';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { IngredientAlertProvider } from '@/contexts/IngredientAlertContext';
import { BadgeProvider } from '@/contexts/BadgeContext';
import { ChatModalProvider } from '@/contexts/ChatModalContext';
import Layout from '@/components/Layout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DailyMoodModal } from '@/components/mood/DailyMoodModal';
import { useDailyMoodScheduler } from '@/hooks/useDailyMoodScheduler';
import { useBodyScanTimelineReminder } from '@/hooks/useBodyScanTimelineReminder';
import { useBodyScanSharingReminder } from '@/hooks/useBodyScanSharingReminder';

// Lazy load components
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Index = lazy(() => import('@/pages/Index'));
const Home = lazy(() => import('@/pages/Home'));
const Camera = lazy(() => import('@/pages/Camera'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Coach = lazy(() => import('@/pages/Coach'));
const Explore = lazy(() => import('@/pages/Explore'));
const ExerciseHub = lazy(() => import('@/pages/ExerciseHub'));
const AIFitnessCoach = lazy(() => import('@/pages/AIFitnessCoach'));
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
const MyReports = lazy(() => import('@/pages/MyReports'));
const ReportViewer = lazy(() => import('@/pages/ReportViewer'));
const FirebaseSetup = lazy(() => import('@/pages/FirebaseSetup'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const BodyScanAI = lazy(() => import('@/pages/BodyScanAI'));
const SideBodyScan = lazy(() => import('@/pages/SideBodyScan'));
const BackBodyScan = lazy(() => import('@/pages/BackBodyScan'));
const BodyScanResults = lazy(() => import('@/pages/BodyScanResults'));
const SecurityLogsPage = lazy(() => import('@/pages/admin/SecurityLogsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  const { showMoodModal, setShowMoodModal } = useDailyMoodScheduler();
  useBodyScanTimelineReminder();
  useBodyScanSharingReminder();

  return (
    <>
      <BodyScanReminderChecker />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Fullscreen pages without Layout */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/body-scan-ai" element={
            <ProtectedRoute>
              <BodyScanAI />
            </ProtectedRoute>
          } />
          <Route path="/body-scan-side" element={
            <ProtectedRoute>
              <SideBodyScan />
            </ProtectedRoute>
          } />
          <Route path="/body-scan-back" element={
            <ProtectedRoute>
              <BackBodyScan />
            </ProtectedRoute>
          } />
          
          {/* Regular pages with Layout */}
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/home" element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } />
                <Route path="/camera" element={
                  <ProtectedRoute>
                    <Camera />
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                } />
                <Route path="/coach" element={
                  <ProtectedRoute>
                    <Coach />
                  </ProtectedRoute>
                } />
                <Route path="/explore" element={
                  <ProtectedRoute>
                    <Explore />
                  </ProtectedRoute>
                } />
                <Route path="/exercise-hub" element={
                  <ProtectedRoute>
                    <ExerciseHub />
                  </ProtectedRoute>
                } />
                <Route path="/ai-fitness-coach" element={
                  <ProtectedRoute>
                    <AIFitnessCoach />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/game-and-challenge" element={
                  <ProtectedRoute>
                    <GameAndChallengePage />
                  </ProtectedRoute>
                } />
                <Route path="/supplement-hub" element={
                  <ProtectedRoute>
                    <SupplementHub />
                  </ProtectedRoute>
                } />
                <Route path="/supplements" element={
                  <ProtectedRoute>
                    <Supplements />
                  </ProtectedRoute>
                } />
                <Route path="/hydration" element={
                  <ProtectedRoute>
                    <Hydration />
                  </ProtectedRoute>
                } />
                <Route path="/progress/calories" element={
                  <ProtectedRoute>
                    <ProgressCalories />
                  </ProtectedRoute>
                } />
                <Route path="/progress/protein" element={
                  <ProtectedRoute>
                    <ProgressProtein />
                  </ProtectedRoute>
                } />
                <Route path="/progress/carbs" element={
                  <ProtectedRoute>
                    <ProgressCarbs />
                  </ProtectedRoute>
                } />
                <Route path="/progress/fat" element={
                  <ProtectedRoute>
                    <ProgressFat />
                  </ProtectedRoute>
                } />
                <Route path="/progress/hydration" element={
                  <ProtectedRoute>
                    <ProgressHydration />
                  </ProtectedRoute>
                } />
                <Route path="/progress/supplements" element={
                  <ProtectedRoute>
                    <ProgressSupplements />
                  </ProtectedRoute>
                } />
                <Route path="/my-reports" element={
                  <ProtectedRoute>
                    <MyReports />
                  </ProtectedRoute>
                } />
                <Route path="/report-viewer" element={
                  <ProtectedRoute>
                    <ReportViewer />
                  </ProtectedRoute>
                } />
                <Route path="/body-scan-results" element={
                  <ProtectedRoute>
                    <BodyScanResults />
                  </ProtectedRoute>
                } />
                <Route path="/firebase-setup" element={
                  <ProtectedRoute>
                    <FirebaseSetup />
                  </ProtectedRoute>
                } />
                <Route path="/admin/security-logs" element={
                  <ProtectedRoute>
                    <SecurityLogsPage />
                  </ProtectedRoute>
                } />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </Suspense>
      
      <DailyMoodModal 
        isOpen={showMoodModal} 
        onClose={() => setShowMoodModal(false)} 
      />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <ThemeProvider>
            <TooltipProvider>
              <IngredientAlertProvider>
                <BadgeProvider>
                  <ChatModalProvider>
                    <AppContent />
                  </ChatModalProvider>
                </BadgeProvider>
              </IngredientAlertProvider>
            </TooltipProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
