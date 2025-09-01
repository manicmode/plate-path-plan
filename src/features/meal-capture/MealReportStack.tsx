/**
 * Meal Report Stack - Stacked Health Reports
 * Shows analysis results for each detected meal item
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ArrowRight } from 'lucide-react';
import { debugLog } from './isMealCaptureMode';
import { buildLogPrefillFromMeal, HealthAnalysisResult } from './buildLogPrefillFromMeal';
import { LogPrefill } from '@/lib/health/logPrefill';

export interface MealReport {
  id: string;
  itemName: string;
  analysis: HealthAnalysisResult;
  cropUrl?: string;
}

interface MealReportStackProps {
  reports: MealReport[];
  onHandOffToConfirm: (prefill: LogPrefill) => void;
  onRemoveReport: (id: string) => void;
  onExit: () => void;
}

export function MealReportStack({ 
  reports, 
  onHandOffToConfirm, 
  onRemoveReport, 
  onExit 
}: MealReportStackProps) {
  const handleLogItem = (report: MealReport) => {
    debugLog('HANDOFF][CONFIRM', { name: report.itemName });
    
    const prefill = buildLogPrefillFromMeal(
      report.analysis,
      report.cropUrl
    );
    
    onHandOffToConfirm(prefill);
  };

  const handleRemoveReport = (id: string) => {
    debugLog('STACK][POP', { id, remaining: reports.length - 1 });
    onRemoveReport(id);
  };

  if (reports.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Meal Analysis ({reports.length} items)</h2>
        <Button variant="outline" onClick={onExit}>
          Done
        </Button>
      </div>

      {reports.map((report, index) => (
        <Card key={report.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {report.itemName}
                  <Badge variant="secondary" className="text-xs">
                    Score: {report.analysis.healthScore}/10
                  </Badge>
                </CardTitle>
                {report.analysis.overallRating && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {report.analysis.overallRating}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveReport(report.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Image */}
            {report.cropUrl && (
              <div className="w-full h-32 rounded-lg overflow-hidden bg-muted">
                <img 
                  src={report.cropUrl} 
                  alt={report.itemName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Nutrition Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">Calories:</span> {report.analysis.nutritionData.calories}
              </div>
              <div>
                <span className="font-medium">Protein:</span> {report.analysis.nutritionData.protein_g}g
              </div>
              <div>
                <span className="font-medium">Carbs:</span> {report.analysis.nutritionData.carbs_g}g
              </div>
              <div>
                <span className="font-medium">Fat:</span> {report.analysis.nutritionData.fat_g}g
              </div>
            </div>

            {/* Warnings */}
            {report.analysis.personalizedWarnings.length > 0 && (
              <div className="space-y-1">
                <h4 className="font-medium text-sm text-orange-700 dark:text-orange-300">
                  Health Flags:
                </h4>
                {report.analysis.personalizedWarnings.slice(0, 2).map((warning, i) => (
                  <p key={i} className="text-xs text-orange-600 dark:text-orange-400">
                    • {warning}
                  </p>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {report.analysis.suggestions.length > 0 && (
              <div className="space-y-1">
                <h4 className="font-medium text-sm text-green-700 dark:text-green-300">
                  Suggestions:
                </h4>
                <p className="text-xs text-green-600 dark:text-green-400">
                  • {report.analysis.suggestions[0]}
                </p>
              </div>
            )}

            {/* Action Button */}
            <Button 
              onClick={() => handleLogItem(report)} 
              className="w-full"
              size="sm"
            >
              Log this item
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}