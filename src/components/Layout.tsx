
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Camera, MessageCircle, Compass, Moon, Sun, BarChart3, FileText, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatModal } from '@/contexts/ChatModalContext';
import { useVoiceCoachAllowed } from '@/features/voicecoach/flags';
import { useDueHabitsCount } from '@/hooks/useDueHabitsCount';
import ReminderBell from '@/components/ReminderBell';
import { useImmersive } from '@/lib/uiChrome';


interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  if (import.meta.env.DEV) console.log("[hooks-order-ok] Layout");
  
  const navRef = useRef<HTMLDivElement>(null);
  
  // CSS custom properties for bottom nav
  useEffect(() => {
    document.documentElement.style.setProperty('--tabbar-height', '72px');
  }, []);

  // Dynamic nav height measurement
  useEffect(() => {
    const set = () => {
      const h = navRef.current?.offsetHeight ?? 76;
      document.documentElement.style.setProperty('--bottom-nav-h', `${h}px`);
      if (import.meta.env.VITE_DEBUG_NAV === '1') {
        console.log('[NAV][MEASURE]', { rev: '2025-08-31T17:35Z-r2', h });
      }
    };

    set();

    const ro = new ResizeObserver(() => requestAnimationFrame(set));
    if (navRef.current) ro.observe(navRef.current);

    const onVis = () => requestAnimationFrame(set);
    const onOrient = () => requestAnimationFrame(set);
    window.addEventListener('visibilitychange', onVis);
    window.addEventListener('orientationchange', onOrient);

    return () => {
      ro.disconnect();
      window.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('orientationchange', onOrient);
    };
  }, []);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const { isChatModalOpen } = useChatModal();
  const [isNavigating, setIsNavigating] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const voiceCoachAllowed = useVoiceCoachAllowed();
  const dueHabitsCount = useDueHabitsCount();
  const immersive = useImmersive();

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

  // Reset navigation state when location changes and guard root redirect
  useEffect(() => {
    setIsNavigating(false);
    // Hard guard: if authenticated and somehow landed on '/', redirect to '/home'
    if (location.pathname === '/' && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [location.pathname, isAuthenticated, navigate]);

  // Handle keyboard shortcut for microphone (m key)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && voiceCoachAllowed && isAuthenticated) {
      // Check if we're not in an input field
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
        e.preventDefault();
        navigate('/voice-agent');
      }
    }
  }, [navigate, voiceCoachAllowed, isAuthenticated]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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

  // [nav-restore-2025-08-31] begin - Updated with immersive controller
  // Hide navigation on specific fullscreen/camera pages OR when immersive mode is active
  const hideNavPaths = [
    '/',
    '/body-scan-ai', '/body-scan-side', '/body-scan-back',
    '/body-scan-results', '/body-scan-result', '/body-scan-compare', '/body-scan-history'
  ];
  
  const shouldHideNavigation = !isAuthenticated || 
    hideNavPaths.includes(location.pathname) ||
    location.pathname.startsWith('/scan/') ||  // All scan sub-pages
    immersive;  // Global immersive state from uiChrome controller
  
  const shouldShowNavigation = !shouldHideNavigation;
  
  // Debug logging for navigation visibility with immersive state
  if (import.meta.env.VITE_DEBUG_NAV === "1") {
    console.log('[NAV][RENDER]', {
      rev: "2025-08-31T16:55Z",
      isAuthenticated,
      pathname: location.pathname,
      immersive,
      shouldHideNavigation,
      shouldShowNavigation,
      isChatModalOpen
    });
  }
  // [nav-restore-2025-08-31] end

  // Special handling for explore page to prevent scrolling
  const isExplorePage = location.pathname === '/explore';

  return (
    <TooltipProvider>
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
            
            {/* Header Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Habits Due Bell - only show when habits are due */}
              {isAuthenticated && dueHabitsCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Habits due: ${dueHabitsCount}`}
                      data-testid="header-bell"
                      className="relative hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                    >
                      <div className="relative">
                        <Bell className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-gray-700 dark:text-gray-300`} />
                        <span
                          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full px-1 text-[11px] leading-[18px] text-white bg-rose-500 text-center font-medium"
                          aria-hidden="true"
                        >
                          {dueHabitsCount > 9 ? "9+" : dueHabitsCount}
                        </span>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Habits due</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Microphone Button */}
              {isAuthenticated && voiceCoachAllowed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Speak to Coach (Press M)"
                      data-testid="header-mic"
                      onClick={() => navigate('/voice-agent')}
                      className="relative hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                    >
                      <span className={`${isMobile ? 'text-3xl' : 'text-4xl'} leading-none`}>🎙️</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Speak to Coach</p>
                    <p className="text-xs opacity-75">Press M</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Theme Toggle */}
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

        {/* DEV Debug Menu Button - HIDDEN FOR NOW */}
        {false && import.meta.env.DEV && (
          <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => (window.location.href = '/debug')}
              style={{ 
                padding: '10px 14px',
                backgroundColor: '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              title="Open Debug Menu"
            >
              🔧 Debug Menu
            </button>
            <button
              onClick={() => (window.location.href = '/debug/photo')}
              style={{ 
                padding: '8px 12px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
              title="Quick access to Photo Sandbox"
            >
              📸 Photo
            </button>
          </div>
        )}

      {/* Main Content with safe area padding for bottom nav */}
      <main className="app-content max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {children}
      </main>

      {/* Enhanced Bottom Navigation - Always visible for authenticated users */}
      {shouldShowNavigation && (
        <nav 
          ref={navRef}
          className={`bottom-nav ${isMobile ? 'p-3' : 'pb-6 px-6'}`}
          data-bottom-nav="true"
        >
          <div className={`bg-white/98 dark:bg-gray-900/98 backdrop-blur-2xl ${isMobile ? 'rounded-3xl mx-0' : 'rounded-3xl max-w-md mx-auto'} px-3 sm:px-6 py-4 sm:py-5 shadow-2xl border-2 border-white/60 dark:border-gray-700/60 md:max-w-[620px] md:mx-auto`}>
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
    </TooltipProvider>
  );
};

export default Layout;
