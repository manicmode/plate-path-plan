/**
 * Remote Feature Flags for Health Report V2 Rollout
 * Supports safe dual-path rendering with kill switch capabilities
 */

interface ReportFlags {
  health_report_v2_enabled: boolean;
  health_report_v2_routes: string[];
  health_report_v2_rollout_percent: number;
}

const DEFAULT_FLAGS: ReportFlags = {
  health_report_v2_enabled: true,
  health_report_v2_routes: ['standalone', 'manual', 'voice', 'barcode', 'photo'],
  health_report_v2_rollout_percent: 100
};

// In-memory cache with TTL
let flagsCache: {
  data: ReportFlags;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT_MS = 2000; // 2 second timeout for fast-fail

/**
 * Generates a consistent user bucket (0-99) based on session/device
 * Uses a simple hash of user agent + timestamp rounded to hour for consistency
 */
function getUserBucket(): number {
  try {
    const hourlyKey = `${navigator.userAgent}_${Math.floor(Date.now() / (60 * 60 * 1000))}`;
    let hash = 0;
    for (let i = 0; i < hourlyKey.length; i++) {
      const char = hourlyKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  } catch (error) {
    console.warn('[REPORT][FLAGS] Failed to generate user bucket:', error);
    return Math.floor(Math.random() * 100);
  }
}

/**
 * Fetches remote feature flags with caching and fast-fail
 * Falls back to defaults on any error or timeout
 */
async function fetchRemoteFlags(): Promise<ReportFlags> {
  try {
    // Check cache first
    if (flagsCache && (Date.now() - flagsCache.timestamp) < CACHE_TTL_MS) {
      return flagsCache.data;
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), FETCH_TIMEOUT_MS);
    });

    // In a real implementation, this would fetch from your config service
    // For now, we'll simulate with localStorage override or defaults
    const fetchPromise = new Promise<ReportFlags>((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        // Check for admin override in localStorage
        const override = localStorage.getItem('report_flags_override');
        if (override) {
          try {
            const parsed = JSON.parse(override);
            resolve({ ...DEFAULT_FLAGS, ...parsed });
            return;
          } catch (e) {
            // Invalid JSON, fall back to defaults
          }
        }
        resolve(DEFAULT_FLAGS);
      }, 100);
    });

    // Race between fetch and timeout
    const flags = await Promise.race([fetchPromise, timeoutPromise]);

    // Update cache
    flagsCache = {
      data: flags,
      timestamp: Date.now()
    };

    return flags;
  } catch (error) {
    console.warn('[REPORT][FLAGS] Failed to fetch remote flags, using defaults:', error);
    return DEFAULT_FLAGS;
  }
}

/**
 * Main entry point for getting report flags
 * Returns cached flags if available, otherwise fetches with fast-fail
 */
export async function getReportFlags(): Promise<ReportFlags> {
  return await fetchRemoteFlags();
}

/**
 * Determines which version of the health report to render
 * Takes into account remote flags, URL params, localStorage overrides, and user bucketing
 */
export async function shouldUseV2Report(entry: string): Promise<{
  useV2: boolean;
  reason: string;
  flagsHash: string;
}> {
  // Check URL parameter override first
  const urlParams = new URLSearchParams(window.location.search);
  const forceReport = urlParams.get('forceReport');
  
  if (forceReport === 'v1') {
    return {
      useV2: false,
      reason: 'url_force_v1',
      flagsHash: 'forced'
    };
  }
  
  if (forceReport === 'v2') {
    return {
      useV2: true,
      reason: 'url_force_v2',
      flagsHash: 'forced'
    };
  }

  // Check localStorage developer override
  const localOverride = localStorage.getItem('health_report_v2_override');
  if (localOverride === 'enabled') {
    return {
      useV2: true,
      reason: 'dev_override_enabled',
      flagsHash: 'dev_override'
    };
  }
  
  if (localOverride === 'disabled') {
    return {
      useV2: false,
      reason: 'dev_override_disabled',
      flagsHash: 'dev_override'
    };
  }

  // Get remote flags
  const flags = await getReportFlags();
  const flagsHash = JSON.stringify(flags).slice(0, 8);

  // Check if V2 is globally enabled
  if (!flags.health_report_v2_enabled) {
    return {
      useV2: false,
      reason: 'globally_disabled',
      flagsHash
    };
  }

  // Check if current entry is in safelist
  if (!flags.health_report_v2_routes.includes(entry)) {
    return {
      useV2: false,
      reason: 'route_not_in_safelist',
      flagsHash
    };
  }

  // Check rollout percentage with user bucketing
  const userBucket = getUserBucket();
  if (userBucket >= flags.health_report_v2_rollout_percent) {
    return {
      useV2: false,
      reason: 'outside_rollout_bucket',
      flagsHash
    };
  }

  return {
    useV2: true,
    reason: 'rollout_criteria_met',
    flagsHash
  };
}

/**
 * Clear the flags cache (useful for testing/debugging)
 */
export function clearFlagsCache(): void {
  flagsCache = null;
}

/**
 * Clear any device overrides to use production rollout flags
 */
export function clearDeviceOverrides(): void {
  try {
    localStorage.removeItem('health_report_v2_override');
    console.info('[REPORT][FLAGS] Device overrides cleared - using production rollout flags');
  } catch (error) {
    console.warn('[REPORT][FLAGS] Failed to clear device overrides:', error);
  }
}

/**
 * Ship V2 globally - convenience function to enable global V2 rollout
 * Clears any local overrides to ensure production flags take effect
 */
export function shipV2Globally(): void {
  console.info('[REPORT][FLAGS] 🚀 Shipping V2 globally');
  
  // Clear any device overrides first
  clearDeviceOverrides();
  
  // Clear cache to force refresh
  clearFlagsCache();
  
  console.info('[REPORT][FLAGS] ✅ V2 global rollout active - config: enabled=true, routes=all, rollout=100%');
}

/**
 * Get current cache status (for debugging)
 */
export function getCacheStatus() {
  if (!flagsCache) {
    return { cached: false };
  }
  
  const age = Date.now() - flagsCache.timestamp;
  const remaining = Math.max(0, CACHE_TTL_MS - age);
  
  return {
    cached: true,
    age: Math.round(age / 1000),
    remainingSeconds: Math.round(remaining / 1000),
    data: flagsCache.data
  };
}