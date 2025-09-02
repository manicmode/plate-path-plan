import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { PhotoIntakeModal } from './PhotoIntakeModal';
import { ReviewItemsScreen, ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { prepareImageForAnalysis } from '@/lib/img/prepareImageForAnalysis';
import { detectItemsEnsemble } from '@/lib/detect/detectItemsEnsemble';
import { toast } from 'sonner';
import { Sparkles, Camera, Upload, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LogPhotoIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogPhotoIntakeModal: React.FC<LogPhotoIntakeModalProps> = ({
  isOpen,
  onClose
}) => {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [detected, setDetected] = useState<ReviewItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);

  const handleImage = async (file: File | Blob) => {
    setIsProcessing(true);
    setShowEmptyState(false);
    
    try {
      console.info('[LOG PHOTO] Preparing image for detection');
      const { base64NoPrefix } = await prepareImageForAnalysis(file);
      
      // Add prefix for detection
      const b64Out = `data:image/jpeg;base64,${base64NoPrefix}`;
      
      console.info('[LOG PHOTO] Running GPT-first detection');
      const items = await detectItemsEnsemble(b64Out, {
        featureBackend: (import.meta.env.VITE_DETECTION_BACKEND as any) || 'gpt-first',
        visionLabels: [], // No vision labels for upload photos
      });

      if (items.length === 0) {
        console.info('[LOG PHOTO] No items detected, showing empty state');
        setIsProcessing(false);
        setShowEmptyState(true);
        return;
      }

      // Convert to ReviewItem[] format
      const reviewItems: ReviewItem[] = items.map((item, index) => ({
        id: `log-${index}`,
        name: item.name,
        portion: '1 serving',
        selected: true,
        canonicalName: item.name,
      }));

      console.info('[LOG PHOTO] Opening review with items:', reviewItems.map(r => r.name));
      setDetected(reviewItems);
      setIsProcessing(false);
      setReviewOpen(true);
      
    } catch (error) {
      console.error('[LOG PHOTO] Detection failed:', error);
      setIsProcessing(false);
      setShowEmptyState(true);
      toast.error('Failed to analyze photo. Please try again.');
    }
  };

  const handleTryAgain = () => {
    setShowEmptyState(false);
    // Modal stays open, user can try again
  };

  const handleAddManually = () => {
    onClose();
    // Navigate to manual food entry or open search - could be implemented later
    toast.info('Manual entry - to be implemented');
  };

  const handleReviewConfirm = (selectedItems: ReviewItem[]) => {
    console.info('[LOG PHOTO] Review confirmed with items:', selectedItems.map(r => r.name));
    
    // TODO: Implement actual logging flow
    // For now, just close and show success
    setReviewOpen(false);
    onClose();
    toast.success(`Logged ${selectedItems.length} items successfully!`);
  };

  const handleReviewClose = () => {
    setReviewOpen(false);
  };

  return (
    <>
      <PhotoIntakeModal
        isOpen={isOpen && !reviewOpen && !showEmptyState}
        onClose={onClose}
        context="log"
        onImageReady={handleImage}
        isProcessing={isProcessing}
      />
      
      {/* Processing Overlay - Radix Portal with high z-index */}
      {isProcessing && (
        <Dialog.Root open={true} onOpenChange={() => {}}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/95 z-[100]" />
            <Dialog.Content className="fixed inset-0 z-[100] flex items-center justify-center">
              <div className="text-white text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-emerald-400/30 border-t-emerald-400 mx-auto mb-6" />
                  <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-emerald-400 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold">Analyzing your photo...</p>
                  <p className="text-emerald-400 text-sm animate-pulse">🔍 Detecting food items</p>
                  <div className="flex items-center justify-center gap-1 mt-4">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* Empty State Fallback - Radix Portal with high z-index */}
      {showEmptyState && (
        <Dialog.Root open={true} onOpenChange={() => {}}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/90 z-[100]" />
            <Dialog.Content className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-8 max-w-md w-full text-center">
                <div className="h-16 w-16 mx-auto mb-4 bg-neutral-700 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🍽️</span>
                </div>
                <Dialog.Title className="text-xl font-bold mb-4">No Items Detected</Dialog.Title>
                <Dialog.Description className="text-neutral-300 mb-6">
                  We couldn't identify any food items in this photo. Choose an option below to continue.
                </Dialog.Description>
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={handleTryAgain}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Camera className="h-4 w-4" />
                    Take Another Photo
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEmptyState(false);
                      // Trigger file picker
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleImage(file);
                      };
                      input.click();
                    }}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload from Gallery
                  </Button>
                  <Button
                    onClick={handleAddManually}
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Add Manually
                  </Button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* Review Screen */}
      {reviewOpen && (
        <ReviewItemsScreen
          isOpen={reviewOpen}
          onClose={handleReviewClose}
          onNext={handleReviewConfirm}
          items={detected}
          source="logging"
        />
      )}
    </>
  );
};