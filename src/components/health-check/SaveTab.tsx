/**
 * Save Tab Component
 * Handles saving health reports to user's nutrition log
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Save, ExternalLink, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toNutritionLogRow } from '@/adapters/nutritionLogs';
import type { HealthAnalysisResult } from './HealthCheckModal';

interface SaveTabProps {
  result: HealthAnalysisResult;
  analysisData?: {
    source?: string;
    barcode?: string;
    imageUrl?: string;
  };
  portionGrams?: number;
  ocrHash?: string;
  className?: string;
  onSaved?: (logId: string) => void;
}

export const SaveTab: React.FC<SaveTabProps> = ({
  result,
  analysisData,
  portionGrams,
  ocrHash,
  className,
  onSaved
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [savedLogId, setSavedLogId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save health scan results.",
        variant: "destructive"
      });
      return;
    }

    if (isSaving || savedLogId) return;

    try {
      setIsSaving(true);
      console.log('[SAVE] Saving health report:', {
        itemName: result.itemName,
        source: analysisData?.source,
        portionGrams,
        ocrHash
      });

      // Create enhanced report snapshot with portion info
      const reportSnapshot = {
        ...result,
        portionGrams,
        portionMode: portionGrams ? 'custom' : 'per100g',
        ocrHash,
        savedAt: new Date().toISOString()
      };

      // Map analysis data to nutrition log format
      const scanData = {
        ...result,
        imageUrl: analysisData?.imageUrl,
        barcode: analysisData?.barcode,
      };

      const source = analysisData?.source === 'barcode' ? 'barcode' : 
                     analysisData?.source === 'manual' ? 'manual' : 'photo';

      const sourceMeta = {
        source,
        barcode: analysisData?.barcode ?? null,
        imageUrl: analysisData?.imageUrl ?? null,
        productName: result.itemName ?? result.productName ?? null,
        portionGrams: portionGrams ?? null,
        ocrHash: ocrHash ?? null,
      };

      const payload = {
        ...toNutritionLogRow(scanData, source),
        report_snapshot: reportSnapshot,
        snapshot_version: 'v2', // Enhanced with portion info
        source_meta: sourceMeta,
      };
      
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert(payload as any)
        .select('id')
        .single();

      if (error) throw error;

      const logId = data.id;
      setSavedLogId(logId);
      onSaved?.(logId);

      console.log('[SAVE][SUCCESS]', { logId, portionGrams });
      
      toast({
        title: "Saved Successfully! 💾",
        description: `${result.itemName} has been saved to your nutrition logs.`,
      });
    } catch (error: any) {
      console.error('❌ Save failed:', error);
      toast({
        title: "Save Failed",
        description: error?.message ?? 'Unable to save health report. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    setSavedLogId(null);
    handleSave();
  };

  return (
    <Card className={`bg-card border-border backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-4">
        <h3 className="text-xl font-bold text-foreground flex items-center">
          <Save className="w-6 h-6 text-primary mr-3" />
          Save Report
        </h3>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Save Summary */}
          <div className="p-4 bg-muted/50 border border-border rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">What will be saved:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Product: {result.itemName}</li>
              <li>• Health score: {Math.round((result.healthScore || 0) * 10)}%</li>
              <li>• Nutrition facts{portionGrams ? ` (${portionGrams}g portion)` : ' (per 100g)'}</li>
              <li>• Flagged ingredients ({(result.flags || result.ingredientFlags || []).length})</li>
              <li>• Source: {analysisData?.source === 'barcode' ? 'Barcode scan' : 
                           analysisData?.source === 'manual' ? 'Manual entry' : 
                           'Photo scan'}</li>
            </ul>
          </div>

          {/* Authentication Check */}
          {!user?.id ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                    Login Required
                  </h4>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Please log in to save this report to your nutrition logs.
                  </p>
                </div>
              </div>
            </div>
          ) : savedLogId ? (
            // Success state
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-primary-foreground mb-1">
                      Successfully Saved!
                    </h4>
                    <p className="text-sm text-primary-foreground">
                      Your health report has been added to your nutrition logs.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open('/nutrition-log', '_blank');
                  }
                }}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View in Nutrition Log
              </Button>
            </div>
          ) : (
            // Save action
            <div className="space-y-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || !user?.id}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 text-lg font-semibold"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving to Log...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save to My Log
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                This will add the report to your personal nutrition tracking log.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};