import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Plus, AlertCircle } from 'lucide-react';

interface FallbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: {
    tryAgain: () => void;
    upload: () => void;
    addManually: () => void;
  };
}

export const FallbackSheet: React.FC<FallbackSheetProps> = ({
  isOpen,
  onClose,
  title = "No items detected",
  message = "We couldn't find any food items in this photo. Try again with better lighting or add items manually.",
  actions
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <SheetTitle className="text-xl">{title}</SheetTitle>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {message}
          </p>
        </SheetHeader>
        
        <div className="space-y-3 pb-6">
          <Button
            onClick={actions.tryAgain}
            className="w-full h-12 text-base"
            size="lg"
          >
            <Camera className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <Button
            onClick={actions.upload}
            variant="outline"
            className="w-full h-12 text-base"
            size="lg"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Photo
          </Button>
          
          <Button
            onClick={actions.addManually}
            variant="outline"
            className="w-full h-12 text-base"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Manually
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};