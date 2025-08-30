/**
 * Universal Health Report Renderer
 * Single point of render for all health report flows
 */

import React, { Suspense } from 'react';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { HealthReportPopup } from '@/components/health-check/HealthReportPopup';
import type { HealthAnalysisResult } from '@/components/health-check/HealthCheckModal';

// Lazy import EnhancedHealthReport to prevent circular imports
const EnhancedHealthReport = React.lazy(() => 
  import('@/components/health-check/EnhancedHealthReport').then(module => ({
    default: module.EnhancedHealthReport
  }))
);

interface RenderHealthReportOptions {
  result: HealthAnalysisResult;
  onScanAnother: () => void;
  onClose: () => void;
  analysisData?: {
    source?: string;
    barcode?: string;
    imageUrl?: string;
  };
  initialIsSaved?: boolean;
  hideCloseButton?: boolean;
}

/**
 * Universal render function for health reports
 * Automatically chooses between Enhanced (V2) and Legacy (V1) based on feature flags
 */
export function renderHealthReport(options: RenderHealthReportOptions) {
  const {
    result,
    onScanAnother,
    onClose,
    analysisData,
    initialIsSaved = false,
    hideCloseButton = false
  } = options;

  // Add safety guards for critical properties
  const hasPerServing = !!(result as any)?.nutritionDataPerServing;
  const hasPer100g = !!(result as any)?.nutritionDataPer100g;
  const flags = Array.isArray(result?.flags) ? result.flags : Array.isArray(result?.ingredientFlags) ? result.ingredientFlags : [];
  const portionGrams = typeof (result as any)?.portionGrams === 'number' ? (result as any).portionGrams : null;

  // Log telemetry for monitoring and debugging
  React.useEffect(() => {
    const entry = analysisData?.source || 'unknown';
    const hasToggle = isFeatureEnabled('nutrition_toggle_enabled');
    const hasFlagsTab = isFeatureEnabled('flags_tab_enabled');
    const hasSaveTab = isFeatureEnabled('save_tab_enabled');
    const hasSuggestions = isFeatureEnabled('smart_suggestions_enabled');
    
    console.log('[REPORT][V2][BOOT]', {
      hasPerServing,
      hasPer100g, 
      flagsCount: flags.length,
      portionGrams,
      entry,
      hasToggle,
      hasFlagsTab, 
      hasSaveTab,
      hasSuggestions
    });
  }, [result, analysisData, hasPerServing, hasPer100g, flags.length, portionGrams]);

  // Use Enhanced Health Report if V2 is enabled
  if (isFeatureEnabled('health_report_v2_enabled')) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center p-8">Loading report...</div>}>
        <EnhancedHealthReport
          result={result}
          onScanAnother={onScanAnother}
          onClose={onClose}
          analysisData={analysisData}
          initialIsSaved={initialIsSaved}
          hideCloseButton={hideCloseButton}
        />
      </Suspense>
    );
  }

  // Fallback to legacy report
  return (
    <HealthReportPopup
      result={result}
      onScanAnother={onScanAnother}
      onClose={onClose}
      analysisData={analysisData}
      initialIsSaved={initialIsSaved}
      hideCloseButton={hideCloseButton}
    />
  );
}