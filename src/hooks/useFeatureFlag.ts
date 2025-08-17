import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFeatureFlag = (key: string) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFeatureFlag = async () => {
      try {
        const { data, error } = await supabase.rpc('is_feature_enabled', { 
          feature_key: key 
        });
        
        if (error) {
          console.error('Feature flag check failed:', error);
          setEnabled(false);
        } else {
          setEnabled(data || false);
        }
      } catch (error) {
        console.error('Feature flag error:', error);
        setEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkFeatureFlag();
  }, [key]);

  return { enabled, loading };
};