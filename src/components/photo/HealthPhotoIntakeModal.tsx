import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoIntakeModal } from './PhotoIntakeModal';
import { prepareImageForAnalysis } from '@/lib/img/prepareImageForAnalysis'; 
import { detectItemsEnsemble } from '@/lib/detect/detectItemsEnsemble';
import { healthReviewStack } from '@/state/healthReviewStack';
import { toast } from 'sonner';

interface HealthPhotoIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HealthPhotoIntakeModal: React.FC<HealthPhotoIntakeModalProps> = ({
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);

  const handleImage = async (file: File | Blob) => {
    setIsProcessing(true);
    setShowEmptyState(false);
    
    try {
      console.info('[HEALTH PHOTO] Preparing image for detection');
      const { base64NoPrefix } = await prepareImageForAnalysis(file);
      
      // Add prefix for detection
      const b64Out = `data:image/jpeg;base64,${base64NoPrefix}`;
      
      console.info('[HEALTH PHOTO] Running GPT-first detection');
      const items = await detectItemsEnsemble(b64Out, {
        featureBackend: (import.meta.env.VITE_DETECTION_BACKEND as any) || 'gpt-first',
        visionLabels: [], // No vision labels for upload photos
      });

      if (items.length === 0) {
        console.info('[HEALTH PHOTO] No items detected, showing empty state');
        setShowEmptyState(true);
        return;
      }

      // Store in health review stack and navigate
      const itemNames = items.map(item => item.name);
      console.info('[HEALTH PHOTO] Setting health review stack with items:', itemNames);
      
      healthReviewStack.set(itemNames);
      onClose();
      navigate('/health/review');
      
    } catch (error) {
      console.error('[HEALTH PHOTO] Detection failed:', error);
      toast.error('Failed to analyze photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTryAgain = () => {
    setShowEmptyState(false);
    // Modal stays open, user can try again
  };

  const handleAddManually = () => {
    onClose();
    // Navigate back to health scan main page
    navigate('/scan');
    toast.info('You can use the health scanner for manual analysis');
  };

  return (
    <>
      <PhotoIntakeModal
        isOpen={isOpen}
        onClose={onClose}
        context="health"
        onImageReady={handleImage}
      />
      
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p className="text-lg font-medium">Analyzing photo...</p>
            <p className="text-sm text-white/70 mt-2">Running health analysis</p>
          </div>
        </div>
      )}

      {/* Empty State Overlay */}
      {showEmptyState && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="h-16 w-16 mx-auto mb-4 bg-neutral-700 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-xl font-bold mb-4">No Items Detected</h3>
            <p className="text-neutral-300 mb-6">
              We couldn't identify any food items or nutrition labels in this photo. Try taking another photo with better lighting.
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
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};