import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';

const fetcher = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('count_admins');
  if (error) throw error;
  return data || 0;
};

export function useAdminCount() {
  const { data: adminCount, error, isLoading } = useSWR(
    'admin-count',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 second deduping
    }
  );

  return {
    adminCount: adminCount || 0,
    loading: isLoading,
    error
  };
}