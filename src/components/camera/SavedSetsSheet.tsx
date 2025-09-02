import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { X, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { listMealSets, deleteMealSet, type MealSet } from '@/lib/mealSets';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SavedSetsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSet: (items: Array<{name: string; canonicalName: string; grams: number}>) => void;
}

export const SavedSetsSheet: React.FC<SavedSetsSheetProps> = ({
  isOpen,
  onClose,
  onInsertSet
}) => {
  const [sets, setSets] = useState<MealSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const loadSets = async () => {
    try {
      setLoading(true);
      const data = await listMealSets();
      setSets(data);
    } catch (error) {
      console.error('Failed to load meal sets:', error);
      toast.error('Failed to load saved sets');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      loadSets();
    }
  }, [isOpen]);
  
  const handleDelete = async (setId: string, setName: string) => {
    try {
      setDeleting(setId);
      await deleteMealSet(setId);
      setSets(prev => prev.filter(s => s.id !== setId));
      toast.success('Set deleted');
    } catch (error) {
      console.error('Failed to delete meal set:', error);
      toast.error('Failed to delete set');
    } finally {
      setDeleting(null);
    }
  };
  
  const handleInsert = (set: MealSet) => {
    const items = set.items.map(item => ({
      name: item.name,
      canonicalName: item.canonicalName || item.name,
      grams: item.grams
    }));
    
    onInsertSet(items);
    onClose();
    toast.success("Inserted ✓");
  };
  
  const formatItemsPreview = (items: MealSet['items']) => {
    return items
      .slice(0, 3)
      .map(item => `${item.name} ${item.grams}g`)
      .join(' • ') + (items.length > 3 ? ` +${items.length - 3} more` : '');
  };
  
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[105] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 bottom-0 z-[106] w-full max-w-md -translate-x-1/2 rounded-t-2xl bg-background shadow-xl max-h-[80vh] flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <Dialog.Title className="text-lg font-semibold">Saved Sets</Dialog.Title>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading sets...</p>
              </div>
            ) : sets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">No saved sets yet</p>
                <p className="text-sm text-muted-foreground">Save a set from the camera review to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sets.map((set) => (
                  <div 
                    key={set.id}
                    className="border border-border rounded-lg p-4 bg-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{set.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {formatItemsPreview(set.items)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Updated {new Date(set.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleInsert(set)}
                          className="h-8 text-xs"
                        >
                          Insert
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDelete(set.id, set.name)}
                              disabled={deleting === set.id}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {deleting === set.id ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};