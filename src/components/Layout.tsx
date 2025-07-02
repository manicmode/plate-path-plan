
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Camera, MessageCircle, User, Moon, Sun, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const isMobile = useIsMobile();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/camera', icon: Camera, label: 'Log' },
    { path: '/analytics', icon: BarChart3, label: 'Progress' },
    { path: '/coach', icon: MessageCircle, label: 'Coach' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen gradient-main transition-all duration-300">
      {/* Single Header - Mobile Optimized */}
      <header className="glass-card sticky top-0 z-50 border-0">
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
          
          {/* Dark Mode Toggle - Mobile Optimized */}
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

      {/* Main Content - Mobile Optimized */}
      <main className={`max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8 ${isMobile ? 'pb-28' : 'pb-36'}`}>
        {children}
      </main>

      {/* Bottom Navigation - Enhanced Design */}
      <nav className={`fixed ${isMobile ? 'bottom-2 left-2 right-2' : 'bottom-6 left-1/2 transform -translate-x-1/2'} z-50`}>
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg rounded-3xl px-3 sm:px-6 py-3 sm:py-4 shadow-2xl border-2 border-white/40">
          <div className={`flex ${isMobile ? 'justify-between gap-1' : 'space-x-3'}`}>
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Button
                  key={path}
                  variant="ghost"
                  size="sm"
                  className={`flex flex-col items-center justify-center space-y-1 ${
                    isMobile 
                      ? 'h-14 px-2 min-w-[56px] flex-1' 
                      : 'h-18 w-20 px-3'
                  } rounded-2xl transition-all duration-300 ${
                    isActive 
                      ? 'gradient-primary text-white neon-glow scale-105 shadow-lg' 
                      : 'glass-button text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:scale-105'
                  }`}
                  onClick={() => navigate(path)}
                >
                  <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} ${isActive ? 'animate-pulse' : ''} flex-shrink-0`} />
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
    </div>
  );
};

export default Layout;
