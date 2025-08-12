
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Camera, MessageCircle, Compass, Moon, Sun, BarChart3, FileText } from 'lucide-react';
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
  if (import.meta.env.DEV) console.log("[hooks-order-ok] Layout");
  
  // CSS custom properties for bottom nav
  useEffect(() => {
    document.documentElement.style.setProperty('--tabbar-height', '72px');
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const { isChatModalOpen } = useChatModal();
  const [isNavigating, setIsNavigating] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // [nav-restore-2025-08-11] begin
  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/camera', icon: Camera, label: 'Log' },
    { path: '/analytics', icon: BarChart3, label: 'Progress' },
    { path: '/coach', icon: MessageCircle, label: 'Coach' },
    { path: '/explore', icon: Compass, label: 'Explore' },
  ];
  // [nav-restore-2025-08-11] end

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, []);

  const handleNavigation = useCallback((path: string) => {
    if (isNavigating) return;
    
    // For camera/log tab, always navigate to main camera page and reset any sub-tab state
    if (path === '/camera') {
      setIsNavigating(true);
      // Use URL search parameter to signal camera reset, then navigate normally
      navigate('/camera?reset=true', { replace: true });
      setTimeout(() => {
        scrollToTop();
        setIsNavigating(false);
      }, 150);
      return;
    }
    
    // For other paths, only navigate if not already there
    if (location.pathname === path) return;
    
    setIsNavigating(true);
    
    // Navigate first
    navigate(path);
    
    // Then scroll to top after a small delay
    setTimeout(() => {
      scrollToTop();
      setIsNavigating(false);
    }, 150);
  }, [navigate, location.pathname, isNavigating, scrollToTop]);

  // Reset navigation state when location changes
  useEffect(() => {
    setIsNavigating(false);
  }, [location.pathname]);

  // Expose app header height as a CSS variable for page headers
  useEffect(() => {
    const setVar = () => {
      const h = headerRef.current?.offsetHeight || 64; // fallback 64px
      document.documentElement.style.setProperty("--app-header-height", `${h}px`);
    };
    setVar();
    window.addEventListener("resize", setVar);
    return () => window.removeEventListener("resize", setVar);
  }, []);

  // [nav-restore-2025-08-11] begin
  // Show only header for unauthenticated users on non-auth pages
  const shouldShowNavigation = isAuthenticated && location.pathname !== '/';
  
  // Debug logging for navigation visibility
  if (import.meta.env.DEV) {
    console.log('[Navigation Debug]', {
      isAuthenticated,
      pathname: location.pathname,
      shouldShowNavigation,
      isChatModalOpen
    });
  }
  // [nav-restore-2025-08-11] end

  // Special handling for explore page to prevent scrolling
  const isExplorePage = location.pathname === '/explore';

  return (
    <div className="min-h-screen gradient-main transition-all duration-300">
      {/* Enhanced Header with better spacing */}
      <header className="glass-card sticky top-0 z-50 border-0 backdrop-blur-xl">
        <div ref={headerRef} className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-r from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center neon-glow animate-pulse`}>
              <img 
                src="/lovable-uploads/06077524-4274-4512-a53f-779d8e98607f.png" 
                alt="VOYAGE Winged V Logo" 
                className={`${isMobile ? 'w-9 h-9' : 'w-12 h-12'} object-contain`}
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <div>
              <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>VOYAGE</h1>
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
            
          </div>
        </div>
      </header>

      {/* Main Content with safe area padding for bottom nav */}
      <main
        className={`max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8 ${
          shouldShowNavigation ? (
            isExplorePage 
              ? 'pb-20' // Reduced padding for explore page
              : 'pb-[max(env(safe-area-inset-bottom),var(--tabbar-height))]'
          ) : 'pb-8'
        } ${
          isExplorePage 
            ? 'h-[calc(100vh-160px)] md:min-h-[calc(100vh-140px)] md:h-auto' // Fixed height only on mobile; allow natural height on desktop
            : 'min-h-[calc(100vh-140px)]'
        } md:pb-[120px]`}
      >
        {children}
      </main>

      {/* Enhanced Bottom Navigation - Always visible for authenticated users */}
      {shouldShowNavigation && (
        <nav className={`fixed bottom-0 left-0 right-0 z-50 ${isMobile ? 'p-3' : 'pb-6 px-6'}`}>
          <div className={`bg-white/98 dark:bg-gray-900/98 backdrop-blur-2xl ${isMobile ? 'rounded-t-3xl mx-0' : 'rounded-3xl max-w-md mx-auto'} px-3 sm:px-6 py-4 sm:py-5 shadow-2xl border-2 border-white/60 dark:border-gray-700/60 md:max-w-[620px] md:mx-auto`}>
            <div className={`flex ${isMobile ? 'justify-between gap-1' : 'space-x-4'}`}>
              {navItems.map(({ path, icon: Icon, label }) => {
                const isActive = location.pathname === path;
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
                    } md:flex-1 md:min-w-0 md:w-auto rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? 'gradient-primary text-white neon-glow scale-105 shadow-lg' 
                        : 'glass-button text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:scale-105'
                    } ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handleNavigation(path)}
                  >
                    <Icon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} ${isActive ? 'animate-pulse' : ''} flex-shrink-0`} />
                    <span className={`${
                      isMobile ? 'text-xs' : 'text-sm'
                    } font-semibold leading-tight text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full md:truncate`}>
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
