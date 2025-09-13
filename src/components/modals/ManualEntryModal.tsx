import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ManualFoodEntry from '@/components/camera/ManualFoodEntry';
import { enrichCandidate } from '@/utils/enrichCandidate';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodSelected: (food: any) => void;
}

export function ManualEntryModal({ isOpen, onClose, onFoodSelected }: ManualEntryModalProps) {
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  const handleFoodSelect = async (candidate: any) => {
    try {
      console.log('[MODAL][OPEN] manualEntry (legacy host)');
      console.log('[MANUAL][SELECT]', candidate);
      
      const candidateId = candidate.id || candidate.name;
      setEnrichingId(candidateId);
      
      // Enrich the candidate with full data
      const enriched = await enrichCandidate({ 
        ...candidate, 
        source: 'manual' 
      });

      console.log('[MANUAL][ENRICHED]', {
        name: enriched.name,
        hasIngredients: enriched.hasIngredients,
        enrichmentSource: enriched.enrichmentSource
      });

      // Call parent with enriched item
      onFoodSelected(enriched);
      onClose();
    } catch (error) {
      console.warn('[MANUAL][SELECT][FALLBACK]', error);
      
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl w-[92vw] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-lg font-semibold">Add Food Manually</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Search and select foods to add to your log
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="p-4">
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