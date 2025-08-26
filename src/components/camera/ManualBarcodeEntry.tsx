import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScanBarcode, FileText, Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface ManualBarcodeEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeEntered: (barcode: string) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const ManualBarcodeEntry: React.FC<ManualBarcodeEntryProps> = ({
  open,
  onOpenChange,
  onBarcodeEntered,
  onCancel,
  isProcessing = false
}) => {
  const [barcodeValue, setBarcodeValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcodeValue.trim()) {
      toast.error('Please enter a barcode number');
      return;
    }

    // Basic validation for common barcode formats
    const cleanBarcode = barcodeValue.trim().replace(/\s+/g, '');
    
    // Check for valid barcode patterns (UPC, EAN, etc.)
    if (!/^\d{8,14}$/.test(cleanBarcode)) {
      toast.error('Please enter a valid barcode (8-14 digits)');
      return;
    }

    onBarcodeEntered(cleanBarcode);
    onOpenChange(false); // Close modal after successful entry
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and spaces
    const value = e.target.value.replace(/[^\d\s]/g, '');
    setBarcodeValue(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-xl font-bold">
            <FileText className="h-6 w-6 text-emerald-600" />
            Enter Barcode Manually
          </DialogTitle>
          <DialogDescription className="text-center">
            Type or paste the barcode number from the product
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Barcode Number
              </label>
              <Input
                type="text"
                value={barcodeValue}
                onChange={handleInputChange}
                placeholder="e.g., 123456789012"
                className="text-center text-lg font-mono tracking-wider"
                maxLength={14}
                autoFocus
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Look for numbers below the barcode stripes
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isProcessing}
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !barcodeValue.trim()}
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Product
                  </div>
                )}
              </Button>
            </div>
          </form>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <ScanBarcode className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Supported formats:</p>
                <p>UPC-A (12 digits), EAN-13 (13 digits), EAN-8 (8 digits)</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};