
import React, { Suspense, lazy, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import BodyScanReminderChecker from '@/components/BodyScanReminderChecker';
import { TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import AppErrorBoundary from '@/components/system/AppErrorBoundary';
import { requestIdle } from '@/utils/safeIdle';
import { ROUTES } from '@/routes/constants';
import { APP_CONFIG } from '@/config/app';
import { verifyHubRoutes } from '@/utils/hubRouteCheck';

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// MicJanitor - Kill stray audio tracks on scanner routes
function MicJanitor() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isScanner = /^\/(scan|health-scan|barcode|photo)(\/|$)/i.test(pathname);
    if (!isScanner) return;

    // Stop any accidental mic tracks attached to elements
    const els = Array.from(document.querySelectorAll('video,audio')) as (HTMLVideoElement|HTMLAudioElement)[];
    for (const el of els) {
      const s = (el as any).srcObject as MediaStream | null;
      const ats = s?.getAudioTracks?.() || [];
      ats.forEach(t => { try { t.stop(); } catch {} try { s?.removeTrack(t); } catch {} });
    }
    console.warn('[MIC-JANITOR] Stopped stray audio tracks on', pathname);
  }, [pathname]);
  return null;
}


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


// Route wrapper for Home that bypasses lazy loading post-onboarding
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
const BodyScanAI = lazy(() => import('@/pages/BodyScanAI'));
const SideBodyScan = lazy(() => import('@/pages/SideBodyScan'));

const BackBodyScan = lazy(() => import('@/pages/BackBodyScan'));
const BodyScanResults = lazy(() => import('@/pages/BodyScanResults'));
const BodyScanResult = lazy(() => import('@/pages/BodyScanResult'));
const BodyScanCompare = lazy(() => import('@/pages/BodyScanCompare'));
const BodyScanHistory = lazy(() => import('@/pages/BodyScanHistory'));
const SecurityLogsPage = lazy(() => import('@/pages/admin/SecurityLogsPage'));
const SynonymsPage = lazy(() => import('@/pages/admin/SynonymsPage'));
const SearchInsightsPage = lazy(() => import('@/pages/admin/SearchInsightsPage'));
const RoutineExecutionPage = lazy(() => import('@/pages/RoutineExecutionPage'));
const RoutinePlayerPage = lazy(() => import('@/pages/RoutinePlayerPage'));
const GuidedWorkoutPage = lazy(() => import('@/pages/GuidedWorkoutPage'));
const SharedRoutine = lazy(() => import('@/pages/SharedRoutine'));
const PublicShare = lazy(() => import('@/pages/share/PublicShare'));
const InfluencerRedirect = lazy(() => import('@/pages/InfluencerRedirect'));
const InfluencerPortal = lazy(() => import('@/pages/InfluencerPortal'));
const ChallengePreview = lazy(() => import('@/pages/ChallengePreview'));
const PublicInfluencerProfile = lazy(() => import('@/pages/PublicInfluencerProfile'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const InfluencerHub = lazy(() => import('@/pages/InfluencerHub'));
const InfluencerDashboard = lazy(() => import('@/pages/InfluencerDashboard'));
const DevChallengesPage = lazy(() => import('@/pages/dev/challenges-test'));
const HabitCentralPage = lazy(() => import('@/pages/HabitCentralV2'));
const FeatureFlagsPage = lazy(() => import('@/pages/FeatureFlagsPage'));
const DebugRoutes = lazy(() => import('@/pages/DebugRoutes'));
const ScanHub = lazy(() => import('@/pages/ScanHub'));
const ScanRecents = lazy(() => import('@/pages/ScanRecents'));
// Voice Agent - New realtime voice system
const VoiceAgent = lazy(() => import('@/pages/VoiceAgent'));
// ArenaDebug removed - V1 legacy


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
  
  // STEP 2: Forensics performance marker and theme tracing
  useEffect(() => { 
    performance.mark('react:mounted'); 
    console.log('[boot] react:mounted'); 
    console.log('[boot+100ms] html.class after mount:', document.documentElement.className);
    setTimeout(() => console.log('[boot+100ms] html.class delayed:', document.documentElement.className), 100);
    
    // Defer heavy work behind initial paint
    requestIdle(() => {
      // Move version check to idle callback to not block initial render
      try {
        checkForUpdates();
      } catch (error) {
        console.warn('Version check failed:', error);
      }
    });
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
          <MicJanitor />
          <Suspense fallback={<SmartLoadingScreen><div /></SmartLoadingScreen>}>
            <OnboardingGate>
              <Routes>
                {/* Fullscreen pages without Layout */}
                <Route path="/s/:shareId" element={<PublicShare />} />
                <Route path="/shared-routine" element={<SharedRoutine />} />
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
                        <HomeRouteWrapper />
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
                    <Route path="/exercise-hub" element={
                      <ProtectedRoute>
                        <ExerciseHub />
                      </ProtectedRoute>
                    } />
                    <Route path="/exercise/intelligent" element={
                      <ProtectedRoute>
                        <IntelligentWorkoutPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/ai-routine-viewer" element={
                      <ProtectedRoute>
                        <AIRoutineViewer />
                      </ProtectedRoute>
                    } />
                    <Route path="/routine-execution" element={
                      <ProtectedRoute>
                        <RoutineExecutionPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/routine-player/:week/:day" element={
                      <ProtectedRoute>
                        <RoutinePlayerPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/guided-workout/:week/:day" element={
                      <ProtectedRoute>
                        <GuidedWorkoutPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/recovery-center" element={
                      <ProtectedRoute>
                        <RecoveryCenter />
                      </ProtectedRoute>
                    } />
                    <Route path="/guided-meditation" element={
                      <ProtectedRoute>
                        <GuidedMeditation />
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
                          <GameAndChallengePage_Min />
                        </ProtectedRoute>
                      } />
                      <Route path="/habit" element={
                        <ProtectedRoute>
                          <HabitCentralPage />
                        </ProtectedRoute>
                      } />
                      {/* Voice Agent - New realtime voice system */}
                      <Route path="/voice-agent" element={
                        <ProtectedRoute>
                          <VoiceAgent />
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
                    <Route path="/supplements/:slug" element={
                      <ProtectedRoute>
                        <SupplementDetail />
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
                    <Route path="/body-scan-result" element={
                      <ProtectedRoute>
                        <BodyScanResult />
                      </ProtectedRoute>
                    } />
                    <Route path="/body-scan-compare" element={
                      <ProtectedRoute>
                        <BodyScanCompare />
                      </ProtectedRoute>
                     } />
                     <Route path="/body-scan-history" element={
                       <ProtectedRoute>
                         <BodyScanHistory />
                       </ProtectedRoute>
                     } />
                    <Route path="/firebase-setup" element={
                      <ProtectedRoute>
                        <FirebaseSetup />
                      </ProtectedRoute>
                    } />
                    <Route path="/recovery/breathing" element={
                      <ProtectedRoute>
                        <BreathingPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/recovery/stretching" element={
                      <ProtectedRoute>
                        <StretchingPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/recovery/muscle-recovery" element={
                      <ProtectedRoute>
                        <MuscleRecoveryPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/recovery/sleep" element={
                      <ProtectedRoute>
                        <SleepPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/recovery/yoga" element={
                      <ProtectedRoute>
                        <YogaPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/recovery-analytics" element={
                      <ProtectedRoute>
                        <RecoveryAnalyticsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin-dashboard" element={
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
                    <Route path="/influencer-hub" element={
                      <ProtectedRoute>
                        <InfluencerHub />
                      </ProtectedRoute>
                    } />
                    <Route path="/influencer-dashboard" element={
                      <ProtectedRoute>
                        <InfluencerDashboard />
                      </ProtectedRoute>
                    } />
                    {/* Legacy redirects */}
                    <Route path="/influencer" element={<Navigate to={ROUTES.INFLUENCER_HUB} replace />} />
                     <Route path="/admin/security-logs" element={
                       <ProtectedRoute>
                         <SecurityLogsPage />
                       </ProtectedRoute>
                     } />
                     <Route path="/admin/synonyms" element={
                       <ProtectedRoute>
                         <SynonymsPage />
                       </ProtectedRoute>
                     } />
                     <Route path="/admin/search-insights" element={
                       <ProtectedRoute>
                         <SearchInsightsPage />
                       </ProtectedRoute>
                     } />
                     {/* Legacy redirect for old influencer routes */}
                     <Route path="/challenge-preview/:id" element={
                      <ProtectedRoute>
                        <ChallengePreview />
                      </ProtectedRoute>
                    } />
                       <Route path="/dev/challenges" element={
                         <ProtectedRoute>
                           <DevChallengesPage />
                         </ProtectedRoute>
                        } />
                           <Route path="/feature-flags" element={
                             <ProtectedRoute>
                               <FeatureFlagsPage />
                             </ProtectedRoute>
                           } />
                           
                           {/* Scan Hub Routes */}
                           <Route path="/scan" element={
                             <ProtectedRoute>
                               <ScanHub />
                             </ProtectedRoute>
                           } />
                           <Route path="/scan/recents" element={
                             <ProtectedRoute>
                               <ScanRecents />
                             </ProtectedRoute>
                           } />
                           
                         {/* Debug routes for developers */}
                          <Route path="/debug/*" element={
                            <ProtectedRoute>
                              <DebugRoutes />
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
          
          {/* Global Mystery Gift Box - Always Floating */}
          <MysteryBoxSafe />
          
          <Toaster />
        </>
      )}
    </>
  );
}

// Temporary stubs for hook-order isolation
const WorkoutCompletionProviderSafe: React.FC<React.PropsWithChildren> = ({ children }) => <>{children}</>;
const MysteryBoxSafe: React.FC = () => null;

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
