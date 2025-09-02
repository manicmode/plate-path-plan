import React, { useState, useCallback, useRef } from 'react';
import { PhotoIntakeModal } from './PhotoIntakeModal';
import { ReviewItemsScreen, ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { ProcessingDialog } from '@/components/ui/ProcessingDialog';
import { FallbackSheet } from '@/components/ui/FallbackSheet';
import { prepareImageForAnalysis } from '@/lib/img/prepareImageForAnalysis';
import { detectItemsEnsemble } from '@/lib/detect/detectItemsEnsemble';
import { playShutter } from '@/lib/sound';
import { estimatePortionFromName } from '@/lib/portion';
import { toast } from 'sonner';

interface LogPhotoFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogPhotoFlow: React.FC<LogPhotoFlowProps> = ({
  isOpen,
  onClose
}) => {
  const [cameraOpen, setCameraOpen] = useState(isOpen);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [detected, setDetected] = useState<ReviewItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  // Sync with parent prop
  React.useEffect(() => {
    setCameraOpen(isOpen);
  }, [isOpen]);

  const stopCameraStream = useCallback(() => {
    // Stop any active camera stream
    navigator.mediaDevices?.getUserMedia?.({ video: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(() => {
        // Ignore - stream may not exist
      });
  }, []);

  const onImageReady = useCallback(async (file: File | Blob) => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      // Play shutter sound (best effort)
      await playShutter();
    } catch (error) {
      // Ignore sound failures
    }

    // 1) Close camera & stop stream
    setCameraOpen(false);
    stopCameraStream();

    // 2) Show processing dialog
    setProcessingOpen(true);

    try {
      // 3) Run detection
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

      // 4) Transition based on results
      setProcessingOpen(false);

      // Only call food-search if we have items (avoid spam)
      if (!items || items.length === 0) {
        console.info('[LOG PHOTO] No items detected, showing fallback');
        setDetected([]);
        setFallbackOpen(true);
        return;
      }

      // Convert to ReviewItem[] format with proper portion estimates
      const reviewItems: ReviewItem[] = items.map((item, index) => ({
        id: `log-${index}`,
        name: item.name,
        portion: '1 serving',
        selected: true,
        canonicalName: item.name,
        grams: estimatePortionFromName(item.name),
      }));

      console.info('[LOG PHOTO] Opening review with items:', reviewItems.map(r => r.name));
      setDetected(reviewItems);
      setReviewOpen(true);
      
    } catch (error) {
      console.error('[LOG PHOTO] Detection failed:', error);
      setProcessingOpen(false);
      setFallbackOpen(true);
      toast.error('Failed to analyze photo. Please try again.');
    } finally {
      busyRef.current = false;
    }
  }, [stopCameraStream]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    onImageReady(file);
    // Reset so same file can be selected again
    e.currentTarget.value = '';
  }, [onImageReady]);

  const handleReviewConfirm = useCallback((selectedItems: ReviewItem[]) => {
    console.info('[LOG PHOTO] Review confirmed with items:', selectedItems.map(r => r.name));
    
    // Only proceed if we have items (no backend spam)
    if (selectedItems.length === 0) {
      setReviewOpen(false);
      return;
    }
    
    // TODO: Implement actual logging flow
    setReviewOpen(false);
    onClose();
    toast.success(`Logged ${selectedItems.length} items successfully!`);
  }, [onClose]);

  const handleTryAgain = useCallback(() => {
    setFallbackOpen(false);
    setCameraOpen(true);
  }, []);

  const handleAddManually = useCallback(() => {
    setFallbackOpen(false);
    onClose();
    toast.info('Manual entry - to be implemented');
  }, [onClose]);

  return (
    <>
      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Camera Modal */}
      <PhotoIntakeModal
        isOpen={cameraOpen}
        onClose={() => {
          setCameraOpen(false);
          onClose();
        }}
        context="log"
        onImageReady={onImageReady}
        onUploadClick={handleUploadClick}
      />

      {/* Processing Dialog */}
      <ProcessingDialog 
        isOpen={processingOpen}
        message="Analyzing photo..."
        zIndexClass="z-[9999]"
      />

      {/* Review Screen */}
      {reviewOpen && (
        <ReviewItemsScreen
          isOpen
          items={detected}
          onNext={handleReviewConfirm}
          onClose={() => setReviewOpen(false)}
          source="logging"
        />
      )}

      {/* Fallback Sheet */}
      <FallbackSheet
        isOpen={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        title="No items detected"
        message="We couldn't find any food items in this photo. Try again with better lighting or add items manually."
        actions={{
          tryAgain: handleTryAgain,
          upload: handleUploadClick,
          addManually: handleAddManually,
        }}
      />
    </>
  );
};