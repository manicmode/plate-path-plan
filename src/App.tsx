
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

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
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
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
