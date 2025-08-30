/**
 * Universal Health Report Renderer
 * Single point of render for all health report flows
 */

import React from 'react';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { EnhancedHealthReport } from '@/components/health-check/EnhancedHealthReport';
import { HealthReportPopup } from '@/components/health-check/HealthReportPopup';
import type { HealthAnalysisResult } from '@/components/health-check/HealthCheckModal';

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

  // Log telemetry for monitoring
  React.useEffect(() => {
    const entry = analysisData?.source || 'unknown';
    const hasToggle = isFeatureEnabled('nutrition_toggle_enabled');
    const hasFlagsTab = isFeatureEnabled('flags_tab_enabled');
    const hasSaveTab = isFeatureEnabled('save_tab_enabled');
    const hasSuggestions = isFeatureEnabled('smart_suggestions_enabled');
    const flagsCount = result.flags?.length || result.ingredientFlags?.length || 0;
    
    console.log('[REPORT][V2]', {
      entry,
      hasToggle,
      hasFlagsTab, 
      hasSaveTab,
      hasSuggestions,
      portionGrams: 'auto-detected',
      flagsCount
    });
  }, [result, analysisData]);

  // Use Enhanced Health Report if V2 is enabled
  if (isFeatureEnabled('health_report_v2_enabled')) {
    return (
      <EnhancedHealthReport
        result={result}
        onScanAnother={onScanAnother}
        onClose={onClose}
        analysisData={analysisData}
        initialIsSaved={initialIsSaved}
        hideCloseButton={hideCloseButton}
      />
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