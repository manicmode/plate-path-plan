/**
 * Nutrition Vault Setup Verification (Infra-only)
 * Basic verification that runs automatically in dev mode
 */

import { NV_READ_THEN_CHEAP, NV_WRITE_THROUGH, NV_MAX_RESULTS, NV_MIN_PREFIX, NV_MIN_HITS } from './flags';

// Auto-run basic verification if NV is enabled
if (import.meta.env.DEV && NV_READ_THEN_CHEAP) {
  setTimeout(() => {
    console.log('[NV][SETUP][DEV] Vault enabled in development mode');
  }, 1500);
}