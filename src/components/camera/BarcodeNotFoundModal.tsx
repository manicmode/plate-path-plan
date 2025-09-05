import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import AccessibleDialogContent from '@/components/a11y/AccessibleDialogContent';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Search, FileText, ArrowLeft } from 'lucide-react';

interface BarcodeNotFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  onManualEntry: () => void;
  onTryAgain: () => void;
}

export const BarcodeNotFoundModal: React.FC<BarcodeNotFoundModalProps> = ({
  isOpen,
  onClose,
  barcode,
  onManualEntry,
  onTryAgain
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AccessibleDialogContent 
        className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0"
        title="Product Not Found"
        description="We couldn't find this product in our database. You can add it manually."
      >
        <div className="sr-only">
          <div>Product Not Found</div>
          <div>We couldn't find this product in our database. You can add it manually.</div>
        </div>
        <div className="text-center pb-4">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Product Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
            Barcode <span className="font-mono font-medium">{barcode}</span> was not found in our database
          </p>
        </div>

        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-2">What you can do:</p>
              <ul className="space-y-1 text-xs">
                <li>• Add product details manually</li>
                <li>• Try scanning again with better lighting</li>
                <li>• Check if the barcode is clearly visible</li>
                <li>• Some products may not be in our database yet</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onManualEntry}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12"
            >
              <FileText className="h-5 w-5 mr-2" />
              Add Product Manually
            </Button>
            
            <Button
              variant="outline"
              onClick={onTryAgain}
              className="w-full"
            >
              <Search className="h-4 w-4 mr-2" />
              Try Scanning Again
            </Button>
            
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Camera
            </Button>
          </div>
        </div>
      </AccessibleDialogContent>
    </Dialog>
  );
};