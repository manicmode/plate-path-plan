import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate, useLocation } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAdmin?: boolean;
}

export const AdminGuard = ({ 
  children, 
  fallback, 
  requireAdmin = true 
}: AdminGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isAdmin, isModerator } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const loading = authLoading || roleLoading;

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    const currentPath = location.pathname + location.search;
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  const hasAccess = requireAdmin ? isAdmin : (isAdmin || isModerator);

  if (!hasAccess) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this area. Admin access required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};