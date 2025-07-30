import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface RoutineActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentRoutineName?: string;
  newRoutineName: string;
  isLoading?: boolean;
}

export const RoutineActivationModal: React.FC<RoutineActivationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentRoutineName,
  newRoutineName,
  isLoading = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Switch Active Routine?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {currentRoutineName ? (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">
                You already have an active routine:
              </p>
              <p className="font-medium text-foreground">"{currentRoutineName}"</p>
            </div>
          ) : null}
          
          <div className="text-sm text-muted-foreground">
            {currentRoutineName 
              ? "To activate this new routine, we'll pause your current routine."
              : "This will activate your new routine."
            }
          </div>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm font-medium text-primary">
              New active routine: "{newRoutineName}"
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? 'Switching...' : 'Switch Routine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};