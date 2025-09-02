import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface SaveSetNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
}

export const SaveSetNameDialog: React.FC<SaveSetNameDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName
}) => {
  const [setName, setSetName] = useState(defaultName || generateDefaultName());

  function generateDefaultName(): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    return `Auto • ${dateStr} ${timeStr}`;
  }

  const handleSave = () => {
    if (setName.trim()) {
      onSave(setName.trim());
      // Don't close here - let parent handle success/error and close
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[103] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[104] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="text-lg font-semibold mb-4">Save This Set</Dialog.Title>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="setName" className="text-sm font-medium text-muted-foreground">
                Set Name
              </label>
              <Input
                id="setName"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter a name for this food set..."
                className="mt-1"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1" disabled={!setName.trim()}>
                Save Set
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-2 top-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};