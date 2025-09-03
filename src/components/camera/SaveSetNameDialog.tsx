import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { toast } from 'sonner';
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
  const [setName, setSetName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && setName.trim()) {
      handleSave();
    }
  };

  const handleSave = async () => {
    if (!setName.trim()) return;
    
    try {
      setIsSaving(true);
      await onSave(setName.trim());
      
      // Show success toast with option to view
      toast.success(`Saved "${setName}" ✓ • View in Saved Reports → Meal Sets`, {
        action: {
          label: 'View',
          onClick: () => navigate('/scan/saved-reports?tab=meal-sets')
        }
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save set:', error);
      toast.error('Failed to save set');
    } finally {
      setIsSaving(false);
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
                disabled={isSaving}
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={!setName.trim() || isSaving}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : 'Save Set'}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
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