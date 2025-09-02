import React, { useState, useCallback, useRef } from 'react';
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
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // race guard
  const [reviewOpen, setReviewOpen] = useState(false);
  const [detected, setDetected] = useState<ReviewItem[]>([]);
  const [showEmpty, setShowEmpty] = useState(false);

  const handleImage = useCallback(async (file: File | Blob) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setShowEmpty(false);
    
    try {
      console.info('[LOG PHOTO] Preparing image for detection');
      const { base64NoPrefix } = await prepareImageForAnalysis(file);
      
      // Add prefix for detection
      const b64Out = base64NoPrefix.startsWith('data:image/') 
        ? base64NoPrefix 
        : `data:image/jpeg;base64,${base64NoPrefix}`;
      
      console.info('[LOG PHOTO] Running GPT-first detection');
      const items = await detectItemsEnsemble(b64Out, {
        featureBackend: (import.meta.env.VITE_DETECTION_BACKEND as any) || 'gpt-first',
        visionLabels: [], // No vision labels for upload photos
      });

      if (!items.length) {
        // Stay here; show inline empty UI inside PhotoIntakeModal
        console.info('[LOG PHOTO] No items detected, showing inline empty state');
        setDetected([]);
        setReviewOpen(false);
        setShowEmpty(true);
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
      setReviewOpen(true); // Open Review sheet on top of intake modal
      
    } catch (error) {
      console.error('[LOG PHOTO] Detection failed:', error);
      setShowEmpty(true);
      toast.error('Failed to analyze photo. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const handleTryAgain = () => {
    setShowEmpty(false);
    // Modal stays open, user can try again
  };

  const handleAddManually = () => {
    setShowEmpty(false);
    onClose();
    // Navigate to manual food entry or open search - could be implemented later
    toast.info('Manual entry - to be implemented');
  };

  const handleReviewConfirm = (selectedItems: ReviewItem[]) => {
    console.info('[LOG PHOTO] Review confirmed with items:', selectedItems.map(r => r.name));
    
    // Only call food-search when we have items
    if (selectedItems.length === 0) {
      setReviewOpen(false);
      return;
    }
    
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
        key="log-intake"
        isOpen={isOpen}
        onClose={onClose}
        context="log"
        onImageReady={handleImage}
        busy={busy}
        showEmpty={showEmpty}
        onTryAgain={handleTryAgain}
        onAddManually={handleAddManually}
      />
      {reviewOpen && (
        <ReviewItemsScreen
          isOpen
          items={detected}
          onNext={handleReviewConfirm}
          onClose={handleReviewClose}
          source="logging"
        />
      )}
    </>
  );
};