
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Camera, MessageCircle, User, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/camera', icon: Camera, label: 'Log' },
    { path: '/coach', icon: MessageCircle, label: 'Coach' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen gradient-main transition-all duration-300">
      {/* Futuristic Header */}
      <header className="glass-card sticky top-0 z-50 border-0">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center neon-glow">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">NutriCoach</h1>
              <p className="text-xs text-muted-foreground font-medium">AI Wellness Assistant</p>
            </div>
          </div>
          
          {/* Dark Mode Toggle */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 glass-button px-3 py-2 rounded-xl">
              <Sun className={`h-4 w-4 transition-colors ${!isDarkMode ? 'text-yellow-500' : 'text-gray-400'}`} />
              <Switch
                checked={isDarkMode}
                onCheckedChange={toggleDarkMode}
                className="data-[state=checked]:bg-blue-600"
              />
              <Moon className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-gray-400'}`} />
            </div>
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full neon-glow animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 pb-24">
        {children}
      </main>

      {/* Futuristic Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="glass-card rounded-3xl px-2 py-2">
          <div className="flex space-x-2">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Button
                  key={path}
                  variant="ghost"
                  size="sm"
                  className={`flex flex-col items-center space-y-1 h-16 w-16 rounded-2xl transition-all duration-300 ${
                    isActive 
                      ? 'gradient-primary text-white neon-glow scale-110' 
                      : 'glass-button text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => navigate(path)}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                  <span className="text-xs font-medium">{label}</span>
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
