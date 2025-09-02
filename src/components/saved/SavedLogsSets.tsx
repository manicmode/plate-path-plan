import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, MoreHorizontal, Edit3, Zap, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { listMealSets, deleteMealSet, renameMealSet, type MealSet } from '@/lib/mealSets';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

interface SavedLogsSetsProps {
  searchTerm: string;
  onInsert: (items: Array<{name: string; canonicalName: string; grams: number}>) => void;
  onQuickLog: (items: Array<{name: string; canonicalName: string; grams: number}>) => void;
  onCountChange: (count: number) => void;
}

export const SavedLogsSets: React.FC<SavedLogsSetsProps> = ({
  searchTerm,
  onInsert,
  onQuickLog,
  onCountChange
}) => {
  const [sets, setSets] = useState<MealSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);

  const loadSets = async () => {
    try {
      setLoading(true);
      const data = await listMealSets();
      setSets(data);
      onCountChange(data.length);
    } catch (error) {
      console.error('Failed to load meal sets:', error);
      toast.error('Failed to load saved sets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSets();
  }, []);

  const handleDelete = async (setId: string, setName: string) => {
    try {
      setDeleting(setId);
      await deleteMealSet(setId);
      setSets(prev => {
        const newSets = prev.filter(s => s.id !== setId);
        onCountChange(newSets.length);
        return newSets;
      });
      toast.success('Deleted ✓');
    } catch (error) {
      console.error('Failed to delete meal set:', error);
      toast.error('Failed to delete set');
    } finally {
      setDeleting(null);
    }
  };

  const handleRename = async (setId: string) => {
    if (!renameValue.trim()) return;
    
    try {
      setRenaming(setId);
      await renameMealSet(setId, renameValue.trim());
      setSets(prev => prev.map(s => 
        s.id === setId ? { ...s, name: renameValue.trim() } : s
      ));
      toast.success('Renamed ✓');
      setRenameDialogOpen(false);
      setRenameValue('');
    } catch (error) {
      console.error('Failed to rename meal set:', error);
      toast.error('Failed to rename set');
    } finally {
      setRenaming(null);
    }
  };

  const handleInsert = (set: MealSet) => {
    const items = set.items.map(item => ({
      name: item.name,
      canonicalName: item.canonicalName || item.name,
      grams: item.grams
    }));
    
    onInsert(items);
    toast.success("Inserted ✓");
  };

  const handleQuickLog = (set: MealSet) => {
    const items = set.items.map(item => ({
      name: item.name,
      canonicalName: item.canonicalName || item.name,
      grams: item.grams
    }));
    
    onQuickLog(items);
  };

  const formatItemsPreview = (items: MealSet['items']) => {
    const preview = items.slice(0, 3).map(item => item.name).join(', ');
    return items.length > 3 ? `${preview} +${items.length - 3} more` : preview;
  };

  // Filter sets based on search term
  const filteredSets = sets.filter(set => {
    const searchTerm_lower = searchTerm.toLowerCase();
    return (
      set.name.toLowerCase().includes(searchTerm_lower) ||
      set.items.some(item => 
        item.name.toLowerCase().includes(searchTerm_lower) ||
        (item.canonicalName && item.canonicalName.toLowerCase().includes(searchTerm_lower))
      )
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-full mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredSets.length === 0) {
    return (
      <div className="text-center py-12">
        {searchTerm ? (
          <>
            <div className="text-muted-foreground mb-2">No sets match "{searchTerm}"</div>
            <p className="text-sm text-muted-foreground">
              Try a different search term
            </p>
          </>
        ) : (
          <>
            <div className="text-muted-foreground mb-2">No meal sets yet</div>
            <p className="text-sm text-muted-foreground mb-4">
              Save sets from the Review screen to reuse later
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredSets.map((set) => (
        <div 
          key={set.id}
          className="border border-border rounded-lg p-4 bg-card"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{set.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {formatItemsPreview(set.items)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {set.items.length} items • {formatDistanceToNow(new Date(set.updated_at), { addSuffix: true })}
              </p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault();
                        setRenameValue(set.name);
                        setRenameDialogOpen(true);
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rename Set</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder="Set name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRename(set.id);
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleRename(set.id)}
                          disabled={renaming === set.id || !renameValue.trim()}
                          className="flex-1"
                        >
                          {renaming === set.id ? 'Renaming...' : 'Rename'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setRenameDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
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
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleInsert(set)}
              className="flex-1 h-8 text-xs"
              variant="outline"
            >
              <Plus className="h-3 w-3 mr-1" />
              Insert
            </Button>
            <Button
              size="sm"
              onClick={() => handleQuickLog(set)}
              className="flex-1 h-8 text-xs"
            >
              <Zap className="h-3 w-3 mr-1" />
              Quick Log
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};