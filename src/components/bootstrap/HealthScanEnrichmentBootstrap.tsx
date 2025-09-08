import { useHealthScanEnrichmentBootstrap } from '@/hooks/useHealthScanEnrichmentBootstrap';

/**
 * Bootstrap component for Health-Scan Enrichment URL parameter handling
 * This component runs the bootstrap logic on app initialization
 */
export function HealthScanEnrichmentBootstrap() {
  useHealthScanEnrichmentBootstrap();
  return null;
}