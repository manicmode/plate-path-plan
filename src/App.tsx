
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NutritionProvider } from "@/contexts/NutritionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Camera from "./pages/Camera";
import Hydration from "./pages/Hydration";
import Supplements from "./pages/Supplements";
import Analytics from "./pages/Analytics";
import Coach from "./pages/Coach";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Index />;
  }
  
  return <Layout>{children}</Layout>;
};

const App = () => {
  console.log('App component rendering');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeProvider>
          <AuthProvider>
            <NutritionProvider>
              <BrowserRouter>
                <div className="min-h-screen">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/camera" element={
                      <ProtectedRoute>
                        <Camera />
                      </ProtectedRoute>
                    } />
                    <Route path="/hydration" element={
                      <ProtectedRoute>
                        <Hydration />
                      </ProtectedRoute>
                    } />
                    <Route path="/supplements" element={
                      <ProtectedRoute>
                        <Supplements />
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
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </BrowserRouter>
            </NutritionProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
