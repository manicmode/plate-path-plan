import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';
import { SmartLoadingScreen } from '@/components/SmartLoadingScreen';

interface AdminRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Route guard that only allows admin users
 */
export function AdminRoute({ children, redirectTo = '/' }: AdminRouteProps) {
  const { isAdmin, loading } = useAdminRole();

  if (loading) {
    return <SmartLoadingScreen><div /></SmartLoadingScreen>;
  }

  if (!isAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}