import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MutualFriendsData {
  target_id: string;
  mutuals: number;
}

export const useMutualFriends = (targetIds: string[]) => {
  const [mutualCounts, setMutualCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  
  const targetIdsStr = useMemo(() => targetIds.sort().join(','), [targetIds]);

  useEffect(() => {
    const loadMutualCounts = async () => {
      if (!targetIds.length) {
        setMutualCounts(new Map());
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_mutual_counts', {
          target_ids: targetIds
        });

        if (error) {
          console.error('Error loading mutual friends:', error);
          return;
        }

        const newMap = new Map<string, number>();
        (data as MutualFriendsData[])?.forEach(item => {
          if (item.mutuals > 0) {
            newMap.set(item.target_id, item.mutuals);
          }
        });
        
        setMutualCounts(newMap);
      } catch (err) {
        console.error('Error loading mutual friends:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMutualCounts();
  }, [targetIdsStr]);

  return {
    mutualCounts,
    loading,
    getMutualCount: (userId: string) => mutualCounts.get(userId) || 0
  };
};