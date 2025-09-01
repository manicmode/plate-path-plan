/**
 * Meal Item Selection Screen
 * REV: MEAL_REV_SBX=2025-08-31T17:55Z-r2
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, X, ArrowRight } from 'lucide-react';
import { MealItem } from './types';

const MEAL_REV_SBX = "2025-08-31T17:55Z-r2";

interface MealCaptureReviewProps {
  items: MealItem[];
  onShowReports: (selectedItems: MealItem[]) => void;
  onRetake: () => void;
  onExit: () => void;
}

export const MealCaptureReview: React.FC<MealCaptureReviewProps> = ({
  items,
  onShowReports,
  onRetake,
  onExit
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pre-select all items by default
  useEffect(() => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, [items]);

  const handleItemToggle = (itemId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const selectedItems = items.filter(item => selectedIds.has(item.id));

  const handleShowReports = () => {
    if (import.meta.env.VITE_DEBUG_MEAL === '1') {
      console.log('[MEAL][REVIEW]', { 
        total: items.length, 
        selected: selectedItems.length 
      });
    }
    
    onShowReports(selectedItems);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🍽️</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Select Items</h1>
              <p className="text-sm text-muted-foreground">
                Choose items for health analysis
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

      {/* Items Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {items.map((item) => (
            <Card 
              key={item.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedIds.has(item.id) 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleItemToggle(item.id, !selectedIds.has(item.id))}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={(checked) => 
                      handleItemToggle(item.id, checked === true)
                    }
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {item.cropUrl && (
                        <img
                          src={item.cropUrl}
                          alt={item.label}
                          className="w-12 h-12 rounded-lg object-cover bg-muted"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium capitalize truncate">
                          {item.label}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {item.gramsEstimate && (
                            <Badge variant="secondary" className="text-xs">
                              ~{item.gramsEstimate}g
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {Math.round(item.confidence * 100)}% confident
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t p-4">
        <div className="flex items-center justify-between gap-4 max-w-2xl mx-auto">
          <div className="text-sm text-muted-foreground">
            {selectedItems.length} of {items.length} items selected
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onRetake}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Retake
            </Button>
            
            <Button 
              onClick={handleShowReports}
              disabled={selectedItems.length === 0}
              className="gap-2"
            >
              Show Reports
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};