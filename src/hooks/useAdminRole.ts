import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';

const fetcher = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data, error } = await supabase.rpc('has_role', { 
    _user_id: user.id, 
    _role: 'admin' 
  });
  
  if (error) throw error;
  return data || false;
};

/**
 * Hook to check if current user has admin role
 */
export function useAdminRole() {
  const { data: isAdmin, error, isLoading } = useSWR(
    'user-admin-role',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute deduping
    }
  );

  return {
    isAdmin: isAdmin || false,
    loading: isLoading,
    error
  };
}