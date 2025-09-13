import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/state/ui/useUiStore';
import ManualFoodEntry from '@/components/camera/ManualFoodEntry';
import { enrichManualCandidate } from '@/lib/food/enrich/enrichManualCandidate';

interface ManualEntryModalProps {
  onFoodSelected?: (food: any) => void;
}

export function ManualEntryModal({ onFoodSelected }: ManualEntryModalProps = {}) {
  const { manualEntryOpen, openManualEntry, closeManualEntry } = useUiStore();
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  const handleFoodSelect = async (candidate: any) => {
    try {
      setEnrichingId(candidate.id || candidate.name);
      
      const controller = new AbortController();
      const enriched = await enrichManualCandidate(candidate, controller.signal);

      // Call the parent callback with enriched item
      if (onFoodSelected) {
        onFoodSelected(enriched);
      }

      closeManualEntry();
    } catch (error) {
      console.warn('[MANUAL][ENRICH][ERROR]', error);
      
      // If not aborted, create a basic skeleton and proceed
      if (!error?.message?.includes('aborted')) {
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

        if (onFoodSelected) {
          onFoodSelected(skeleton);
        }
        closeManualEntry();
      }
    } finally {
      setEnrichingId(null);
    }
  };

  return (
    <Dialog 
      open={manualEntryOpen} 
      onOpenChange={(open) => open ? openManualEntry() : closeManualEntry()}
    >
      <DialogContent 
        className="max-w-xl w-[92vw] p-0 overflow-hidden z-[500]"
        onPointerDownOutside={() => closeManualEntry()}
        onInteractOutside={() => closeManualEntry()}
      >
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
            onClick={closeManualEntry}
            aria-label="Close"
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="p-4">
          <ManualFoodEntry
            onFoodSelect={handleFoodSelect}
            onClose={closeManualEntry}
            enrichingId={enrichingId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}