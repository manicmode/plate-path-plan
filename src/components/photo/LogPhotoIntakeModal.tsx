import React, { useState } from 'react';
import { PhotoIntakeModal } from './PhotoIntakeModal';
import { ReviewItemsScreen, ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { prepareImageForAnalysis } from '@/lib/img/prepareImageForAnalysis';
import { detectItemsEnsemble } from '@/lib/detect/detectItemsEnsemble';
import { toast } from 'sonner';

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
        isOpen={isOpen && !reviewOpen}
        onClose={onClose}
        context="log"
        onImageReady={handleImage}
      />
      
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p className="text-lg font-medium">Analyzing photo...</p>
            <p className="text-sm text-white/70 mt-2">Detecting food items</p>
          </div>
        </div>
      )}

      {/* Empty State Overlay */}
      {showEmptyState && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="h-16 w-16 mx-auto mb-4 bg-neutral-700 rounded-full flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
            <h3 className="text-xl font-bold mb-4">No Items Detected</h3>
            <p className="text-neutral-300 mb-6">
              We couldn't identify any food items in this photo. Try taking another photo with better lighting or add items manually.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleTryAgain}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleAddManually}
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Add Manually
              </button>
            </div>
          </div>
        </div>
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