
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Camera, MessageCircle, Compass, Moon, Sun, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatModal } from '@/contexts/ChatModalContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const { isChatModalOpen } = useChatModal();
  const [isNavigating, setIsNavigating] = useState(false);

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/camera', icon: Camera, label: 'Log' },
    { path: '/analytics', icon: BarChart3, label: 'Progress' },
    { path: '/coach', icon: MessageCircle, label: 'Coach' },
    { path: '/explore', icon: Compass, label: 'Explore' },
  ];

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, []);

  const handleNavigation = useCallback((path: string) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    
    // For camera/log tab, always navigate to main camera page and reset any sub-tab state
    if (path === '/camera') {
      // Use URL search parameter to signal camera reset, then navigate normally
      navigate('/camera?reset=true', { replace: true });
      setTimeout(() => {
        scrollToTop();
        setIsNavigating(false);
      }, 150);
      return;
    }
    
    // Always scroll to top when any tab is clicked, even if it's the current route
    scrollToTop();
    
    // Navigate to the path if not already there
    if (location.pathname !== path) {
      navigate(path);
    }
    
    // Reset navigation state after a small delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 150);
  }, [navigate, location.pathname, isNavigating, scrollToTop]);

  // Reset navigation state when location changes
  useEffect(() => {
    setIsNavigating(false);
  }, [location.pathname]);

  // Enhanced active state check that includes sub-routes
  const isTabActive = useCallback((path: string) => {
    if (path === '/explore') {
      // Make explore tab active for both /explore and /game-and-challenge
      return location.pathname === '/explore' || location.pathname === '/game-and-challenge';
    }
    return location.pathname === path;
  }, [location.pathname]);

  // Show only header for unauthenticated users on non-auth pages
  const shouldShowNavigation = isAuthenticated && location.pathname !== '/';

  return (
    <div className="min-h-screen gradient-main transition-all duration-300">
      {/* Enhanced Header with better spacing */}
      <header className="glass-card sticky top-0 z-50 border-0 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} gradient-primary rounded-2xl flex items-center justify-center neon-glow`}>
              <span className={`text-white font-bold ${isMobile ? 'text-sm' : 'text-lg'}`}>N</span>
            </div>
            <div>
              <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>NutriCoach</h1>
              <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-600 dark:text-gray-300 font-medium`}>AI Wellness Assistant</p>
            </div>
          </div>
          
          {/* Enhanced Dark Mode Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className={`flex items-center space-x-1 sm:space-x-2 bg-gray-100 dark:bg-gray-800 ${isMobile ? 'px-2 py-1' : 'px-4 py-2'} rounded-xl border-2 border-gray-400 dark:border-gray-600`}>
              <Sun className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} transition-colors ${!isDarkMode ? 'text-yellow-500' : 'text-gray-400'}`} />
              <Switch
                checked={isDarkMode}
                onCheckedChange={toggleDarkMode}
                className="data-[state=checked]:bg-blue-600 border-2 border-gray-600"
              />
              <Moon className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} transition-colors ${isDarkMode ? 'text-blue-400' : 'text-gray-500'}`} />
            </div>
            {!isMobile && <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full neon-glow animate-pulse"></div>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8 ${
        shouldShowNavigation ? (isMobile ? 'pb-40' : 'pb-60') : 'pb-8'
      } min-h-[calc(100vh-140px)]`}>
        {children}
      </main>

      {/* Enhanced Bottom Navigation - Only show for authenticated users and hide when chat modal is open */}
      {shouldShowNavigation && !isChatModalOpen && (
        <nav className={`fixed ${isMobile ? 'bottom-3 left-3 right-3' : 'bottom-6 left-1/2 transform -translate-x-1/2'} z-50`}>
          <div className="bg-white/98 dark:bg-gray-900/98 backdrop-blur-2xl rounded-3xl px-3 sm:px-6 py-4 sm:py-5 shadow-2xl border-2 border-white/60 dark:border-gray-700/60">
            <div className={`flex ${isMobile ? 'justify-between gap-1' : 'space-x-4'}`}>
              {navItems.map(({ path, icon: Icon, label }) => {
                const isActive = isTabActive(path);
                return (
                  <Button
                    key={path}
                    variant="ghost"
                    size="sm"
                    disabled={isNavigating}
                    className={`flex flex-col items-center justify-center space-y-1 ${
                      isMobile 
                        ? 'h-16 px-2 min-w-[60px] flex-1' 
                        : 'h-20 w-24 px-4'
                    } rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? '!bg-gradient-to-br !from-blue-500 !via-purple-500 !to-indigo-600 !text-white !shadow-2xl !scale-110 !ring-4 !ring-blue-400/30 !ring-offset-2 !ring-offset-white dark:!ring-offset-gray-900' 
                        : 'glass-button text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:scale-105'
                    } ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handleNavigation(path)}
                  >
                    <Icon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} ${isActive ? 'animate-pulse' : ''} flex-shrink-0`} />
                    <span className={`${
                      isMobile ? 'text-xs' : 'text-sm'
                    } font-semibold leading-tight text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full`}>
                      {label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
