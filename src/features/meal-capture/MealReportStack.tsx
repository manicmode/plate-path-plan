/**
 * Stacked Health Reports for Meal Items
 * REV: MEAL_REV_SBX=2025-08-31T17:55Z-r2
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle, ArrowLeft } from 'lucide-react';
import { MealItem } from './types';
import { renderHealthReport } from '@/lib/health/renderHealthReport';
import { toast } from 'sonner';

const MEAL_REV_SBX = "2025-08-31T17:55Z-r2";

interface MealReportStackProps {
  items: MealItem[];
  onExit: () => void;
  onBack: () => void;
}

export const MealReportStack: React.FC<MealReportStackProps> = ({
  items: initialItems,
  onExit,
  onBack
}) => {
  const [remainingItems, setRemainingItems] = useState<MealItem[]>(initialItems);

  useEffect(() => {
    if (import.meta.env.VITE_DEBUG_MEAL === '1') {
      console.log('[MEAL][STACK][SHOW]', { count: initialItems.length });
    }
  }, [initialItems.length]);

  const handleItemLogged = (itemId: string, itemLabel: string) => {
    if (import.meta.env.VITE_DEBUG_MEAL === '1') {
      console.log('[MEAL][STACK][LOG]', { 
        label: itemLabel, 
        grams: remainingItems.find(i => i.id === itemId)?.gramsEstimate 
      });
    }

    // Remove the logged item from the stack
    setRemainingItems(prev => prev.filter(item => item.id !== itemId));
    
    toast.success(`${itemLabel} logged successfully!`);
  };

  // Close the entire stack when no items remain
  useEffect(() => {
    if (remainingItems.length === 0) {
      if (import.meta.env.VITE_DEBUG_MEAL === '1') {
        console.log('[MEAL][STACK][EMPTY]', { close: true });
      }
      toast.success('All items logged!');
      onExit();
    }
  }, [remainingItems.length, onExit]);

  const handleScanAnother = () => {
    // For meal reports, we don't want to scan another - instead go back to selection
    onBack();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Health Reports</h1>
              <p className="text-sm text-muted-foreground">
                {remainingItems.length} item{remainingItems.length !== 1 ? 's' : ''} remaining
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stacked Reports */}
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {remainingItems.map((item, index) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                {item.cropUrl && (
                  <img
                    src={item.cropUrl}
                    alt={item.label}
                    className="w-12 h-12 rounded-lg object-cover bg-muted"
                  />
                )}
                <div className="flex-1">
                  <CardTitle className="text-xl capitalize">{item.label}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {item.gramsEstimate && (
                      <Badge variant="secondary">
                        ~{item.gramsEstimate}g portion
                      </Badge>
                    )}
                    <Badge variant="outline">
                      Item {index + 1} of {remainingItems.length}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="border rounded-lg">
                {renderHealthReport({
                  result: {
                    itemName: item.label,
                    productName: item.label, // alias
                    healthScore: 75, // Mock health score
                    ingredientFlags: [], // No flags for meal components
                    nutritionData: {
                      calories: Math.round((item.gramsEstimate ?? 100) * 2.5),
                      protein: Math.round((item.gramsEstimate ?? 100) * 0.15),
                      carbs: Math.round((item.gramsEstimate ?? 100) * 0.25),
                      fat: Math.round((item.gramsEstimate ?? 100) * 0.1),
                      fiber: Math.round((item.gramsEstimate ?? 100) * 0.05),
                      sugar: Math.round((item.gramsEstimate ?? 100) * 0.08),
                      sodium: Math.round((item.gramsEstimate ?? 100) * 3)
                    },
                    healthProfile: {
                      isOrganic: false,
                      isGMO: false,
                      allergens: [],
                      preservatives: [],
                      additives: []
                    },
                    personalizedWarnings: [], // No warnings for meal components
                    suggestions: [`Great choice! ${item.label} provides essential nutrients.`],
                    overallRating: 'good' as const // Mock rating for meal components
                  },
                  onScanAnother: handleScanAnother,
                  onClose: () => handleItemLogged(item.id, item.label),
                  hideCloseButton: false,
                  analysisData: {
                    source: 'meal-capture',
                    barcode: null
                  }
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};