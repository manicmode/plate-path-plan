import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppErrorBoundary from '@/components/system/AppErrorBoundary';
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
import ErrorBoundary from '@/components/ErrorBoundary';
import { useColdStart } from '@/hooks/useColdStart';
import { SplashScreen } from '@/components/SplashScreen';
import { LevelUpProvider } from '@/contexts/LevelUpContext';

// Import QA tools unconditionally
import('@/scripts/nudgeQARunner');

// Core pages
const Index = lazy(() => import('@/pages/Index'));
const Home = lazy(() => import('@/pages/Home'));
const Camera = lazy(() => import('@/pages/Camera'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Profile = lazy(() => import('@/pages/Profile'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const NudgeQAPage = lazy(() => import('@/pages/NudgeQAPage'));

function AppContent() {
  const { isColdStart, completeSplash } = useColdStart();

  useEffect(() => {
    console.log('[App] mounted');
  }, []);

  return (
    <>
      <SplashScreen 
        isVisible={isColdStart} 
        onComplete={completeSplash} 
      />
      
      {!isColdStart && (
        <Suspense fallback={<SmartLoadingScreen><div /></SmartLoadingScreen>}>
          <Routes>
            {/* QA ROUTES - TOP PRIORITY */}
            <Route 
              path="/qa/nudges" 
              element={
                <Suspense fallback={<div style={{padding:24}}>Loading QA...</div>}>
                  <NudgeQAPage />
                </Suspense>
              } 
            />
            <Route path="/nudge-qa" element={<Navigate to="/qa/nudges" replace />} />
            <Route path="/debug/nudges" element={<Navigate to="/qa/nudges" replace />} />
            <Route 
              path="/test" 
              element={<div style={{padding:50, background:'blue', color:'white', fontSize:20}}>✅ TEST WORKS!</div>} 
            />
            
            {/* Main app routes with Layout */}
            <Route path="/" element={<Index />} />
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
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* 404 fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      )}
      
      <Toaster />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
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
                            <AppContent />
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
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

export default App;