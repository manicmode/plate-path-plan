
import React, { ReactNode, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { Home, Camera, BarChart3, MessageSquare, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Set navigation flag when user navigates
  useEffect(() => {
    sessionStorage.setItem('hasNavigated', 'true');
  }, [location.pathname]);

  const navigationItems = [
    {
      path: '/home',
      icon: Home,
      label: 'Home',
    },
    {
      path: '/camera',
      icon: Camera,
      label: 'Log',
    },
    {
      path: '/analytics',
      icon: BarChart3,
      label: 'Progress',
    },
    {
      path: '/coach',
      icon: MessageSquare,
      label: 'Coach',
    },
    {
      path: '/profile',
      icon: User,
      label: 'Profile',
    },
  ];

  const handleNavigation = (path: string) => {
    // Prevent multiple rapid navigations
    if (location.pathname === path) return;
    
    // Add small delay to prevent conflicts
    setTimeout(() => {
      navigate(path);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Main Content */}
      <main className={`${isMobile ? 'px-4 py-6' : 'px-6 py-8'} ${isMobile ? 'pb-24' : 'pb-32'}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 ${isMobile ? 'h-20' : 'h-24'} z-50`}>
        <div className="flex items-center justify-around h-full max-w-md mx-auto">
          {navigationItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => handleNavigation(path)}
                className={cn(
                  'flex flex-col items-center justify-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-0',
                  isActive
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                )}
              >
                <Icon className={cn('flex-shrink-0', isMobile ? 'h-5 w-5' : 'h-6 w-6')} />
                <span className={cn('font-medium leading-none', isMobile ? 'text-xs' : 'text-sm')}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Toaster />
    </div>
  );
};

export default Layout;
