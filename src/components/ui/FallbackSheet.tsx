import React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface FallbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
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
  title,
  message,
  actions
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-center pb-4">
          <div className="h-12 w-12 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
            <span className="text-xl">🍽️</span>
          </div>
          <SheetTitle>{title}</SheetTitle>
          {message && (
            <SheetDescription className="text-muted-foreground">
              {message}
            </SheetDescription>
          )}
        </SheetHeader>
        
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={actions.tryAgain}
            className="w-full"
            size="lg"
          >
            Try Again
          </Button>
          <Button
            onClick={actions.upload}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Upload Photo
          </Button>
          <Button
            onClick={actions.addManually}
            variant="ghost"
            className="w-full"
            size="lg"
          >
            Add Manually
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};