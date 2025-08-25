import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ScanBarcodeScreen from '@/features/log/ScanBarcodeScreen';

interface BarcodeLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BarcodeLogModal: React.FC<BarcodeLogModalProps> = ({
  open,
  onOpenChange
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full max-h-full p-0 m-0 border-0 bg-transparent">
        <DialogHeader className="sr-only">
          <DialogTitle>Scan Barcode for Logging</DialogTitle>
          <DialogDescription>
            Scan a product barcode to add it to your food log
          </DialogDescription>
        </DialogHeader>
        
        <div className="fixed inset-0 z-50">
          <ScanBarcodeScreen onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};