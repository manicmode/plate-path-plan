import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface HydrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const HydrationForm: React.FC<HydrationFormProps> = ({ isOpen, onClose, onSubmit }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Hydration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Hydration tracking form coming soon...</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSubmit}>
              Log Hydration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};