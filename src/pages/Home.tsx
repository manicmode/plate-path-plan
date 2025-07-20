
import { useAuth } from '@/contexts/auth';
import { HomeDataProvider } from '@/components/home/HomeDataProvider';
import { HomeContent } from '@/components/home/HomeContent';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // Show loading screen while auth is initializing
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Welcome to NutriTrack</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to access your personalized nutrition dashboard.
          </p>
          <Button asChild className="w-full">
            <Link to="/auth">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Welcome back, {user.first_name || 'there'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Here's your nutrition overview for today
        </p>
      </div>

      <HomeDataProvider>
        <HomeContent />
      </HomeDataProvider>
    </div>
  );
}
