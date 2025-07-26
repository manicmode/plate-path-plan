
import { Suspense, lazy, useContext, useState, useEffect } from 'react';
import { AuthProvider, AuthContext } from './contexts/auth';
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
import HomePageErrorBoundary from '@/components/HomePageErrorBoundary';
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
  console.log('🏁 AppContent: Starting render...');
  
  const auth = useContext(AuthContext);
  console.log('🔐 AppContent: Auth context retrieved:', { 
    hasAuth: !!auth, 
    loading: auth?.loading, 
    user: !!auth?.user,
    session: !!auth?.session 
  });

  try {
    const { showMoodModal, setShowMoodModal } = useDailyMoodScheduler();
    console.log('😊 AppContent: Daily mood scheduler initialized');
    
    useBodyScanTimelineReminder();
    console.log('📱 AppContent: Body scan timeline reminder initialized');
    
    useBodyScanSharingReminder();
    console.log('📤 AppContent: Body scan sharing reminder initialized');

    // ✅ CRITICAL: Wait for auth initialization before routing decisions
    if (auth?.loading) {
      console.log('⏳ AppContent: Auth still loading, showing loading screen...');
      return <LoadingScreen />;
    }

    // ✅ Prevent premature mounting of protected content when no session
    if (!auth?.loading && auth?.session === null && window.location.pathname !== '/' && window.location.pathname !== '/sign-in') {
      console.log('🚨 AppContent: No session detected on protected route, will let ProtectedRoute handle redirect');
    }

    console.log('✅ AppContent: Auth initialized, rendering routes...');

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
                      <HomePageErrorBoundary>
                        <Home />
                      </HomePageErrorBoundary>
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
  } catch (error) {
    console.error('🚨 AppContent: Critical error during render:', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">App Content Error</h2>
          <p className="text-muted-foreground">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}

function App() {
  const [isReady, setIsReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    console.log('🚀 App: Starting initialization...');
    
    // Detect mobile environment
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    console.log('📱 App: Environment detection:', { isMobile, isIOS, isSafari });
    
    // Collect debug info
    const debug = {
      userAgent: navigator.userAgent,
      isMobile, isIOS, isSafari,
      localStorage: (() => {
        try {
          return {
            available: true,
            keys: Object.keys(localStorage).length,
            authKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-')).length
          };
        } catch (e) {
          return { available: false, error: e instanceof Error ? e.message : 'Unknown' };
        }
      })(),
      sessionStorage: (() => {
        try {
          return {
            available: true,
            keys: Object.keys(sessionStorage).length
          };
        } catch (e) {
          return { available: false, error: e instanceof Error ? e.message : 'Unknown' };
        }
      })(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      timestamp: new Date().toISOString()
    };
    
    setDebugInfo(debug);
    console.log('📊 App: Debug info collected:', debug);
    
    // Add delay for mobile to allow proper initialization
    const delay = isMobile ? 1000 : 500;
    console.log(`⏰ App: Adding ${delay}ms initialization delay for ${isMobile ? 'mobile' : 'desktop'}`);
    
    setTimeout(() => {
      console.log('✅ App: Initialization complete, setting ready state');
      setIsReady(true);
    }, delay);
  }, []);

  if (!isReady) {
    console.log('⏳ App: Still initializing, showing loading screen');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Initializing app...</p>
        </div>
      </div>
    );
  }

  console.log('🎯 App: Ready to render main app');

  try {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorBoundary 
            fallback={
              <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center space-y-4 max-w-md">
                  <h2 className="text-xl font-bold text-foreground">Critical App Error</h2>
                  <p className="text-sm text-muted-foreground">The app failed to initialize properly.</p>
                  <details className="text-left bg-muted p-3 rounded text-xs">
                    <summary className="cursor-pointer font-medium mb-2">Debug Info</summary>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
                  </details>
                  <button 
                    onClick={() => {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded"
                  >
                    Clear Data & Reload
                  </button>
                </div>
              </div>
            }
          >
            <ThemeProvider>
              <TooltipProvider>
                <AuthProvider>
                  <ErrorBoundary>
                    <IngredientAlertProvider>
                      <BadgeProvider>
                        <ChatModalProvider>
                          <ErrorBoundary>
                            <AppContent />
                          </ErrorBoundary>
                        </ChatModalProvider>
                      </BadgeProvider>
                    </IngredientAlertProvider>
                  </ErrorBoundary>
                </AuthProvider>
              </TooltipProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('🚨 App: Critical error in main render:', error);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl mb-4">💥</div>
          <h2 className="text-xl font-bold text-foreground">App Crash</h2>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <details className="text-left bg-muted p-3 rounded text-xs">
            <summary className="cursor-pointer font-medium mb-2">Session State</summary>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify({
                debugInfo,
                error: error instanceof Error ? {
                  message: error.message,
                  stack: error.stack?.slice(0, 500)
                } : error,
                timestamp: new Date().toISOString()
              }, null, 2)}
            </pre>
          </details>
          <button 
            onClick={() => {
              console.log('🔄 [MANUAL RELOAD] User clicked manual reload after crash');
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded"
          >
            Force Reload
          </button>
        </div>
      </div>
    );
  }
}

export default App;
