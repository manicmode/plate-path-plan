import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SupplementLogFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const SupplementLogForm: React.FC<SupplementLogFormProps> = ({ isOpen, onClose, onSubmit }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Supplement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Supplement tracking form coming soon...</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSubmit}>
              Log Supplement
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};