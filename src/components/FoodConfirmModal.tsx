import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Check, X } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useConfirmFlowActive } from '@/lib/confirmFlowState';

interface FoodItem {
  name: string;
  category: string;
  portion_estimate?: number;
  confidence: number;
  image?: string;
  displayText?: string;
  canonicalName?: string;
}

interface FoodConfirmModalProps {
  isOpen: boolean;
  items: FoodItem[];
  onConfirm: (confirmedItems: FoodItem[]) => void;
  onReject: () => void;
}

export function FoodConfirmModal({ isOpen, items, onConfirm, onReject }: FoodConfirmModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmedItems, setConfirmedItems] = useState<FoodItem[]>([]);
  const [editedPortion, setEditedPortion] = useState<number | null>(null);
  const confirmFlowActive = useConfirmFlowActive();

  const currentItem = items[currentIndex];
  const isLastItem = currentIndex === items.length - 1;

  // Dev breadcrumb when modal opens
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isOpen) {
      console.log('[CONFIRM][OPENED]', { ts: Date.now() });
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setConfirmedItems([]);
      setEditedPortion(null);
      
      // Legacy modal assert
      if (import.meta.env.VITE_LOG_DEBUG === 'true') {
        console.log('[LEGACY][ConfirmModal][MOUNT]');
        if (items.length > 0) {
          console.log('[LEGACY][FLOW] open index=0', items[0]?.name);
        }
      }
    }
  }, [isOpen, items]);

  // Forensic breadcrumbs for item navigation
  useEffect(() => {
    if (isOpen && currentItem && import.meta.env.VITE_LOG_DEBUG === 'true') {
      if (currentIndex > 0) {
        console.info('[DL][FLOW] next', { index: currentIndex + 1 });
        console.info('[DL][FLOW] open', { index: currentIndex + 1, name: currentItem.name });
      }
    }
  }, [currentIndex, currentItem, isOpen]);

  if (!isOpen || !currentItem) return null;

  const handleConfirm = () => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][FLOW] confirm', { index: currentIndex + 1, name: currentItem.name });
    }

    const updatedItem = {
      ...currentItem,
      portion_estimate: editedPortion || currentItem.portion_estimate || 100
    };
    
    const newConfirmed = [...confirmedItems, updatedItem];

    if (isLastItem) {
      // All items processed, return confirmed items
      onConfirm(newConfirmed);
    } else {
      // Move to next item
      setConfirmedItems(newConfirmed);
      setCurrentIndex(currentIndex + 1);
      setEditedPortion(null);
    }
  };

  const handleReject = () => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][FLOW] skip', { index: currentIndex + 1, name: currentItem.name });
    }

    if (isLastItem) {
      // Last item rejected, return what we have
      onConfirm(confirmedItems);
    } else {
      // Move to next item without adding current
      setCurrentIndex(currentIndex + 1);
      setEditedPortion(null);
    }
  };

  const handleRejectAll = () => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][FLOW] reject_all', { total: items.length });
    }
    onReject();
  };

  const portionText = currentItem.displayText || `${currentItem.portion_estimate || 100}g • est.`;
  const confidenceColor = currentItem.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                          currentItem.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800';

  return (
    <Dialog open={isOpen} onOpenChange={onReject}>
      <DialogContent 
        className="sm:max-w-md z-[600]"
        onEscapeKeyDown={(e) => {
          if (confirmFlowActive) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (confirmFlowActive) { e.preventDefault(); e.stopPropagation(); }
        }}
        onInteractOutside={(e) => {
          if (confirmFlowActive) { e.preventDefault(); e.stopPropagation(); }
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Confirm Food Items</DialogTitle>
          <DialogDescription>
            Confirm items and adjust portion sizes for logging to your diary
          </DialogDescription>
        </VisuallyHidden>

        {process.env.NODE_ENV === 'development' && (() => {
          console.log('[LEGACY][ConfirmModal][MOUNT]', {
            selectedIndex: currentIndex, totalItems: items?.length, timestamp: Date.now()
          });
          return null;
        })()}

        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Confirm Food Log</span>
            <Badge variant="secondary">
              {currentIndex + 1} of {items.length}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Preview */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
              {currentItem.image ? (
                <img 
                  src={currentItem.image} 
                  alt={currentItem.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-2xl">🍽️</span>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold capitalize">{currentItem.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {currentItem.category}
                </Badge>
                <Badge className={`text-xs ${confidenceColor}`}>
                  {Math.round(currentItem.confidence * 100)}% confident
                </Badge>
              </div>
            </div>
          </div>

          {/* Portion Adjustment */}
          <div className="space-y-3">
            <Label htmlFor="portion">Portion Size</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="portion"
                type="number"
                min="1"
                max="1000"
                value={editedPortion || currentItem.portion_estimate || 100}
                onChange={(e) => setEditedPortion(parseInt(e.target.value) || null)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">grams</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Original estimate: {portionText}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleReject}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Skip This Item
            </Button>
            
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm
            </Button>
          </div>

          {/* Reject All Option */}
          {currentIndex === 0 && items.length > 1 && (
            <Button
              variant="ghost"
              onClick={handleRejectAll}
              className="w-full text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cancel All Items
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}