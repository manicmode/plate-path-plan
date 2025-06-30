
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Camera, BarChart3, MessageCircle, User, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState(2);

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/camera', icon: Camera, label: 'Log Food' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/coach', icon: MessageCircle, label: 'Coach' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NC</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">NutriCoach</h1>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                  {notifications}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-green-100">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex justify-around">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Button
                  key={path}
                  variant="ghost"
                  size="sm"
                  className={`flex flex-col items-center space-y-1 h-auto py-2 px-3 ${
                    isActive ? 'text-green-600' : 'text-gray-600'
                  }`}
                  onClick={() => navigate(path)}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-green-600' : ''}`} />
                  <span className="text-xs">{label}</span>
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
