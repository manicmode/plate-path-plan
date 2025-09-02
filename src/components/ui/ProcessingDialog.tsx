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
  message = "Analyzing your meal...",
  zIndexClass = "z-[9999]"
}) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className={`fixed inset-0 ${zIndexClass} bg-black/80 flex items-center justify-center border-0 p-4`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-60"></div>
            <div className="h-14 w-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
          </div>
          <div className="text-neutral-100 text-base font-medium tracking-wide">
            {message}
          </div>
          <div className="text-neutral-400 text-xs">
            looking for salmon, asparagus, salad
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};