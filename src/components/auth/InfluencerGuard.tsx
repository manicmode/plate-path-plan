import { ReactNode } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users } from 'lucide-react';

interface InfluencerGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const InfluencerGuard = ({ children, fallback }: InfluencerGuardProps) => {
  const { isInfluencer, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isInfluencer) {
    return fallback || (
      <Alert className="m-4">
        <Users className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this area. Influencer access required.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};