import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useFeatureFlag(key: string) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc('is_feature_enabled', { feature_key: key });
      if (!active) return;
      if (!error && typeof data === 'boolean') setEnabled(data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [key]);

  return { enabled, loading };
}