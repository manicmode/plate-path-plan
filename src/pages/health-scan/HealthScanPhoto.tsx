import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoCaptureModal } from '@/components/scan/PhotoCaptureModal';
import { runFoodDetectionPipeline } from '@/lib/pipelines/runFoodDetectionPipeline';
import { HealthReportReviewModal } from '@/components/health-report/HealthReportReviewModal';
import { generateHealthReport } from '@/lib/health/generateHealthReport';
import { ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

export default function HealthScanPhoto() {
  const navigate = useNavigate();
  
  // Feature flag for legacy camera (default: true)
  const useLegacyCamera = import.meta.env.VITE_HEALTH_SCAN_USE_LEGACY_CAMERA !== 'false';
  
  const [photoModalOpen, setPhotoModalOpen] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [detectedItems, setDetectedItems] = useState<ReviewItem[]>([]);

  // Handle photo capture from legacy modal
  const handlePhotoCapture = async (imageBase64: string) => {
    console.log('[HEALTH_SCAN] Photo captured, starting detection...');
    
    try {
      const result = await runFoodDetectionPipeline(imageBase64, { mode: 'health' });
      
      if (result.success && result.items.length > 0) {
        setDetectedItems(result.items);
        setShowReviewModal(true);
        setPhotoModalOpen(false);
        toast.success('Food detection complete!');
      } else {
        toast.error('No food items detected. Please try again.');
      }
    } catch (error) {
      console.error('[HEALTH_SCAN] Detection error:', error);
      toast.error('Analysis failed. Please try again.');
    }
  };

  // Handle manual fallback from legacy modal
  const handleManualFallback = () => {
    console.log('[HEALTH_SCAN] Manual fallback triggered');
    toast.info('Manual entry not available in Health Scan mode');
    navigate('/scan');
  };

  const handleBack = () => {
    setPhotoModalOpen(false);
    navigate('/scan');
  };

  const handleShowHealthReport = async (selectedItems: ReviewItem[]) => {
    try {
      const reportData = await generateHealthReport(selectedItems);
      navigate('/health-scan/report', { 
        state: { 
          reportData,
          items: selectedItems 
        } 
      });
    } catch (error) {
      console.error('Failed to generate health report:', error);
      toast.error('Failed to generate health report');
    }
  };

  // Legacy camera fallback (when feature flag is disabled)
  const LegacyCameraFallback = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center">
          <Camera className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Health Photo Scanner</h1>
        <p className="text-white/70 mb-6">
          Camera feature is currently disabled. Please try again later.
        </p>
        <Button 
          onClick={handleBack}
          className="w-full bg-primary hover:bg-primary/90"
        >
          Go Back
        </Button>
      </div>
    </div>
  );

  // Show legacy camera fallback if feature flag is disabled
  if (!useLegacyCamera) {
    return <LegacyCameraFallback />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Legacy PhotoCaptureModal - Exact same as Log Food flow */}
      <PhotoCaptureModal
        open={photoModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleBack();
          }
          setPhotoModalOpen(open);
        }}
        onCapture={handlePhotoCapture}
        onManualFallback={handleManualFallback}
      />

      {/* Health Report Review Modal - Dark red/purple background */}
      <HealthReportReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onShowHealthReport={handleShowHealthReport}
        onNext={() => {}} // Not used in health scan flow
        onLogImmediately={() => {}} // Not used in health scan flow
        items={detectedItems}
      />
    </div>
  );
}