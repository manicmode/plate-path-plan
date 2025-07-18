import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook to trigger manual preview update
export const useTriggerPreviewUpdate = () => {
  const triggerUpdate = async () => {
    const { data, error } = await supabase.rpc('trigger_yearly_scores_preview_update');
    
    if (error) {
      throw error;
    }
    
    return data;
  };

  return { triggerUpdate };
};

// Hook to get preview update status
export const usePreviewUpdateStatus = () => {
  return useQuery({
    queryKey: ['preview-update-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yearly_score_preview')
        .select('last_updated, year')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching preview update status:', error);
        return null;
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};