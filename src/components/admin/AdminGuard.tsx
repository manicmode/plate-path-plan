import { ReactNode } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
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
  const { role, loading, isAdmin, isModerator } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Checking permissions...</span>
      </div>
    );
  }

  const hasAccess = requireAdmin ? isAdmin : (isAdmin || isModerator);

  if (!hasAccess) {
    return fallback || (
      <Alert className="m-4">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this area. Admin access required.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};