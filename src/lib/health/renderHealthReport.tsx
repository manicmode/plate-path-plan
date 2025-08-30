/**
 * Universal Health Report Renderer
 * Single point of render for all health report flows
 * Now with safe dual-path rollout and remote kill switch
 */

import React, { Suspense } from 'react';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { HealthReportPopup } from '@/components/health-check/HealthReportPopup';
import { shouldUseV2Report } from '@/lib/health/reportFlags';
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
 * Enhanced render function with safe dual-path rollout and remote kill switch
 * Uses remote feature flags, user bucketing, and watchdog fallback
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
  const entry = analysisData?.source || 'unknown';

  // Smart Renderer Component - chooses V1 or V2 based on rollout flags
  const SmartRenderer = () => {
    const [renderDecision, setRenderDecision] = React.useState<{
      useV2: boolean;
      reason: string;
      flagsHash: string;
    } | null>(null);

    React.useEffect(() => {
      // Make rollout decision async
      shouldUseV2Report(entry).then(setRenderDecision);
    }, []);

    // Wait for decision
    if (!renderDecision) {
      return null; // Brief flash, then loads chosen renderer
    }

    if (renderDecision.useV2) {
      return <EnhancedReportWithWatchdog renderDecision={renderDecision} />;
    }

    // Log V1 fallback
    console.log('[REPORT][BOOT]', {
      entry,
      chosen: 'v1',
      reason: renderDecision.reason,
      flagsHash: renderDecision.flagsHash,
      fellBack: false
    });

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
  };

  // V2 Enhanced Report with Watchdog Component
  const EnhancedReportWithWatchdog = ({ renderDecision }: { renderDecision: any }) => {
    const [showLegacy, setShowLegacy] = React.useState(false);
    const [isV2Mounted, setIsV2Mounted] = React.useState(false);
    const [fellBack, setFellBack] = React.useState(false);
    const watchdogRef = React.useRef<NodeJS.Timeout>();

    React.useEffect(() => {
      // Start 10s watchdog timer
      watchdogRef.current = setTimeout(() => {
        if (!isV2Mounted) {
          console.log('[REPORT][V2][WATCHDOG] timeout - falling back to legacy report');
          console.log('[REPORT][BOOT]', {
            entry,
            chosen: 'v2_fallback_to_v1',
            reason: 'watchdog_timeout',
            flagsHash: renderDecision.flagsHash,
            fellBack: true
          });
          
          setShowLegacy(true);
          setFellBack(true);
          
          // Show toast notification
          if (typeof window !== 'undefined' && (window as any).toast) {
            (window as any).toast({
              title: "Loading Enhanced Report",
              description: "Showing classic report while we finish loading."
            });
          }
        }
      }, 10000);

      return () => {
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current);
        }
      };
    }, [isV2Mounted]);

    // Boot telemetry component
    const ReportBootLog = React.useCallback(() => {
      React.useEffect(() => {
        const activeFlags = {
          hasToggle: isFeatureEnabled('nutrition_toggle_enabled'),
          hasFlagsTab: isFeatureEnabled('flags_tab_enabled'),
          hasSaveTab: isFeatureEnabled('save_tab_enabled'),
          hasSuggestions: isFeatureEnabled('smart_suggestions_enabled')
        };
        
        console.log('[REPORT][BOOT]', {
          entry,
          chosen: 'v2',
          reason: renderDecision.reason,
          flagsHash: renderDecision.flagsHash,
          fellBack: false
        });
        
        console.log('[REPORT][V2][BOOT]', {
          entry,
          flags: activeFlags,
          hasPer100g,
          hasPerServing,
          flagsCount: flags.length
        });
        
        setIsV2Mounted(true);
      }, []);
      
      return null;
    }, []);

    // If watchdog triggered, show legacy with fellBack telemetry
    if (showLegacy) {
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

    return (
      <Suspense fallback={null}>
        <ReportBootLog />
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
  };

  return <SmartRenderer />;
}