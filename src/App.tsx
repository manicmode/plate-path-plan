
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NutritionProvider } from "@/contexts/NutritionContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Camera from "./pages/Camera";
import Analytics from "./pages/Analytics";
import Coach from "./pages/Coach";
import Profile from "./pages/Profile";
import Hydration from "./pages/Hydration";
import Supplements from "./pages/Supplements";
import ProgressCalories from "./pages/ProgressCalories";
import ProgressProtein from "./pages/ProgressProtein";
import ProgressCarbs from "./pages/ProgressCarbs";
import ProgressFat from "./pages/ProgressFat";
import ProgressHydration from "./pages/ProgressHydration";
import ProgressSupplements from "./pages/ProgressSupplements";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

// Create query client with mobile-optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Reduce retries on mobile to prevent hanging
        const maxRetries = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 1 : 3;
        return failureCount < maxRetries;
      },
    },
  },
});

function App() {
  console.log('App component rendering...');

  useEffect(() => {
    console.log('App useEffect running...');
    
    // Simple app initialization without external dependencies
    const initializeApp = () => {
      try {
        console.log('App initialized successfully');
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(initializeApp, 100);

    return () => {
      console.log('App cleanup');
    };
  }, []);

  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-foreground">App Loading Error</h2>
          <p className="text-muted-foreground">
            There was an issue loading the app. Please refresh the page.
          </p>
          <button 
            onClick={() => {
              console.log('Manual refresh requested');
              window.location.reload();
            }} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    }>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <ErrorBoundary fallback={
              <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center space-y-4 max-w-md">
                  <h2 className="text-2xl font-bold text-foreground">Loading Error</h2>
                  <p className="text-muted-foreground">
                    There was an issue loading the authentication system. Please refresh the page.
                  </p>
                  <button 
                    onClick={() => {
                      console.log('Auth refresh requested');
                      window.location.reload();
                    }} 
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            }>
              <AuthProvider>
                <ErrorBoundary fallback={
                  <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="text-center space-y-4 max-w-md">
                      <h2 className="text-2xl font-bold text-foreground">Context Loading Error</h2>
                      <p className="text-muted-foreground">
                        There was an issue initializing the app contexts. Please try refreshing.
                      </p>
                      <button 
                        onClick={() => {
                          console.log('Context refresh requested');
                          window.location.reload();
                        }} 
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                      >
                        Refresh Page
                      </button>
                    </div>
                  </div>
                }>
                  <NutritionProvider>
                    <NotificationProvider>
                      <Toaster />
                      <BrowserRouter>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/home" element={<Layout><Home /></Layout>} />
                          <Route path="/camera" element={<Layout><Camera /></Layout>} />
                          <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
                          <Route path="/coach" element={<Layout><Coach /></Layout>} />
                          <Route path="/profile" element={<Layout><Profile /></Layout>} />
                          <Route path="/hydration" element={<Layout><Hydration /></Layout>} />
                          <Route path="/supplements" element={<Layout><Supplements /></Layout>} />
                          <Route path="/progress/calories" element={<Layout><ProgressCalories /></Layout>} />
                          <Route path="/progress/protein" element={<Layout><ProgressProtein /></Layout>} />
                          <Route path="/progress/carbs" element={<Layout><ProgressCarbs /></Layout>} />
                          <Route path="/progress/fat" element={<Layout><ProgressFat /></Layout>} />
                          <Route path="/progress/hydration" element={<Layout><ProgressHydration /></Layout>} />
                          <Route path="/progress/supplements" element={<Layout><ProgressSupplements /></Layout>} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </BrowserRouter>
                    </NotificationProvider>
                  </NutritionProvider>
                </ErrorBoundary>
              </AuthProvider>
            </ErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
