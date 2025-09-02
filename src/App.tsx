// Clean up App.tsx imports - remove duplicates and organize properly
import React, { Suspense, lazy, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import BodyScanReminderChecker from '@/components/BodyScanReminderChecker';
import { TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import AppErrorBoundary from '@/components/system/AppErrorBoundary';
import { requestIdle } from '@/utils/safeIdle';
import { ROUTES } from '@/routes/constants';
import { APP_CONFIG } from '@/config/app';
import { verifyHubRoutes } from '@/utils/hubRouteCheck';
import { FF } from '@/featureFlags';

// Import camera diagnostic shim (dev-only, off by default)
import '@/diagnostics/cameraInq';

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PhotoSandbox = React.lazy(() => import('@/pages/debug/PhotoSandbox'));

import { ThemeProvider } from '@/contexts/ThemeContext';
import { IngredientAlertProvider } from '@/contexts/IngredientAlertContext';
import { BadgeProvider } from '@/contexts/BadgeContext';
import { ChatModalProvider } from '@/contexts/ChatModalContext';
import { SoundProvider } from '@/contexts/SoundContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { HapticsProvider } from '@/contexts/HapticsContext';
import Layout from '@/components/Layout';
import { SmartLoadingScreen } from '@/components/SmartLoadingScreen';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DailyMoodModal } from '@/components/mood/DailyMoodModal';
import { MysteryBox } from '@/components/analytics/MysteryBox';
import { useDailyMoodScheduler } from '@/hooks/useDailyMoodScheduler';
import { useBodyScanTimelineReminder } from '@/hooks/useBodyScanTimelineReminder';
import { useBodyScanSharingReminder } from '@/hooks/useBodyScanSharingReminder';
import { SplashScreen } from '@/components/SplashScreen';
import { useColdStart } from '@/hooks/useColdStart';
import { WorkoutCompletionProvider } from '@/contexts/WorkoutCompletionContext';
import { WorkoutCompletionModal } from '@/components/workout/WorkoutCompletionModal';
import { LevelUpProvider } from '@/contexts/LevelUpContext';
import { useAuthCallback } from '@/hooks/useAuthCallback';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { AuthProcessingOverlay } from '@/components/auth/AuthProcessingOverlay';
import { ClientSecurityValidator } from '@/components/security/ClientSecurityValidator';
import AuthUrlHandler from '@/auth/AuthUrlHandler';

import OnboardingGate from '@/routes/OnboardingGate';

// Core page components
import HomeRouteWrapper from '@/routes/HomeRouteWrapper';
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const Index = lazy(() => import('@/pages/Index'));
const Camera = lazy(() => import('@/pages/Camera'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Friends = lazy(() => import('@/pages/Friends'));
const CoachMain = lazy(() => import('@/pages/CoachMain'));
const Explore = lazy(() => import('@/pages/Explore'));
const Profile = lazy(() => import('@/pages/Profile'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const SavedLogs = lazy(() => import('@/pages/SavedLogs'));

// Health Scan components
const ScanHub = lazy(() => import('@/pages/ScanHub'));
const HealthScanPhoto = lazy(() => import('@/pages/health-scan/HealthScanPhoto'));
const HealthReport = lazy(() => import('@/pages/health-scan/HealthReport'));
const HealthReportStandalone = lazy(() => import('@/pages/HealthReportStandalone'));

// Less critical components - lazy load without prefetch
const ExerciseHub = lazy(() => import('@/pages/ExerciseHub'));
const AIRoutineViewer = lazy(() => import('@/pages/AIRoutineViewer'));
const IntelligentWorkoutPage = lazy(() => import('@/pages/IntelligentWorkoutPage'));
const RecoveryCenter = lazy(() => import('@/pages/RecoveryCenter'));
const GuidedMeditation = lazy(() => import('@/pages/GuidedMeditation'));
const RecoveryPlayer = lazy(() => import('@/pages/RecoveryPlayer'));
const BreathingPage = lazy(() => import('@/pages/recovery/BreathingPage'));
const StretchingPage = lazy(() => import('@/pages/recovery/StretchingPage'));
const MuscleRecoveryPage = lazy(() => import('@/pages/recovery/MuscleRecoveryPage'));
const SleepPage = lazy(() => import('@/pages/recovery/SleepPage'));
const YogaPage = lazy(() => import('@/pages/recovery/YogaPage'));
const RecoveryAnalytics = lazy(() => import('@/pages/RecoveryAnalytics'));
const RecoveryAnalyticsPage = lazy(() => import('@/pages/RecoveryAnalyticsPage'));
const AIFitnessCoach = lazy(() => import('@/pages/AIFitnessCoach'));
const GameAndChallengePage_Min = lazy(() => 
  import('@/pages/GameAndChallengePage')
    .then(module => ({ default: module.GameAndChallengePage_Min }))
    .catch(() => ({ default: () => React.createElement('div', { style: { padding: 16 } }, 'Arena temporarily unavailable — try again shortly.') }))
);
const SupplementHub = lazy(() => import('@/pages/SupplementHub'));
const Supplements = lazy(() => import('@/pages/Supplements'));
const SupplementDetail = lazy(() => import('@/pages/SupplementDetail'));
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
const DetectorPing = lazy(() => import('@/pages/debug/DetectorPing'));
const SpeakToLog = lazy(() => import('@/pages/SpeakToLog'));
const HealthReviewStackPage = lazy(() => import('@/pages/health/HealthReviewStackPage'));

// Prefetch critical components after initial load
const prefetchCriticalComponents = () => {
  // Prefetch main navigation components after the app has loaded
  setTimeout(() => {
    import('@/pages/Home');
    import('@/pages/Camera');
    import('@/pages/Analytics');
    import('@/pages/CoachMain');
    import('@/pages/Explore');
    import('@/pages/Profile');
  }, 1000);
};

// Route sentinel component for bisection testing
const RouteSentinel = () => {
  console.log('[Sentinel] router mounted');
  return <div data-test="router-sentinel" style={{padding:24}}>ROUTER OK</div>;
};

function AppContent() {
  const { showMoodModal, setShowMoodModal } = useDailyMoodScheduler();
  const { isColdStart, completeSplash } = useColdStart();
  const { isProcessing } = useAuthCallback();
  const { checkForUpdates } = useVersionCheck(); // Add version checking
  useBodyScanTimelineReminder();
  useBodyScanSharingReminder();
  
  // Mobile detection for debugging
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // STEP 2: Forensics performance marker and theme tracing + Feature Flag Logging
  useEffect(() => { 
    performance.mark('react:mounted'); 
    console.log('[boot] react:mounted'); 
    console.log('[boot+100ms] html.class after mount:', document.documentElement.className);
    setTimeout(() => console.log('[boot+100ms] html.class delayed:', document.documentElement.className), 100);
    
    // Log feature flags for debugging
    console.log('[FF]', {
      DEV: import.meta.env.DEV,
      PHOTO_SANDBOX_ALLOW_PROD: (import.meta.env.VITE_PHOTO_SANDBOX_ALLOW_PROD ?? 'false') === 'true'
    });
    
    // Bootstrap sound system - ensure unlock on first user gesture
    const unlockSound = () => {
      import('@/lib/sound/soundManager').then(({ Sound }) => {
        Sound.ensureUnlocked();
      });
    };
    
    // Listen for first user interaction to unlock audio
    window.addEventListener('pointerdown', unlockSound, { once: true, passive: true });
    window.addEventListener('click', unlockSound, { once: true, passive: true });
    window.addEventListener('touchstart', unlockSound, { once: true, passive: true });
    
    // Defer heavy work behind initial paint
    requestIdle(() => {
      // Move version check to idle callback to not block initial render
      try {
        checkForUpdates();
      } catch (error) {
        console.warn('Version check failed:', error);
      }
    });
    
    return () => {
      window.removeEventListener('pointerdown', unlockSound);
      window.removeEventListener('click', unlockSound);
      window.removeEventListener('touchstart', unlockSound);
    };
  }, []);

  // Prefetch critical components after app has loaded
  React.useEffect(() => {
    prefetchCriticalComponents();
    // Run hub route verification in development
    if (process.env.NODE_ENV === 'development') {
      verifyHubRoutes();
    }
  }, []);

  return (
    <>
      <AuthUrlHandler />
      {/* Cold Start Splash Screen - shows immediately with highest priority */}
      <SplashScreen 
        isVisible={isColdStart} 
        onComplete={completeSplash} 
      />
      
      {/* Auth Processing Overlay - shows during magic link processing */}
      {isProcessing && <AuthProcessingOverlay />}
      
      {/* Main App Content - only render after splash completes */}
      {!isColdStart && (
        <>
          <BodyScanReminderChecker />
          <ClientSecurityValidator />
          <Suspense fallback={<SmartLoadingScreen><div /></SmartLoadingScreen>}>
            <OnboardingGate>
              <Routes>
                {/* Fullscreen pages without Layout */}
                <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />
              <Route path="/recovery-player" element={
                <ProtectedRoute>
                  <RecoveryPlayer />
                </ProtectedRoute>
              } />
              
              {/* Regular pages with Layout */}
              <Route path="*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/home" element={
                      <ProtectedRoute>
                        <HomeRouteWrapper />
                      </ProtectedRoute>
                    } />
                    <Route path="/camera" element={
                      <ProtectedRoute>
                        <Camera />
                      </ProtectedRoute>
                    } />
                    <Route path="/saved-logs" element={
                      <ProtectedRoute>
                        <SavedLogs />
                      </ProtectedRoute>
                    } />
                    <Route path="/analytics" element={
                      <ProtectedRoute>
                        <Analytics />
                      </ProtectedRoute>
                    } />
                    <Route path="/coach" element={
                      <ProtectedRoute>
                        <CoachMain />
                      </ProtectedRoute>
                    } />
                    <Route path="/explore" element={
                      <ProtectedRoute>
                        <Explore />
                      </ProtectedRoute>
                      } />
                      <Route path="/friends" element={
                        <ProtectedRoute>
                          <Friends />
                        </ProtectedRoute>
                      } />

                     {/* DEV-only Photo Sandbox route - force mount */}
                     {import.meta.env.DEV && (
                       <>
                         <Route
                           path="/debug/photo"
                           element={
                             <React.Suspense fallback={<div style={{ padding: 24 }}>Loading Photo Sandbox…</div>}>
                               <PhotoSandbox />
                             </React.Suspense>
                           }
                         />
                         <Route path="/debug/PHOTO" element={<Navigate to="/debug/photo" replace />} />
                       </>
                     )}

                    <Route path="/exercise-hub" element={
                      <ProtectedRoute>
                        <ExerciseHub />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                     } />
                      <Route path="/game-and-challenge" element={
                        <ProtectedRoute>
                          <GameAndChallengePage_Min />
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
                    
                    <Route path="/scan" element={
                      <ProtectedRoute>
                        <ScanHub />
                      </ProtectedRoute>
                    } />
                    
                    {/* Health Scan Routes - before wildcard */}
        <Route path="/health-scan/photo" element={
          FF.FEATURE_HEALTHSCAN_USE_OLD_MODAL ? (
            <Navigate to="/scan" replace />  // UNUSED when FEATURE_HEALTHSCAN_USE_OLD_MODAL
          ) : (
            <ProtectedRoute>
              <HealthScanPhoto />
            </ProtectedRoute>
          )
        } />
        <Route path="/health-scan/report" element={
          FF.FEATURE_HEALTHSCAN_USE_OLD_MODAL ? (
            <Navigate to="/scan" replace />  // UNUSED when FEATURE_HEALTHSCAN_USE_OLD_MODAL
          ) : (
            <ProtectedRoute>
              <HealthReport />
            </ProtectedRoute>
          )
        } />
                    
                    <Route path="/health-scan-photo" element={
                      FF.FEATURE_HEALTH_SCAN_PHOTO ? (
                        <Suspense fallback={<SmartLoadingScreen><div /></SmartLoadingScreen>}>
                          <HealthScanPhoto />
                        </Suspense>
                      ) : (
                        <div className="min-h-screen flex items-center justify-center bg-background">
                          <div className="text-center p-8">
                            <h1 className="text-2xl font-bold mb-4">Feature Not Available</h1>
                            <p className="text-muted-foreground mb-6">
                              Health Scan photo capture is not currently available.
                            </p>
                            <Button onClick={() => window.history.back()}>Go Back</Button>
                          </div>
                        </div>
                      )
                    } />
                    <Route path="/health-report" element={
                      FF.FEATURE_HEALTH_REPORT_V1 ? (
                        <Suspense fallback={<SmartLoadingScreen><div /></SmartLoadingScreen>}>
                          <HealthReport />
                        </Suspense>
                      ) : (
                        <div className="min-h-screen flex items-center justify-center bg-background">
                          <div className="text-center p-8">
                            <h1 className="text-2xl font-bold mb-4">Feature Not Available</h1>
                            <p className="text-muted-foreground mb-6">
                              Health Report is not currently available.
                            </p>
                            <Button onClick={() => window.history.back()}>Go Back</Button>
                          </div>
                        </div>
                      )
                    } />
                    <Route path="/speak-to-log" element={
                      <ProtectedRoute>
                        <SpeakToLog />
                      </ProtectedRoute>
                    } />
                    <Route path="/health/review" element={
                      <ProtectedRoute>
                        <HealthReviewStackPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/debug/detector-ping" element={
                      <ProtectedRoute>
                        <DetectorPing />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              } />
            </Routes>
          </OnboardingGate>
        </Suspense>
          
          <DailyMoodModal 
            isOpen={showMoodModal} 
            onClose={() => setShowMoodModal(false)} 
          />
          
          <Toaster />
        </>
      )}
    </>
  );
}

// Temporary stubs for hook-order isolation
const WorkoutCompletionProviderSafe: React.FC<React.PropsWithChildren> = ({ children }) => <>{children}</>;

function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <React.Suspense fallback={<div style={{padding:16}}>Loading…</div>}>
          <ErrorBoundary>
            <ThemeProvider>
              <HapticsProvider>
                <SoundProvider>
                  <TooltipProvider>
                    <IngredientAlertProvider>
                      <BadgeProvider>
                        <ChatModalProvider>
                          <RewardsProvider>
                            <LevelUpProvider>
                              <WorkoutCompletionProviderSafe>
                                <AppContent />
                                <WorkoutCompletionModal />
                              </WorkoutCompletionProviderSafe>
                            </LevelUpProvider>
                          </RewardsProvider>
                        </ChatModalProvider>
                      </BadgeProvider>
                    </IngredientAlertProvider>
                  </TooltipProvider>
                </SoundProvider>
              </HapticsProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </React.Suspense>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
