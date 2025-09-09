/**
 * Edge function client for enrichment with health checks and fallback mechanisms
 */
import { buildEnrichUrl } from './api';
import { F } from '@/lib/flags';

// Global state for edge health  
let edgeHealthState = {
  isDown: false,
  lastChecked: 0,
  checkInProgress: false,
};

/**
 * Check edge function health (QA only)
 */
async function checkEdgeHealth(): Promise<boolean> {
  // Skip health checks in production - only for QA 
  const isQAMode = window.location.pathname.includes('/qa') || 
               new URLSearchParams(window.location.search).has('QA_ENRICH');
  
  if (!isQAMode) {
    return true; // Assume healthy in production, let actual calls handle errors
  }
  
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
    const headers = { 'Content-Type': 'application/json' };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), F.ENRICH_EDGE_PING_MS);
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-manual-food`, 
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ ping: '1' }),
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
 * Call the enrichment edge function with fallback handling
 */
export async function callEnrichment(
  query: string, 
  options?: { 
    context?: 'manual' | 'scan' | 'qa';
    locale?: string;
    diag?: boolean;
    noCache?: boolean;
    bust?: string;
  }
): Promise<any> {
  const context = options?.context || 'manual';
  
  // First check if edge function is healthy (QA only)
  const isHealthy = await checkEdgeHealth();
  
  if (F.ENRICH_SAFE_MODE || (!isHealthy && edgeHealthState.isDown)) {
    if (F.ENRICH_DIAG) {
      console.log(`[ENRICH][EDGE_404] using fallback, safe_mode=${F.ENRICH_SAFE_MODE}, down=${edgeHealthState.isDown}`);
    }
    return { fallback: true, error: 'edge_unavailable' };
  }
  
  try {
    const params = {
      query,
      context,
      locale: options?.locale || 'auto',
      ...(options?.diag && { diag: '1' }),
      ...(options?.noCache && { noCache: '1' }),
      ...(options?.bust && { bust: options.bust }),
    };
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-manual-food`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      // Mark as down for network-level failures
      if (response.status >= 500 || response.status === 404) {
        edgeHealthState.isDown = true;
        if (F.ENRICH_DIAG) {
          console.log(`[ENRICH][EDGE_DOWN] status=${response.status}, marked down`);
        }
      }
      throw new Error(`edge_${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    // Network errors indicate the edge function is down
    if (error instanceof TypeError || (error as any).message?.includes('fetch')) {
      edgeHealthState.isDown = true;
      if (F.ENRICH_DIAG) {
        console.log('[ENRICH][EDGE_DOWN] network error, marked down:', error);
      }
    }
    
    return { fallback: true, error: (error as Error).message };
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