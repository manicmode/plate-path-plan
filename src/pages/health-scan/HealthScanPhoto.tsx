import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoCaptureModal } from '@/components/scan/PhotoCaptureModal';
import { runFoodDetectionPipeline } from '@/lib/pipelines/runFoodDetectionPipeline';
import { HealthReportReviewModal } from '@/components/health-report/HealthReportReviewModal';
import { ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { renderHealthReport } from '@/lib/health/renderHealthReport';
import { resolveGenericFood } from '@/health/generic/resolveGenericFood';
import { productFromGeneric } from '@/health/generic/mapToProductModel';
import type { HealthAnalysisResult } from '@/components/health-check/HealthCheckModal';

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
    
    // Enforce golden detection pipeline
    const USE_GOLDEN = (import.meta.env.VITE_DETECTOR_PIPELINE_VERSION ?? 'golden') === 'golden';
    if (!USE_GOLDEN) {
      console.warn('[HEALTH_SCAN] Non-golden pipeline requested, defaulting to golden for Health Scan');
    }
    
    try {
      const result = await runFoodDetectionPipeline(imageBase64, { 
        mode: 'health'
      });
      
      if (result.success && result.items.length > 0) {
        // Add minimal diagnostics
        console.info('[HEALTH][PIPELINE] golden', { count: result.items?.length ?? 0 });
        
        setDetectedItems(result.items);
        setShowReviewModal(true);
        setPhotoModalOpen(false);
        toast.success('Food detection complete!');
      } else {
        console.info('[HEALTH][PIPELINE] golden', { count: 0 });
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
      // Convert each detected item to generic food and create health analysis
      if (selectedItems.length === 1) {
        // Single item - use the full health report modal
        const item = selectedItems[0];
        const genericFood = resolveGenericFood(item.name);
        
        if (genericFood) {
          console.info('[HEALTH][PHOTO] Using generic food data for:', item.name, '→', genericFood.slug);
          
          const productModel = productFromGeneric(genericFood);
          
          // Create HealthAnalysisResult from generic food data
          const healthAnalysisResult: HealthAnalysisResult = {
            itemName: productModel.name,
            productName: productModel.name,
            title: productModel.name,
            healthScore: 85, // Default good score for whole foods
            ingredientsText: `${productModel.name} (whole food)`,
            ingredientFlags: [],
            flags: [],
            nutritionData: {
              calories: productModel.nutrients.calories || 0,
              protein: productModel.nutrients.protein_g || 0,
              carbs: productModel.nutrients.carbs_g || 0,
              fat: productModel.nutrients.fat_g || 0,
              fiber: productModel.nutrients.fiber_g || 0,
              sugar: productModel.nutrients.sugar_g || 0,
              sodium: productModel.nutrients.sodium_mg || 0,
            },
            nutritionDataPerServing: {
              energyKcal: productModel.nutrients.calories || 0,
              protein_g: productModel.nutrients.protein_g || 0,
              carbs_g: productModel.nutrients.carbs_g || 0,
              fat_g: productModel.nutrients.fat_g || 0,
              fiber_g: productModel.nutrients.fiber_g || 0,
              sugar_g: productModel.nutrients.sugar_g || 0,
              sodium_mg: productModel.nutrients.sodium_mg || 0,
            },
            serving_size: productModel.serving?.label || `${productModel.serving?.grams}g`,
            healthProfile: {
              isOrganic: false,
              isGMO: false,
              allergens: [],
              preservatives: [],
              additives: []
            },
            personalizedWarnings: [],
            suggestions: [
              'Whole foods like this are excellent nutritional choices',
              'Consider pairing with other nutrient-dense foods for a complete meal'
            ],
            overallRating: 'excellent' as const
          };

          // Use the same renderHealthReport system as barcode/manual/voice
          renderHealthReport({
            result: healthAnalysisResult,
            onScanAnother: () => {
              setShowReviewModal(false);
              setPhotoModalOpen(true);
            },
            onClose: () => {
              setShowReviewModal(false);
              navigate('/scan');
            },
            analysisData: {
              source: 'photo',
              imageUrl: undefined
            }
          });
        } else {
          toast.error(`Nutrition data not available for ${item.name}`);
        }
      } else {
        // Multiple items - show simple message for now
        toast.info('Please select one item at a time for detailed analysis');
      }
    } catch (error) {
      console.error('Failed to show health report:', error);
      toast.error('Failed to show health report');
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