import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

/**
 * Bootstrap hook for Health-Scan Enrichment URL parameter handling
 * Handles HS_ENRICH_ON=1 and HS_ENRICH_OFF=1 URL parameters
 */
export function useHealthScanEnrichmentBootstrap() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const enrichOn = urlParams.has('HS_ENRICH_ON') && urlParams.get('HS_ENRICH_ON') === '1';
    const enrichOff = urlParams.has('HS_ENRICH_OFF') && urlParams.get('HS_ENRICH_OFF') === '1';

    if (!enrichOn && !enrichOff) return;

    const handleEnrichmentToggle = async () => {
      if (!isAuthenticated || !user) {
        notify.error('Please sign in, then retry.');
        console.log('[FLAGS][USER] HS_ENRICH toggle failed: not authenticated');
        return;
      }

      try {
        const enabled = enrichOn;
        const value = {
          enabled,
          sample_pct: enabled ? 1 : 0,
          timeout_ms: 1200
        };

        console.log('[FLAGS][USER] Setting HS_ENRICH', value);

        const { error } = await supabase.rpc('set_user_feature_flag_jsonb', {
          flag_key_param: 'FEATURE_ENRICH_HEALTHSCAN',
          value_param: value
        });

        if (error) {
          throw error;
        }

        const message = enabled 
          ? 'Health-scan enrichment enabled for your account (100%).'
          : 'Health-scan enrichment disabled for your account.';
        
        notify.success(message);
        console.log('[FLAGS][USER] HS_ENRICH set successfully', value);

        // Refresh flags and reload page after successful toggle
        setTimeout(() => {
          // Clear URL params and reload to refresh in-memory flags
          const url = new URL(window.location.href);
          url.searchParams.delete('HS_ENRICH_ON');
          url.searchParams.delete('HS_ENRICH_OFF');
          window.location.href = url.toString();
        }, 2000);

      } catch (error) {
        console.error('[FLAGS][USER] HS_ENRICH RPC failed:', error);
        notify.error(`Failed to ${enrichOn ? 'enable' : 'disable'} health-scan enrichment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Only run when user authentication state is settled
    if (isAuthenticated !== undefined) {
      handleEnrichmentToggle();
    }
  }, [isAuthenticated, user]);
}