/**
 * Edge function client with health check and fallback routing
 */

import { supabase } from '@/integrations/supabase/client';
import { F } from '@/lib/flags';

// Global state for edge health
let edgeHealthState = {
  isDown: false,
  lastChecked: 0,
  checkInProgress: false,
};

/**
 * Health check the edge function URL
 */
async function checkEdgeHealth(): Promise<boolean> {
  const now = Date.now();
  
  // Don't check more than once per 30 seconds
  if (now - edgeHealthState.lastChecked < 30000) {
    return !edgeHealthState.isDown;
  }
  
  // Prevent concurrent checks
  if (edgeHealthState.checkInProgress) {
    return !edgeHealthState.isDown;
  }
  
  edgeHealthState.checkInProgress = true;
  edgeHealthState.lastChecked = now;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), F.ENRICH_EDGE_PING_MS);
    
    // Build URL for health check
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-manual-food`,
      {
        method: 'HEAD',
        headers,
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeout);
    
    const isHealthy = response.status < 500; // 2xx, 3xx, 4xx are ok, 5xx means down
    edgeHealthState.isDown = !isHealthy;
    
    if (F.ENRICH_DIAG && edgeHealthState.isDown) {
      console.log(`[ENRICH][EDGE_CHECK] status=${response.status}, marking down`);
    }
    
    return isHealthy;
    
  } catch (error) {
    edgeHealthState.isDown = true;
    
    if (F.ENRICH_DIAG) {
      console.log(`[ENRICH][EDGE_DOWN] url=${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${F.ENRICH_EDGE_FN_NAME}, error=${error}`);
    }
    
    return false;
  } finally {
    edgeHealthState.checkInProgress = false;
  }
}

/**
 * Call enrichment with edge function health check and fallback
 */
export async function callEnrichment(
  query: string,
  options: {
    context?: 'manual' | 'scan';
    diag?: boolean;
    locale?: string;
    noCache?: boolean;
    bust?: string;
  } = {}
): Promise<any> {
  // Check if edge function is available
  const edgeHealthy = await checkEdgeHealth();
  
  if (edgeHealthState.isDown || F.ENRICH_SAFE_MODE) {
    if (F.ENRICH_DIAG) {
      const reason = F.ENRICH_SAFE_MODE ? 'safe_mode' : 'edge_404';
      console.log(`[ENRICH][EDGE_404] using fallback, reason=${reason}`);
    }
    
    // Return fallback response structure
    return {
      data: null,
      error: { message: 'Edge function unavailable, using fallback routing' },
      fallback: true
    };
  }
  
  try {
    // Build URL with cache busting for QA
    let functionUrl = F.ENRICH_EDGE_FN_NAME;
    if (options?.noCache || options?.bust) {
      const params = new URLSearchParams();
      if (options.noCache) params.set('bust', '1');
      if (options.bust) params.set('bust', options.bust);
      functionUrl += '?' + params.toString();
    }
    
    const { data, error } = await supabase.functions.invoke(functionUrl, {
      body: {
        query: query.trim(),
        locale: options.locale || 'auto',
        context: options.context || 'manual',
        diag: options.diag || F.ENRICH_DIAG
      }
    });
    
    return { data, error, fallback: false };
    
  } catch (error: any) {
    if (F.ENRICH_DIAG) {
      console.log(`[ENRICH][EDGE_ERROR] ${error.message}`);
    }
    
    // Mark edge as down on network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      edgeHealthState.isDown = true;
    }
    
    return {
      data: null,
      error: { message: error.message || 'Edge function failed' },
      fallback: true
    };
  }
}

/**
 * Reset edge health state (for testing)
 */
export function resetEdgeHealth() {
  edgeHealthState = {
    isDown: false,
    lastChecked: 0,
    checkInProgress: false,
  };
}