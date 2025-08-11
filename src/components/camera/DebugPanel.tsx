import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DebugPanelProps {
  isVisible?: boolean;
  debugInfo?: {
    baseServingLabel?: string;
    baseServingQuantity?: number;
    baseServingUnit?: string;
    perUnitCalories?: number;
    effectiveQuantity?: number;
    finalCalories?: number;
    sourceChosen?: string;
    reason?: string;
    isCountBased?: boolean;
    isWeightBased?: boolean;
    titleText?: string;
    subtitleText?: string;
  };
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ 
  isVisible = false, 
  debugInfo 
}) => {
  if (!isVisible || !debugInfo) {
    return null;
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'branded': return 'destructive';
      case 'generic': return 'default';
      case 'usda-gpt-estimation': return 'secondary';
      default: return 'outline';
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'prefer_generic': return 'default';
      case 'barcode_high_confidence': return 'destructive';
      case 'name_conflict_avoid_branded': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
          🔧 Serving Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs space-y-2">
        {/* Source Decision */}
        <div className="flex items-center gap-2">
          <span className="text-purple-600 dark:text-purple-400 font-medium">Source:</span>
          <Badge variant={getSourceColor(debugInfo.sourceChosen || 'unknown')} className="text-xs">
            {debugInfo.sourceChosen || 'unknown'}
          </Badge>
          <Badge variant={getReasonColor(debugInfo.reason || 'unknown')} className="text-xs">
            {debugInfo.reason || 'unknown'}
          </Badge>
        </div>

        {/* Title & Serving Info */}
        <div>
          <div className="text-purple-700 dark:text-purple-300 font-medium">
            Title: {debugInfo.titleText || 'N/A'}
          </div>
          <div className="text-purple-600 dark:text-purple-400 text-xs">
            {debugInfo.subtitleText || 'N/A'}
          </div>
        </div>

        {/* Serving Breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-purple-600 dark:text-purple-400">Base Label:</span>
            <div className="font-mono text-purple-800 dark:text-purple-200">
              {debugInfo.baseServingLabel || 'N/A'}
            </div>
          </div>
          <div>
            <span className="text-purple-600 dark:text-purple-400">Base Qty/Unit:</span>
            <div className="font-mono text-purple-800 dark:text-purple-200">
              {debugInfo.baseServingQuantity || 'N/A'} {debugInfo.baseServingUnit || ''}
            </div>
          </div>
        </div>

        {/* Calculation Details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-purple-600 dark:text-purple-400">Per Unit Cal:</span>
            <div className="font-mono text-purple-800 dark:text-purple-200">
              {debugInfo.perUnitCalories ? Math.round(debugInfo.perUnitCalories) : 'N/A'}
            </div>
          </div>
          <div>
            <span className="text-purple-600 dark:text-purple-400">Effective Qty:</span>
            <div className="font-mono text-purple-800 dark:text-purple-200">
              {debugInfo.effectiveQuantity || 'N/A'}
            </div>
          </div>
        </div>

        {/* Final Result */}
        <div className="border-t border-purple-200 dark:border-purple-700 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-purple-600 dark:text-purple-400 font-medium">Final Calories:</span>
            <div className="font-mono font-bold text-purple-800 dark:text-purple-200">
              {debugInfo.finalCalories ? Math.round(debugInfo.finalCalories) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Type Flags */}
        <div className="flex gap-1">
          {debugInfo.isCountBased && (
            <Badge variant="outline" className="text-xs text-purple-600 dark:text-purple-400">
              Count-based
            </Badge>
          )}
          {debugInfo.isWeightBased && (
            <Badge variant="outline" className="text-xs text-purple-600 dark:text-purple-400">
              Weight-based
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};