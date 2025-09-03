import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface SaveSetNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  initialName?: string;
}

export const SaveSetNameDialog: React.FC<SaveSetNameDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = ''
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [setName, setSetName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && setName.trim()) {
      handleSave();
    }
  };

  const handleSave = async () => {
    console.log('[DEBUG] SaveSetNameDialog handleSave called', { setName: setName.trim() });
    if (!setName.trim()) {
      console.log('[DEBUG] No name entered, returning');
      return;
    }
    
    try {
      setIsSaving(true);
      console.log('[DEBUG] About to call onSave with name:', setName.trim());
      await onSave(setName.trim());
      console.log('[DEBUG] onSave completed successfully');
      
      // Show success toast with option to view
      toast({
        title: "Set Saved Successfully",
        description: `"${setName}" has been saved to your meal sets.`
      });
      
      console.log('[DEBUG] About to close dialog');
      onClose();
    } catch (error) {
      console.error('[DEBUG] Failed to save set:', error);
      toast({
        title: "Save Failed",
        description: "Could not save your set. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      console.log('[DEBUG] SaveSetNameDialog handleSave completed');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[450] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[460] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg"
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
                disabled={isSaving}
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[DEBUG] Save Set button clicked');
                  handleSave();
                }}
                disabled={!setName.trim() || isSaving}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : 'Save Set'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[DEBUG] Cancel button clicked');
                  onClose();
                }}
                disabled={isSaving}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="absolute right-4 top-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};