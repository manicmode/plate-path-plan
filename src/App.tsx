
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NutritionProvider } from "@/contexts/NutritionContext";
import Layout from "@/components/Layout";
import Index from "@/pages/Index";
import Home from "@/pages/Home";
import Camera from "@/pages/Camera";
import Analytics from "@/pages/Analytics";
import Coach from "@/pages/Coach";
import Profile from "@/pages/Profile";
import Hydration from "@/pages/Hydration";
import Supplements from "@/pages/Supplements";
import NotFound from "@/pages/NotFound";
import AllergenAlarm from "@/components/AllergenAlarm";
import { useAllergenDetection } from "@/hooks/useAllergenDetection";
import "./App.css";

const queryClient = new QueryClient();

function AppContent() {
  const { detectedAllergens, clearAllergenAlert } = useAllergenDetection();

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/camera" element={<Camera />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/hydration" element={<Hydration />} />
          <Route path="/supplements" element={<Supplements />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
      
      {/* Allergen Alarm Component */}
      <AllergenAlarm 
        detectedAllergens={detectedAllergens}
        onDismiss={clearAllergenAlert}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NutritionProvider>
            <TooltipProvider>
              <BrowserRouter>
                <AppContent />
                <Toaster />
                <Sonner />
              </BrowserRouter>
            </TooltipProvider>
          </NutritionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
