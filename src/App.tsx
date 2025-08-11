
import React, { Suspense, lazy, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import BodyScanReminderChecker from '@/components/BodyScanReminderChecker';
import { TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';


import { ThemeProvider } from '@/contexts/ThemeContext';
import { IngredientAlertProvider } from '@/contexts/IngredientAlertContext';
import { BadgeProvider } from '@/contexts/BadgeContext';
import { ChatModalProvider } from '@/contexts/ChatModalContext';
import { SoundProvider } from '@/contexts/SoundContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import Layout from '@/components/Layout';
import { SmartLoadingScreen } from '@/components/SmartLoadingScreen';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
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
const BodyScanResult = lazy(() => import('@/pages/BodyScanResult'));
const BodyScanCompare = lazy(() => import('@/pages/BodyScanCompare'));
const BodyScanHistory = lazy(() => import('@/pages/BodyScanHistory'));
const SecurityLogsPage = lazy(() => import('@/pages/admin/SecurityLogsPage'));
const RoutineExecutionPage = lazy(() => import('@/pages/RoutineExecutionPage'));
const RoutinePlayerPage = lazy(() => import('@/pages/RoutinePlayerPage'));
const GuidedWorkoutPage = lazy(() => import('@/pages/GuidedWorkoutPage'));
const SharedRoutine = lazy(() => import('@/pages/SharedRoutine'));
const PublicShare = lazy(() => import('@/pages/share/PublicShare'));
const InfluencerPortal = lazy(() => import('@/pages/InfluencerPortal'));
const ChallengePreview = lazy(() => import('@/pages/ChallengePreview'));
const PublicInfluencerProfile = lazy(() => import('@/pages/PublicInfluencerProfile'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const InfluencerDashboard = lazy(() => import('@/pages/InfluencerDashboard'));
const DevChallengesPage = lazy(() => import('@/pages/dev/challenges-test'));

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


function AppContent() {
  const { showMoodModal, setShowMoodModal } = useDailyMoodScheduler();
  const { isColdStart, completeSplash } = useColdStart();
  const { isProcessing } = useAuthCallback();
  const { checkForUpdates } = useVersionCheck(); // Add version checking
  useBodyScanTimelineReminder();
  useBodyScanSharingReminder();
  
  // Mobile detection for debugging
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  


  // Prefetch critical components after app has loaded
  React.useEffect(() => {
    prefetchCriticalComponents();
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
      
      {/* BISECTION TEST: Minimal placeholder to isolate hook order error */}
      {!isColdStart && (
        <div style={{ padding: '20px', fontSize: '24px', textAlign: 'center' }}>
          ✅ BOOT OK - Basic React render working
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
        <ErrorBoundary>
        <ThemeProvider>
          <SoundProvider>
            <TooltipProvider>
              <IngredientAlertProvider>
                <BadgeProvider>
                  <ChatModalProvider>
                    <RewardsProvider>
                      <LevelUpProvider>
                        <WorkoutCompletionProvider>
                          <AppContent />
                          
                          <WorkoutCompletionModal />
                        </WorkoutCompletionProvider>
                      </LevelUpProvider>
                    </RewardsProvider>
                  </ChatModalProvider>
                </BadgeProvider>
              </IngredientAlertProvider>
            </TooltipProvider>
          </SoundProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
