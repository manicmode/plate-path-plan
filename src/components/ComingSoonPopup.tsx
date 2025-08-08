import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface ComingSoonPopupProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

export const ComingSoonPopup: React.FC<ComingSoonPopupProps> = ({ 
  isOpen, 
  onClose, 
  feature 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby="coming-soon-desc">
        <DialogTitle id="coming-soon-title" className="sr-only">Coming soon feature</DialogTitle>
        <DialogDescription id="coming-soon-desc" className="sr-only">
          This feature is coming soon.
        </DialogDescription>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
            Coming Soon!
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-6">
          <div className="text-6xl animate-bounce">🚧</div>
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {feature}
            </h3>
            <p className="text-muted-foreground">
              This feature is coming soon, hang tight!
            </p>
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              We're working hard to bring you amazing new features.
            </p>
            <p className="text-sm text-muted-foreground">
              Stay tuned! 🎉
            </p>
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button onClick={onClose} className="px-8">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};