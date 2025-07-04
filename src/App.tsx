
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NutritionProvider } from "@/contexts/NutritionContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";
import Index from "@/pages/Index";
import Home from "@/pages/Home";
import Camera from "@/pages/Camera";
import Analytics from "@/pages/Analytics";
import Profile from "@/pages/Profile";
import Coach from "@/pages/Coach";
import Hydration from "@/pages/Hydration";
import Supplements from "@/pages/Supplements";
import ProgressCalories from "@/pages/ProgressCalories";
import ProgressProtein from "@/pages/ProgressProtein";
import ProgressCarbs from "@/pages/ProgressCarbs";
import ProgressFat from "@/pages/ProgressFat";
import ProgressHydration from "@/pages/ProgressHydration";
import ProgressSupplements from "@/pages/ProgressSupplements";
import AuthForm from "@/components/auth/AuthForm";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import FirebaseSetup from "@/pages/FirebaseSetup";
import NotFound from "@/pages/NotFound";
import InstallPrompt from "@/components/InstallPrompt";
import "./App.css";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/home" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <NutritionProvider>
                <NotificationProvider>
                  <div className="min-h-screen bg-background font-sans antialiased">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={
                        <PublicRoute>
                          <AuthForm />
                        </PublicRoute>
                      } />
                      <Route path="/onboarding" element={
                        <ProtectedRoute>
                          <OnboardingScreen />
                        </ProtectedRoute>
                      } />
                      <Route path="/firebase-setup" element={<FirebaseSetup />} />
                      <Route path="/*" element={
                        <ProtectedRoute>
                          <Layout>
                            <Routes>
                              <Route path="/home" element={<Home />} />
                              <Route path="/camera" element={<Camera />} />
                              <Route path="/analytics" element={<Analytics />} />
                              <Route path="/profile" element={<Profile />} />
                              <Route path="/coach" element={<Coach />} />
                              <Route path="/hydration" element={<Hydration />} />
                              <Route path="/supplements" element={<Supplements />} />
                              <Route path="/progress/calories" element={<ProgressCalories />} />
                              <Route path="/progress/protein" element={<ProgressProtein />} />
                              <Route path="/progress/carbs" element={<ProgressCarbs />} />
                              <Route path="/progress/fat" element={<ProgressFat />} />
                              <Route path="/progress/hydration" element={<ProgressHydration />} />
                              <Route path="/progress/supplements" element={<ProgressSupplements />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Layout>
                        </ProtectedRoute>
                      } />
                    </Routes>
                    <InstallPrompt />
                  </div>
                </NotificationProvider>
              </NutritionProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
