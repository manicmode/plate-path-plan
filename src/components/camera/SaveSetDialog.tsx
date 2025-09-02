import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SaveSetItem {
  name: string;
  canonicalName: string; 
  grams: number;
}

interface SaveSetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: SaveSetItem[];
  onSaved?: (setName: string) => void;
}

export const SaveSetDialog: React.FC<SaveSetDialogProps> = ({
  isOpen,
  onClose,
  items,
  onSaved
}) => {
  const [setName, setSetName] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set(items.map((_, i) => i)));
  const [isSaving, setIsSaving] = useState(false);

  const handleItemToggle = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleSave = async () => {
    if (!setName.trim()) {
      toast.error('Please enter a name for this set');
      return;
    }

    if (selectedItems.size === 0) {
      toast.error('Please select at least one item');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to save food sets');
        return;
      }

      const selectedItemsData = Array.from(selectedItems).map(index => items[index]);

      // Create the meal set
      const { error: setError } = await supabase
        .from('meal_sets' as any)
        .insert({
          name: setName.trim(),
          items: selectedItemsData
        });

      if (setError) throw setError;

      toast.success(`Saved "${setName}" with ${selectedItems.size} items`);
      onSaved?.(setName);
      onClose();
      
      // Reset form
      setSetName('');
      setSelectedItems(new Set(items.map((_, i) => i)));
      
    } catch (error) {
      console.error('Error saving meal set:', error);
      toast.error('Failed to save food set. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Save Food Set</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="setName">Set Name</Label>
            <Input
              id="setName"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="e.g., Salmon Dinner, Quick Lunch..."
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium">Select Items</Label>
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedItems.has(index)}
                    onCheckedChange={() => handleItemToggle(index)}
                  />
                  <span className="text-sm flex-1">
                    {item.name} ({item.grams}g)
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={isSaving || !setName.trim() || selectedItems.size === 0}
            >
              {isSaving ? 'Saving...' : 'Save Set'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};