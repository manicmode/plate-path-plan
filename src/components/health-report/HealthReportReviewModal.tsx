import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Zap, Save, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { SaveSetNameDialog } from '@/components/camera/SaveSetNameDialog';
import { ReviewItemCard } from '@/components/camera/ReviewItemCard';
import { NumberWheelSheet } from '@/components/inputs/NumberWheelSheet';
import { ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import '@/styles/review.css';

interface HealthReportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowHealthReport: (selectedItems: ReviewItem[]) => void;
  onNext: (selectedItems: ReviewItem[]) => void;
  onLogImmediately?: (selectedItems: ReviewItem[]) => void;
  items: ReviewItem[];
}

export const HealthReportReviewModal: React.FC<HealthReportReviewModalProps> = ({
  isOpen,
  onClose,
  onShowHealthReport,
  onNext,
  onLogImmediately,
  items: initialItems
}) => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [showSaveNameDialog, setShowSaveNameDialog] = useState(false);
  const [openWheelForId, setOpenWheelForId] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Initialize items when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[HEALTH_REVIEW] Initializing with items:', initialItems.length);
      setItems(initialItems.map(item => ({ ...item, selected: true })));
    }
  }, [isOpen, initialItems]);

  const handleItemChange = (id: string, field: 'name' | 'portion' | 'selected' | 'eggSize' | 'grams', value: string | boolean | number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleAddItem = () => {
    const newItem: ReviewItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      portion: '',
      selected: true
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleShowHealthReport = async () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to analyze');
      return;
    }

    setIsGeneratingReport(true);
    
    try {
      console.log('[HEALTH_REVIEW] Generating health report for:', selectedItems.length, 'items');
      
      // Close this modal and show health report
      onShowHealthReport(selectedItems);
      onClose();
      
    } catch (error) {
      console.error('Failed to generate health report:', error);
      toast.error('Failed to generate health report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleNext = () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim() && item.portion.trim());
    if (selectedItems.length === 0) {
      return;
    }
    onNext(selectedItems);
  };

  const handleLogImmediately = async () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to log');
      return;
    }

    setIsLogging(true);

    try {
      console.info('[HEALTH_REVIEW][one-tap-log]', selectedItems.map(i => ({ 
        name: i.canonicalName || i.name, 
        grams: i.grams || 100 
      })));

      const { oneTapLog } = await import('@/lib/nutritionLog');
      
      const logEntries = selectedItems.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.grams || 100
      }));

      await oneTapLog(logEntries);
      
      const { incrementCounter } = await import('@/lib/metrics');
      incrementCounter('photo.one_tap_used');
      
      toast.success(`Logged ✓`);
      onClose();
      
      navigate('/nutrition');
    } catch (error) {
      console.error('Failed to log items:', error);
      toast.error('Failed to log items. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleSaveSet = () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to save');
      return;
    }
    
    if (!user?.id) {
      toast.error('You must be logged in to save sets');
      return;
    }
    
    setShowSaveNameDialog(true);
  };

  const handleSaveSetWithName = async (setName: string) => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    
    try {
      const { createMealSet } = await import('@/lib/mealSets');
      
      const mealSetItems = selectedItems.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.grams || 100
      }));

      await createMealSet({ name: setName, items: mealSetItems });
      toast.success(`Saved ✓`);
      setShowSaveNameDialog(false);
    } catch (error) {
      console.error('Failed to save meal set:', error);
      toast.error('Failed to save set. Please try again.');
    }
  };

  const handleOpenWheel = (itemId: string) => {
    setOpenWheelForId(itemId);
  };

  const handleWheelChange = (grams: number) => {
    if (openWheelForId) {
      handleItemChange(openWheelForId, 'grams', grams);
      handleItemChange(openWheelForId, 'portion', `${grams}g`);
    }
  };

  const handleWheelClose = () => {
    setOpenWheelForId(null);
  };

  const selectedCount = items.filter(item => item.selected && item.name.trim()).length;
  const count = items.length;

  // Background scroll lock effect
  useEffect(() => {
    if (!isOpen) return;
    const { style } = document.body;
    const prev = style.overflow;
    style.overflow = 'hidden';
    return () => { style.overflow = prev; };
  }, [isOpen]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80" />
        <Dialog.Content
          className="fixed inset-0 z-[100] bg-gradient-to-br from-red-900/60 via-purple-900/60 to-red-800/60 backdrop-blur-sm text-white"
          onOpenAutoFocus={(e) => e.preventDefault()}
          role="dialog"
          aria-labelledby="health-review-title"
          aria-describedby="health-review-description"
        >
          <Dialog.Title id="health-review-title" className="sr-only">Review Detected Items for Health Report</Dialog.Title>
          <Dialog.Description id="health-review-description" className="sr-only">Confirm items and portion sizes before generating health analysis</Dialog.Description>

          <div className="flex h-full w-full flex-col">
            {/* Header (sticky) */}
            <header className="sticky top-0 z-10 bg-gradient-to-r from-red-900/70 to-purple-900/70 backdrop-blur-sm px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/10">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Review Detected Items ({count})
                </h2>
                <p className="text-sm text-gray-300">
                  Check and edit the food items detected in your image.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </header>

            {/* ScrollArea (flex-1, overflow-y-auto) */}
            <div className="flex-1 overflow-y-auto px-5 pb-32">
              {count === 0 ? (
                // Empty state
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="text-6xl">🍽️</div>
                  <h3 className="text-xl font-semibold text-white">No food detected</h3>
                  <p className="text-gray-300 text-center">
                    Try again, upload from gallery, or add manually.
                  </p>
                  <div className="flex flex-col gap-3 w-full max-w-sm pt-4">
                    <Button
                      onClick={onClose}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Try Again
                    </Button>
                    <Button
                      onClick={handleAddItem}
                      variant="outline"
                      className="w-full border-gray-400 text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Manually
                    </Button>
                  </div>
                </div>
              ) : (
                // Items list
                <>
                  <div className="space-y-2 pt-4">
                    {items.map((item) => (
                      <ReviewItemCard
                        key={item.id}
                        item={item}
                        canRemove={items.length > 1}
                        onChange={handleItemChange}
                        onRemove={handleRemoveItem}
                        onOpenWheel={handleOpenWheel}
                      />
                    ))}
                  </div>

                  {/* Add food button */}
                  <div className="flex justify-center mt-6">
                    <Button
                      variant="outline"
                      onClick={handleAddItem}
                      className="flex items-center space-x-2 border-dashed border-2 border-gray-400 text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Food</span>
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Footer (sticky) - only show if we have items */}
            {count > 0 && (
              <footer className="sticky bottom-0 z-10 bg-gradient-to-r from-red-900/70 to-purple-900/70 backdrop-blur-sm px-5 py-4 border-t border-white/10">
                <div className="space-y-3">
                  {/* Main Health Report Button */}
                  <Button
                    onClick={handleShowHealthReport}
                    disabled={selectedCount === 0 || isGeneratingReport}
                    className="w-full h-14 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold text-lg shadow-lg shadow-purple-500/25 disabled:opacity-50"
                  >
                    {isGeneratingReport ? '⏳ Generating...' : `📊 Show Me Health Report (${selectedCount})`}
                  </Button>
                  
                  {/* Secondary actions row */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleLogImmediately}
                      disabled={selectedCount === 0 || isLogging}
                      className="h-11 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold text-sm"
                    >
                      {isLogging ? '⏳ Logging...' : `⚡ One-Click Log`}
                    </Button>
                    
                    <Button
                      onClick={handleNext}
                      disabled={selectedCount === 0}
                      className="h-11 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-sm"
                    >
                      🔎 Detailed Log
                    </Button>
                  </div>
                  
                  {/* Tertiary actions row */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveSet}
                      disabled={selectedCount === 0}
                      size="lg"
                      className="flex-1 h-11 rounded-xl bg-zinc-700/80 hover:bg-zinc-600/80 border border-white/10 text-white font-medium"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      💾 Save Set
                    </Button>
                    
                    <Button
                      onClick={onClose}
                      variant="outline"
                      size="lg"
                      className="flex-1 h-11 rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                  </div>

                  {selectedCount > 0 && (
                    <p className="text-center text-xs text-gray-300 mt-2">
                      {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              </footer>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Save Set Name Dialog */}
      <SaveSetNameDialog
        isOpen={showSaveNameDialog}
        onClose={() => setShowSaveNameDialog(false)}
        onSave={handleSaveSetWithName}
      />

      {/* Number Wheel Sheet */}
      <NumberWheelSheet
        open={!!openWheelForId}
        defaultValue={openWheelForId ? (items.find(i => i.id === openWheelForId)?.grams || 100) : 100}
        onChange={handleWheelChange}
        onClose={handleWheelClose}
        min={10}
        max={500}
        step={5}
        unit="g"
      />
    </Dialog.Root>
  );
};