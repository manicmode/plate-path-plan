import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Info } from 'lucide-react';
import ManualFoodEntry from '@/components/camera/ManualFoodEntry';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodSelected: (food: any) => void;
}

export function ManualEntryModal({ isOpen, onClose, onFoodSelected }: ManualEntryModalProps) {
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  // Log UX helpers once when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[MANUAL][UX] helper_copy=enabled');
      console.log('[MANUAL][UX] info_sheet=available');
    }
  }, [isOpen]);

  const handleFoodSelect = async (candidate: any) => {
    try {
      console.log('[MANUAL][SELECT]', candidate);
      
      const candidateId = candidate.id || candidate.name;
      setEnrichingId(candidateId);

      console.log('[ROUTE][CALL]', { source: 'manual', id: candidate?.id || candidate?.name });
      
      // Call parent with candidate for routing and enrichment
      onFoodSelected(candidate);
      onClose();
    } catch (error) {
      console.warn('[MANUAL][SELECT][ERROR]', error);
      
      // Create skeleton fallback
      const skeleton = {
        ...candidate,
        source: 'manual',
        enriched: false,
        hasIngredients: false,
        ingredientsList: [],
        ingredientsText: '',
        ingredientsUnavailable: true,
        enrichmentSource: 'manual'
      };

      onFoodSelected(skeleton);
      onClose();
    } finally {
      setEnrichingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md z-[600]">
        <VisuallyHidden>
          <DialogTitle>Add Food Manually</DialogTitle>
          <DialogDescription>
            Search and select foods to add to your log
          </DialogDescription>
        </VisuallyHidden>
        
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Manual Entry</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Best for restaurant meals, branded items, and supermarket foods.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfoSheet(!showInfoSheet)}
                className="h-6 w-6 p-0 rounded-full"
              >
                <Info className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {showInfoSheet && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span><strong>Manual Entry:</strong> best for restaurant meals, brand items, supermarket foods</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span><strong>Take a Photo:</strong> best for mixed plates and home-cooked meals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span><strong>Speak to Log:</strong> fastest way to add simple items by voice</span>
              </li>
            </ul>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowInfoSheet(false)}
              className="w-full"
            >
              Got it
            </Button>
          </div>
        )}

        <div className="space-y-6">
          <ManualFoodEntry
            onFoodSelect={handleFoodSelect}
            onClose={onClose}
            enrichingId={enrichingId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}