import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCount } from '@/hooks/useAdminCount';
import { useAuth } from '@/contexts/auth';
import { notify } from '@/lib/notify';
import { SmartLoadingScreen } from '@/components/SmartLoadingScreen';

export default function AdminBootstrapPage() {
  const { user } = useAuth();
  const { adminCount, loading } = useAdminCount();
  const navigate = useNavigate();
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Must be authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Still loading admin count
  if (loading) {
    return <SmartLoadingScreen><div /></SmartLoadingScreen>;
  }

  // Hide page if admin already exists
  if (adminCount > 0) {
    return <Navigate to="/" replace />;
  }

  const handleBootstrap = async () => {
    try {
      setIsBootstrapping(true);
      const { error } = await supabase.rpc('bootstrap_admin');
      
      if (error) {
        if (error.message.includes('Admin already exists')) {
          // Someone else became admin, redirect home
          navigate('/');
          return;
        }
        throw error;
      }

      notify.success('You are now an admin!');
      navigate('/feature-flags');
    } catch (error: any) {
      notify.error(error.message || 'Failed to bootstrap admin');
    } finally {
      setIsBootstrapping(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Bootstrap</CardTitle>
          <CardDescription>
            No admin user exists yet. Click below to become the first admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleBootstrap}
            disabled={isBootstrapping}
            className="w-full"
            size="lg"
          >
            {isBootstrapping ? 'Creating Admin...' : 'Make me admin'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}