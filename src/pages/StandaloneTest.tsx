/**
 * Standalone Test Page for V2 Health Report
 * Route: /standalone-test
 */

import React from 'react';
import { StandaloneHealthReport } from '@/components/StandaloneHealthReport';

export default function StandaloneTest() {
  React.useEffect(() => {
    console.log('[STANDALONE][PAGE] Mounted - V2 should be enabled for this route');
    
    // Test watchdog by intentionally delaying (uncomment to test)
    // setTimeout(() => {
    //   console.log('[STANDALONE][PAGE] Artificial delay to test watchdog');
    // }, 12000);
  }, []);

  return <StandaloneHealthReport />;
}