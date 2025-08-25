import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Droplets, Pill, Sparkles } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useCameraState, RecognizedFood } from '@/hooks/useCameraState';
import { CameraActions } from '@/components/camera/CameraActions';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { BarcodeLogModal } from '@/components/scan/BarcodeLogModal';
import { SavedFoodsTab } from '@/components/camera/SavedFoodsTab';
import { RecentFoodsTab } from '@/components/camera/RecentFoodsTab';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useHealthScanner } from '@/hooks/useHealthScanner';
import { useSpeechToLog } from '@/hooks/useSpeechToLog';
import { addFoodLog } from '@/lib/addFoodLog';
import { convertRecognizedFoodToFoodItem } from '@/lib/nutritionConverter';
import { toast } from 'sonner';
import { AddWorkoutModal } from '@/components/AddWorkoutModal';
import { SessionPickerModal } from '@/components/meditation/SessionPickerModal';
import { HabitAddModal, HabitConfig } from '@/components/habit-central/HabitAddModal';
import { HabitTemplate } from '@/components/habit-central/CarouselHabitCard';
import { useNavigate } from 'react-router-dom';
import { PHOTO_ANALYSIS_ENABLED, VOICE_LOGGING_ENABLED, MANUAL_ENTRY_ENABLED } from '@/lib/featureFlags';
import { logEvent } from '@/lib/telemetry';

const CameraPageNew = () => {
  useScrollToTop();
  const navigate = useNavigate();
  
  // New modal states for Exercise/Recovery/Habit
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitTemplate | null>(null);
  
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

  const { scanWithHealthScanner, isScanning: isPhotoAnalyzing } = useHealthScanner();

  const { handleVoiceRecording, isProcessing: isVoiceAnalyzing } = useSpeechToLog({
    onFoodDetected: async (foods) => {
      // Convert detected foods to recognition format and show confirmation
      const recognizedFoods: RecognizedFood[] = foods.map(food => ({
        name: food.name,
        confidence: 0.9,
        source: 'voice',
        calories: 0, // Will be filled in confirmation
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        serving: food.quantity || '1 serving',
        ingredients: food.preparation || ''
      }));
      setRecognizedFoods(recognizedFoods);
      setShowConfirmation(true);
      setInputSource('voice');
    },
    onError: (error) => {
      console.error('Voice logging error:', error);
      toast.error('Voice logging failed. Please try again.');
    }
  });

  // Photo capture handler
  const handlePhotoCapture = async () => {
    if (!PHOTO_ANALYSIS_ENABLED) {
      toast.info('Photo analysis is currently disabled');
      return;
    }

    try {
      logEvent('nutrition.photo.start');
      setIsAnalyzing(true);
      setProcessingStep('Taking photo...');
      
      // Get photo from camera
      const imageDataUrl = await capturePhotoFromCamera();
      if (!imageDataUrl) return;

      setSelectedImage(imageDataUrl);
      setProcessingStep('Analyzing food...');

      // Analyze with health scanner
      const result = await scanWithHealthScanner({
        mode: 'scan',
        imageBase64: imageDataUrl.split(',')[1] // Remove data:image/jpeg;base64, prefix
      });

      if (result.success && result.data?.productName) {
        const recognizedFood: RecognizedFood = {
          name: result.data.productName,
          confidence: result.data.brandConfidence || 0.8,
          source: 'photo',
          calories: result.data.nutrients?.energy_kcal || 0,
          protein: result.data.nutrients?.proteins || 0,
          carbs: result.data.nutrients?.carbohydrates || 0,
          fat: result.data.nutrients?.fat || 0,
          fiber: result.data.nutrients?.fiber || 0,
          sugar: result.data.nutrients?.sugars || 0,
          sodium: result.data.nutrients?.salt || 0,
          saturated_fat: result.data.nutrients?.saturated_fat || 0,
          ingredients: (result.data.ingredients || []).join(', '),
          allergens: result.data.allergens || [],
          additives: result.data.additives || [],
          nova: result.data.nova,
          isBranded: !!result.data.brand
        };

        setRecognizedFoods([recognizedFood]);
        setShowConfirmation(true);
        setInputSource('photo');
        logEvent('nutrition.photo.success', { productName: result.data.productName });
      } else {
        toast.error('Could not identify food from photo. Try barcode scan or manual entry.');
        logEvent('nutrition.photo.failed');
      }

    } catch (error) {
      console.error('Photo capture error:', error);
      toast.error('Photo analysis failed');
      logEvent('nutrition.photo.error', { error: error instanceof Error ? error.message : 'Unknown' });
    } finally {
      setIsAnalyzing(false);
      setProcessingStep('');
    }
  };

  const capturePhotoFromCamera = (): Promise<string | null> => {
    return new Promise((resolve) => {
      // For now, simulate camera capture - in real implementation this would use camera API
      toast.info('Camera integration coming soon - use barcode scan instead');
      resolve(null);
    });
  };

  // Voice recording handler
  const handleVoiceToggle = async () => {
    if (!VOICE_LOGGING_ENABLED) {
      toast.info('Voice logging is currently disabled');
      return;
    }

    try {
      logEvent('nutrition.voice.toggle', { wasRecording: isRecording });
      await handleVoiceRecording();
      resetErrorState();
    } catch (error) {
      console.error('Voice recording error:', error);
      toast.error('Voice recording failed');
    }
  };

  // Barcode capture handler
  const handleBarcodeCapture = () => {
    logEvent('nutrition.barcode.open');
    setShowBarcodeLogModal(true);
    setInputSource('barcode');
    resetErrorState();
  };

  // Manual entry handler
  const handleManualEntry = () => {
    if (!MANUAL_ENTRY_ENABLED) {
      toast.info('Manual entry is currently disabled');
      return;
    }

    logEvent('nutrition.manual.open');
    setShowManualEdit(true);
    setInputSource('manual');
    resetErrorState();
  };

  // Exercise log handler
  const handleExerciseLog = () => {
    setShowExerciseModal(true);
    console.log('[telemetry] log.exercise.open');
  };

  // Recovery log handler  
  const handleRecoveryLog = () => {
    setShowRecoveryModal(true);
    console.log('[telemetry] log.recovery.open');
  };

  // Habit log handler
  const handleHabitLog = () => {
    // For now, create a mock habit template
    const mockHabit: HabitTemplate = {
      id: 'quick-habit',
      slug: 'quick-habit',
      title: 'Quick Habit',
      domain: 'nutrition',
      description: 'Track a quick habit',
      difficulty: 'easy',
      category: 'nutrition'
    };
    setSelectedHabit(mockHabit);
    setShowHabitModal(true);
    console.log('[telemetry] log.habit.open');
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
              <CameraActions
                onPhotoCapture={handlePhotoCapture}
                isAnalyzing={isAnalyzing || isPhotoAnalyzing}
                processingStep={processingStep}
                onVoiceToggle={handleVoiceToggle}
                isRecording={isRecording}
                isVoiceProcessing={isVoiceProcessing || isVoiceAnalyzing}
                disabled={!!processingStep || isPhotoAnalyzing || isVoiceAnalyzing}
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
              onConfirm={async (adjustedFood) => {
                try {
                  logEvent('nutrition.confirm.start', { source: inputSource, foodName: adjustedFood.name });
                  
                  await addFoodLog({
                    source: inputSource === 'photo' ? 'photo' : 
                           inputSource === 'voice' ? 'voice' : 
                           inputSource === 'barcode' ? 'barcode' : 'manual',
                    productName: adjustedFood.name,
                    nutrients: {
                      energy_kcal: adjustedFood.calories,
                      proteins: adjustedFood.protein,
                      carbohydrates: adjustedFood.carbs,
                      fat: adjustedFood.fat,
                      fiber: adjustedFood.fiber,
                      sugars: adjustedFood.sugar,
                      salt: adjustedFood.sodium
                    },
                    ingredients: adjustedFood.ingredientsText ? [adjustedFood.ingredientsText] : [],
                    serving: {
                      amount: 1,
                      unit: 'serving'
                    },
                    barcode: adjustedFood.barcode
                  });
                  
                  logEvent('nutrition.confirm.success', { source: inputSource, foodName: adjustedFood.name });
                  resetAllState();
                } catch (error) {
                  console.error('Error logging food:', error);
                  logEvent('nutrition.confirm.error', { source: inputSource, error: error instanceof Error ? error.message : 'Unknown' });
                  toast.error('Failed to log food. Please try again.');
                }
              }}
              foodItem={convertRecognizedFoodToFoodItem(recognizedFoods[0])}
            />
          )}
        </CardContent>
      </Card>

      {/* Exercise, Recovery & Habits Card */}
      <Card className="w-full shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 mt-6">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Exercise, Recovery & Habits
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Track your fitness, wellness, and daily habits
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Exercise Log */}
          <Button
            onClick={handleExerciseLog}
            className="h-14 w-full gradient-primary flex items-center justify-between px-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/50"
            size="lg"
          >
            <div className="flex items-center space-x-3">
              <Sparkles className="h-5 w-5" />
              <span className="text-base font-medium">Exercise Log</span>
            </div>
            <div className="h-4 w-4 opacity-60">→</div>
          </Button>

          {/* Recovery Log */}
          <Button
            onClick={handleRecoveryLog}
            className="h-14 w-full gradient-primary flex items-center justify-between px-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/50"
            size="lg"
          >
            <div className="flex items-center space-x-3">
              <Sparkles className="h-5 w-5" />
              <span className="text-base font-medium">Recovery Log</span>
            </div>
            <div className="h-4 w-4 opacity-60">→</div>
          </Button>

          {/* Habit Log */}
          <Button
            onClick={handleHabitLog}
            className="h-14 w-full gradient-primary flex items-center justify-between px-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/50"
            size="lg"
          >
            <div className="flex items-center space-x-3">
              <Sparkles className="h-5 w-5" />
              <span className="text-base font-medium">Habit Log</span>
            </div>
            <div className="h-4 w-4 opacity-60">→</div>
          </Button>
        </CardContent>
      </Card>

      {/* Modals */}
      <BarcodeLogModal
        open={showBarcodeLogModal}
        onOpenChange={setShowBarcodeLogModal}
      />

      {/* Exercise Log Modal */}
      <AddWorkoutModal
        isOpen={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSave={(workout) => {
          console.log('[telemetry] log.exercise.added:', { workout });
          toast.success('Exercise logged successfully!');
          setShowExerciseModal(false);
        }}
      />

      {/* Recovery Log Modal */}
      <SessionPickerModal
        isOpen={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
        theme={null}
        onStartSession={(session) => {
          console.log('[telemetry] log.recovery.added:', { session });
          toast.success('Recovery session logged!');
          setShowRecoveryModal(false);
        }}
      />

      {/* Habit Log Modal */}
      <HabitAddModal
        habit={selectedHabit}
        open={showHabitModal}
        onClose={() => {
          setShowHabitModal(false);
          setSelectedHabit(null);
        }}
        onConfirm={(config: HabitConfig) => {
          console.log('[telemetry] log.habit.added:', { config });
          toast.success('Habit reminder set up!');
          setShowHabitModal(false);
          setSelectedHabit(null);
        }}
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
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Food Name or Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g., Greek yogurt or 022000287311"
                    className="w-full px-3 py-2 border rounded-md"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const input = (e.target as HTMLInputElement).value.trim();
                        if (!input) return;

                        try {
                          setShowManualEdit(false);
                          
                          // Check if input is a barcode (numbers only)
                          const isBarcode = /^\d{8,14}$/.test(input);
                          
                          if (isBarcode) {
                            // Handle as barcode
                            logEvent('nutrition.manual.barcode_search', { barcode: input });
                            const result = await scanWithHealthScanner({ mode: 'barcode', barcode: input });
                            
                            if (result.success && result.data?.productName) {
                              const food: RecognizedFood = {
                                name: result.data.productName,
                                confidence: 1.0,
                                source: 'manual',
                                calories: result.data.nutrients?.energy_kcal || 0,
                                protein: result.data.nutrients?.proteins || 0,
                                carbs: result.data.nutrients?.carbohydrates || 0,
                                fat: result.data.nutrients?.fat || 0,
                                fiber: result.data.nutrients?.fiber || 0,
                                sugar: result.data.nutrients?.sugars || 0,
                                sodium: result.data.nutrients?.salt || 0,
                                saturated_fat: result.data.nutrients?.saturated_fat || 0,
                                ingredients: (result.data.ingredients || []).join(', '),
                                allergens: result.data.allergens || [],
                                additives: result.data.additives || [],
                                nova: result.data.nova,
                                isBranded: !!result.data.brand,
                                barcode: input
                              };
                              setRecognizedFoods([food]);
                              setShowConfirmation(true);
                              setInputSource('manual');
                            } else {
                              toast.error('Product not found for this barcode');
                            }
                          } else {
                            // Handle as text search
                            logEvent('nutrition.manual.text_search', { query: input });
                            const result = await scanWithHealthScanner({ mode: 'text', text: input });
                            
                            if (result.success && result.data?.productName) {
                              const food: RecognizedFood = {
                                name: result.data.productName,
                                confidence: 0.8,
                                source: 'manual',
                                calories: result.data.nutrients?.energy_kcal || 0,
                                protein: result.data.nutrients?.proteins || 0,
                                carbs: result.data.nutrients?.carbohydrates || 0,
                                fat: result.data.nutrients?.fat || 0,
                                fiber: result.data.nutrients?.fiber || 0,
                                sugar: result.data.nutrients?.sugars || 0,
                                sodium: result.data.nutrients?.salt || 0,
                                ingredients: (result.data.ingredients || []).join(', ')
                              };
                              setRecognizedFoods([food]);
                              setShowConfirmation(true);
                              setInputSource('manual');
                            } else {
                              // Create basic food entry for unknown items
                              const food: RecognizedFood = {
                                name: input,
                                confidence: 0.5,
                                source: 'manual',
                                calories: 0,
                                protein: 0,
                                carbs: 0,
                                fat: 0,
                                fiber: 0,
                                sugar: 0,
                                sodium: 0
                              };
                              setRecognizedFoods([food]);
                              setShowConfirmation(true);
                              setInputSource('manual');
                            }
                          }
                        } catch (error) {
                          console.error('Manual entry error:', error);
                          toast.error('Search failed. Please try again.');
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Press Enter to search
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CameraPageNew;