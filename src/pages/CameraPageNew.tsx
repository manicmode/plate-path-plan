import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useCameraState } from '@/hooks/useCameraState';
import { CameraActions } from '@/components/camera/CameraActions';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { BarcodeLogModal } from '@/components/scan/BarcodeLogModal';
import { SavedFoodsTab } from '@/components/camera/SavedFoodsTab';
import { RecentFoodsTab } from '@/components/camera/RecentFoodsTab';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { toast } from 'sonner';

const CameraPageNew = () => {
  useScrollToTop();
  
  const {
    // State
    selectedImage, setSelectedImage,
    isAnalyzing, setIsAnalyzing,
    processingStep, setProcessingStep,
    recognizedFoods, setRecognizedFoods,
    inputSource, setInputSource,
    showConfirmation, setShowConfirmation,
    activeTab, setActiveTab,
    voiceText, setVoiceText,
    showVoiceEntry, setShowVoiceEntry,
    isVoiceProcessing, setIsVoiceProcessing,
    showBarcodeLogModal, setShowBarcodeLogModal,
    showManualEdit, setShowManualEdit,
    
    // Actions
    resetErrorState,
    resetAllState,
  } = useCameraState();

  const {
    isRecording,
    startRecording,
    stopRecording,
  } = useVoiceRecording();

  // Photo capture handler
  const handlePhotoCapture = () => {
    // This would trigger the camera capture UI
    toast.info('Camera capture functionality - to be implemented');
  };

  // Voice recording handler
  const handleVoiceToggle = async () => {
    try {
      if (isRecording) {
        setProcessingStep('Processing...');
        const transcribedText = await stopRecording();
        
        if (transcribedText) {
          setVoiceText(transcribedText);
          setShowVoiceEntry(true);
          setInputSource('voice');
          resetErrorState();
        }
        setProcessingStep('');
      } else {
        await startRecording();
        resetErrorState();
      }
    } catch (error) {
      console.error('Voice recording error:', error);
      toast.error('Voice recording failed');
      setProcessingStep('');
    }
  };

  // Barcode capture handler
  const handleBarcodeCapture = () => {
    setShowBarcodeLogModal(true);
    setInputSource('barcode');
    resetErrorState();
  };

  // Manual entry handler
  const handleManualEntry = () => {
    setShowManualEdit(true);
    setInputSource('manual');
    resetErrorState();
  };

  // Image selection handler
  const handleImageSelected = (imageDataUrl: string) => {
    setSelectedImage(imageDataUrl);
    setInputSource('photo');
    // This would trigger image analysis
    toast.info('Image analysis - to be implemented');
  };

  // Tab food selection handler
  const handleTabFoodSelect = (food: any) => {
    setRecognizedFoods([food]);
    setShowConfirmation(true);
    setActiveTab('main');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <Card className="w-full shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Nutrition Logger
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Track your meals with AI-powered food recognition
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Actions */}
          {activeTab === 'main' && (
            <div className="space-y-6">
              {!selectedImage && (
                <CameraCapture
                  onImageSelected={handleImageSelected}
                  disabled={isAnalyzing}
                />
              )}

              <CameraActions
                onPhotoCapture={handlePhotoCapture}
                isAnalyzing={isAnalyzing}
                processingStep={processingStep}
              onVoiceToggle={handleVoiceToggle}
              isRecording={isRecording}
              isVoiceProcessing={isVoiceProcessing}
              disabled={!!processingStep}
              onBarcodeCapture={handleBarcodeCapture}
                onManualEntry={handleManualEntry}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          )}

          {/* Saved Foods Tab */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              <Button
                onClick={() => setActiveTab('main')}
                variant="outline"
                className="w-full"
              >
                ← Back to Main
              </Button>
              <SavedFoodsTab
                onFoodSelect={handleTabFoodSelect}
              />
            </div>
          )}

          {/* Recent Foods Tab */}
          {activeTab === 'recent' && (
            <div className="space-y-4">
              <Button
                onClick={() => setActiveTab('main')}
                variant="outline"
                className="w-full"
              >
                ← Back to Main
              </Button>
              <RecentFoodsTab
                onFoodSelect={handleTabFoodSelect}
                onBarcodeSelect={(barcode) => {
                  console.log('Barcode selected:', barcode);
                  toast.info('Barcode selection - to be implemented');
                }}
              />
            </div>
          )}

          {/* Food Confirmation */}
          {showConfirmation && recognizedFoods.length > 0 && (
            <FoodConfirmationCard
              isOpen={true}
              onClose={() => {
                setShowConfirmation(false);
                setRecognizedFoods([]);
              }}
              onConfirm={(adjustedFood) => {
                console.log('Food confirmed:', adjustedFood);
                toast.success('Food logged successfully!');
                resetAllState();
              }}
              foodItem={recognizedFoods[0]}
            />
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <BarcodeLogModal
        open={showBarcodeLogModal}
        onOpenChange={setShowBarcodeLogModal}
      />

      {showManualEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Manual Food Entry</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualEdit(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Manual food entry functionality - to be implemented
              </p>
              <Button
                onClick={() => {
                  toast.info('Manual entry feature coming soon');
                  setShowManualEdit(false);
                }}
                className="w-full mt-4"
              >
                Add Food
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CameraPageNew;