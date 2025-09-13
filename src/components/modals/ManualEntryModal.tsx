import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/state/ui/useUiStore';
import ManualFoodEntry from '@/components/camera/ManualFoodEntry';

interface ManualEntryModalProps {
  onFoodSelected?: (food: any) => void;
}

export function ManualEntryModal({ onFoodSelected }: ManualEntryModalProps = {}) {
  const { manualEntryOpen, openManualEntry, closeManualEntry } = useUiStore();

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
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Food Manually</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeManualEntry}
            aria-label="Close"
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <ManualFoodEntry
            onFoodSelect={(food) => {
              // Handle food selection and close modal
              if (onFoodSelected) {
                onFoodSelected(food);
              }
              closeManualEntry();
            }}
            onClose={closeManualEntry}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}