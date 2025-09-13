import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import ManualFoodEntry from '@/components/camera/ManualFoodEntry';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodSelected: (food: any) => void;
}

export function ManualEntryModal({ isOpen, onClose, onFoodSelected }: ManualEntryModalProps) {
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

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
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Add Food Manually</span>
          </div>
        </DialogHeader>

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