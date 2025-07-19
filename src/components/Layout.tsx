import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/home" className="font-semibold text-lg">
            Nutrition Coach
          </Link>
          
          <nav className="flex items-center space-x-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/home">Home</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/camera">Log Food</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/analytics">Analytics</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/friends">Friends</Link>
            </Button>
            
            <NotificationCenter />
            
            <Button asChild variant="ghost" size="sm">
              <Link to="/profile">Profile</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};
