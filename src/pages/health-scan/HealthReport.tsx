import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { HealthScanItem } from '@/healthScan/types';
import { FF } from '@/featureFlags';

interface HealthReportState {
  image?: string;
  items: HealthScanItem[];
  _debug?: any;
}

export default function HealthReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reportData, setReportData] = useState<HealthReportState | null>(null);

  useEffect(() => {
    const state = location.state as HealthReportState;
    if (!state || !state.items) {
      // No data, redirect back to photo capture
      navigate('/health-scan/photo', { replace: true });
      return;
    }
    setReportData(state);
    
    // Focus first button for accessibility
    setTimeout(() => {
      const firstButton = document.querySelector('button[data-action="log"]') as HTMLButtonElement;
      firstButton?.focus();
    }, 100);
  }, [location.state, navigate]);

  const navigateToReviewWithPrefill = (items: HealthScanItem[]) => {
    const reviewItems = items.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      name: item.name,
      canonicalName: item.canonicalName || item.name,
      portion: `${item.grams || 100}g`,
      grams: item.grams || 100,
      needsDetails: false,
      source: item.source
    }));
    
    navigate('/camera', { 
      state: { 
        prefilledItems: reviewItems,
        showReview: true
      }
    });
  };

  const handleLogMeal = () => {
    if (!reportData?.items.length) return;
    
    navigateToReviewWithPrefill(reportData.items);
    toast.success('Items added to logging review');
  };

  const handleRetakePhoto = () => {
    navigate('/health-scan/photo');
  };

  const getHealthTag = (item: HealthScanItem): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    const name = item.name.toLowerCase();
    
    if (/salmon|chicken|beef|pork|fish|meat|protein/.test(name)) {
      return { label: 'Protein', variant: 'default' };
    }
    if (/asparagus|broccoli|carrot|spinach|lettuce|cucumber|tomato|vegetable/.test(name)) {
      return { label: 'Vegetable', variant: 'secondary' };
    }
    if (/lemon|lime|orange|apple|fruit|citrus/.test(name)) {
      return { label: 'Fruit', variant: 'outline' };
    }
    
    return { label: 'Food', variant: 'outline' };
  };

  const getConfidenceDot = (confidence?: number): string => {
    const conf = confidence || 0.7;
    if (conf >= 0.8) return 'bg-green-500'; // High confidence
    if (conf >= 0.6) return 'bg-yellow-500'; // Medium confidence
    return 'bg-red-500'; // Low confidence
  };

  if (!FF.FEATURE_HEALTH_REPORT_V1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Feature Not Available</h1>
          <p className="text-muted-foreground mb-6">
            Health Report is not currently available.
          </p>
          <Button onClick={() => navigate('/scan')}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading report...</div>
      </div>
    );
  }

  const { items, image } = reportData;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-10">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/scan')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-semibold">Health Report</h1>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Photo Preview */}
        {image && (
          <div className="p-4 border-b border-border">
            <img
              src={image}
              alt="Captured meal"
              className="w-full h-48 object-cover rounded-lg bg-muted"
            />
          </div>
        )}

        {/* Items List */}
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">
            Detected Items ({items.length})
          </h2>
          
          {items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No items detected in this photo
              </p>
              <Button onClick={handleRetakePhoto} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake Photo
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {items.map((item, index) => {
                const healthTag = getHealthTag(item);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div 
                        className={`w-2 h-2 rounded-full ${getConfidenceDot(item.confidence)}`}
                        title={`Confidence: ${Math.round((item.confidence || 0.7) * 100)}%`}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={healthTag.variant} className="text-xs">
                            {healthTag.label}
                          </Badge>
                          {item.grams && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {item.grams}g
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Meal Summary */}
          {items.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-sm mb-2">Meal Summary</h3>
              <p className="text-sm text-muted-foreground">
                {items.length === 1 
                  ? '1 item detected'
                  : `${items.length} items detected`}
                {items.some(i => i.grams) && ' • Total portions estimated'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add details to refine nutritional information
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {items.length > 0 && (
              <Button
                data-action="log"
                onClick={handleLogMeal}
                className="w-full h-12 text-base font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Log this Meal
              </Button>
            )}
            
            <Button
              onClick={handleRetakePhoto}
              variant="outline"
              className="w-full h-12 text-base"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Retake Photo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}