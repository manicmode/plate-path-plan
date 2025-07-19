
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const LogoutSection = () => {
  const isMobile = useIsMobile();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      console.log('Initiating logout...');
      await signOut();
      toast.success('Signed out successfully');
      console.log('Logout successful, navigating to login');
      // Navigation will be handled by the signOut function in authService
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error signing out');
      // Force navigation even if signout fails
      navigate('/', { replace: true });
    }
  };

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '600ms' }}>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
        <div className={`flex items-center ${isMobile ? 'flex-col space-y-3' : 'justify-between'}`}>
          <div className={`${isMobile ? 'text-center' : ''}`}>
            <h3 className={`font-semibold text-red-600 ${isMobile ? 'text-base' : 'text-lg'}`}>Sign Out</h3>
            <p className={`${isMobile ? 'text-sm' : 'text-sm'} text-gray-600 dark:text-gray-300`}>Sign out of your NutriCoach account</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout} 
            className={`text-red-600 border-red-200 hover:bg-red-50 ${isMobile ? 'w-full h-12' : ''}`}
          >
            <LogOut className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'} mr-2`} />
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
