import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ProcessingDialogProps {
  isOpen: boolean;
  message?: string;
  zIndexClass?: string;
}

export const ProcessingDialog: React.FC<ProcessingDialogProps> = ({
  isOpen,
  message = "Analyzing photo...",
  zIndexClass = "z-[9999]"
}) => {
  return (
    <Dialog open={isOpen}>
        <DialogContent 
          className={`sm:max-w-md ${zIndexClass} border-0 bg-background/95 backdrop-blur-sm`}
        >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground">{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};