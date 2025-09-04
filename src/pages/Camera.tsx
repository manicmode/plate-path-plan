import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Mic, MicOff, ScanBarcode, FileText, Save, UtensilsCrossed } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapToLogFood } from '@/features/logging/utils/barcodeToLogFood';
import { useAuth } from '@/contexts/auth';
import { SavedSetsSheet } from '@/components/camera/SavedSetsSheet';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { sendToLogVoice } from '@/integrations/logVoice';
import { ProcessingStatus } from '@/components/camera/ProcessingStatus';
import { ManualBarcodeEntry } from '@/components/camera/ManualBarcodeEntry';
import { ManualFoodEntry } from '@/components/camera/ManualFoodEntry';
import { LogBarcodeScannerModal } from '@/components/camera/LogBarcodeScannerModal';
import { useNavigate } from 'react-router-dom';
import { ReviewItemsScreen, ReviewItem } from '@/components/camera/ReviewItemsScreen';
import { SummaryReviewPanel, SummaryItem } from '@/components/camera/SummaryReviewPanel';
import { TransitionScreen } from '@/components/camera/TransitionScreen';
import { BarcodeNotFoundModal } from '@/components/camera/BarcodeNotFoundModal';
import { SavedFoodsTab } from '@/components/camera/SavedFoodsTab';
import { UnifiedLoggingTabs } from '@/components/camera/UnifiedLoggingTabs';
import { ActivityLoggingSection } from '@/components/logging/ActivityLoggingSection';
import { UnifiedPhotoCaptureModal } from '@/components/camera/UnifiedPhotoCaptureModal';
import { SmartAnalyzeLoader } from '@/components/loaders/SmartAnalyzeLoader';
import { useAnalyzeFlow } from '@/hooks/useAnalyzeFlow';
import { analyzePhotoForLyfV1 } from '@/lyf_v1_frozen';

type ImageSource = File | Blob | string;

const CameraPage = () => {
  const navigate = useNavigate();
  useScrollToTop();
  
  // State management
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [inputSource, setInputSource] = useState<'photo' | 'barcode' | 'voice' | null>(null);
  const [activeTab, setActiveTab] = useState('recent');
  
  // Barcode scanning states
  const [showLogBarcodeScanner, setShowLogBarcodeScanner] = useState(false);
  const [showBarcodeNotFound, setShowBarcodeNotFound] = useState(false);
  const [showManualBarcodeEntry, setShowManualBarcodeEntry] = useState(false);
  const [showManualFoodEntry, setShowManualFoodEntry] = useState(false);
  const [failedBarcode, setFailedBarcode] = useState<string>('');
  
  // Other UI states
  const [showSavedSetsSheet, setShowSavedSetsSheet] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  
  // Analysis flow states
  const [showSmartLoader, setShowSmartLoader] = useState(false);
  const [analyzePhase, setAnalyzePhase] = useState<'analyzing' | 'searching' | 'complete'>('analyzing');
  const [analyzeDone, setAnalyzeDone] = useState(false);
  
  // Voice recording states
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const { user } = useAuth();
  const { isRecording, startRecording, stopRecording } = useVoiceRecording();
  const { cancel: cancelAnalyzeFlow } = useAnalyzeFlow();

  // Reset error state function
  const resetErrorState = () => {
    setSelectedImage(null);
    setShowReviewScreen(false);
    setIsAnalyzing(false);
    setProcessingStep(null);
  };

  // Handle barcode detection
  const handleBarcodeDetected = async (barcode: string) => {
    console.log('[BARCODE] Detected:', barcode);
    setShowLogBarcodeScanner(false);
    setIsAnalyzing(true);
    setInputSource('barcode');
    
    try {
      // Use the working barcode pipeline
      const response = await supabase.functions.invoke('analyze-barcode', {
        body: { barcode }
      });

      if (response.error) {
        throw new Error(`API Error: ${response.error.message}`);
      }

      const { data } = response;
      
      if (!data || data.ok === false) {
        console.log('[BARCODE] Not found, showing not found modal');
        setFailedBarcode(barcode);
        setShowBarcodeNotFound(true);
        return;
      }

      // Success - convert to review items
      const logFood = mapToLogFood(barcode, data.report);
      const reviewItem: ReviewItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: logFood.name,
        canonicalName: logFood.name,
        portion: `${logFood.servingGrams || 100}g`,
        selected: true,
        grams: logFood.servingGrams || 100,
        mapped: true
      };

      console.log('[FLOW][REVIEW:OPEN]', { count: 1, source: 'barcode' });
      setReviewItems([reviewItem]);
      setShowReviewScreen(true);
      
    } catch (error) {
      console.error('[BARCODE] Error:', error);
      toast.error('Failed to analyze barcode');
      setFailedBarcode(barcode);
      setShowBarcodeNotFound(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle image confirmation
  const handleConfirmImage = async (imageSource: ImageSource) => {
    console.log('[FLOW][PHOTO:CONFIRM]', { imageSource: typeof imageSource });
    setShowCamera(false);
    setInputSource('photo');
    
    try {
      let processedImage: string;
      
      if (typeof imageSource === 'string') {
        processedImage = imageSource;
      } else {
        // Convert File/Blob to data URL
        const reader = new FileReader();
        processedImage = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageSource);
        });
      }
      
      setSelectedImage(processedImage);
      
      // Start smart loader
      setShowSmartLoader(true);
      setAnalyzePhase('analyzing');
      setAnalyzeDone(false);
      
      // Analyze the image
      await analyzeImage(processedImage);
      
    } catch (error) {
      console.error('[PHOTO] Error:', error);
      toast.error('Failed to process image');
      setShowSmartLoader(false);
    }
  };

  // Analyze image function
  const analyzeImage = async (imageUrl?: string) => {
    const imageToAnalyze = imageUrl || selectedImage;
    if (!imageToAnalyze) return;
    
    setIsAnalyzing(true);
    setProcessingStep('Analyzing image...');
    
    try {
      const result = await analyzePhotoForLyfV1(supabase, imageToAnalyze);
      
      if (!result?.mappedFoodItems || result.mappedFoodItems.length === 0) {
        throw new Error('No food items detected');
      }
      
      // Convert to review items
      const reviewItems: ReviewItem[] = result.mappedFoodItems.map((item) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        portion: `${item.portionGrams || 100}g`,
        selected: true,
        grams: item.portionGrams || 100,
        mapped: true
      }));
      
      console.log('[FLOW][REVIEW:OPEN]', { count: reviewItems.length, source: 'photo' });
      setReviewItems(reviewItems);
      
      // Update analyze flow
      setAnalyzePhase('complete');
      setAnalyzeDone(true);
      
      // Show review screen after a delay
      setTimeout(() => {
        setShowSmartLoader(false);
        setShowReviewScreen(true);
      }, 1000);
      
    } catch (error) {
      console.error('[ANALYZE] Error:', error);
      toast.error('Failed to analyze image');
      setShowSmartLoader(false);
    } finally {
      setIsAnalyzing(false);
      setProcessingStep(null);
    }
  };

  // Handle review close
  const handleReviewClose = () => {
    setShowReviewScreen(false);
    setReviewItems([]);
    resetErrorState();
  };

  // Handle review next
  const handleReviewNext = (items: ReviewItem[]) => {
    console.log('[FLOW][REVIEW:NEXT]', { count: items.length });
    setShowReviewScreen(false);
    
    // Convert to summary items and show summary
    const summaryItems: SummaryItem[] = items.map(item => ({
      id: item.id,
      name: item.name,
      canonicalName: item.canonicalName,
      portion: item.portion,
      grams: item.grams || 100,
      selected: item.selected
    }));
    
    setShowSummary(true);
  };

  // Handle transition complete
  const handleTransitionComplete = () => {
    setShowTransition(false);
    resetErrorState();
    navigate('/');
  };

  // Voice recording handlers
  const handleStartRecording = async () => {
    try {
      await startRecording();
      setInputSource('voice');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start voice recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsVoiceProcessing(true);
      const audioBlob = await stopRecording();
      
      if (audioBlob) {
        // Process voice input
        const response = await sendToLogVoice(audioBlob);
        console.log('[VOICE] Response:', response);
        
        if (response.items && response.items.length > 0) {
          // Convert to review items
          const reviewItems: ReviewItem[] = response.items.map((item: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: item.name,
            canonicalName: item.canonicalName || item.name,
            portion: `${item.grams || 100}g`,
            selected: true,
            grams: item.grams || 100,
            mapped: true
          }));
          
          console.log('[FLOW][REVIEW:OPEN]', { count: reviewItems.length, source: 'voice' });
          setReviewItems(reviewItems);
          setShowReviewScreen(true);
        } else {
          toast.error('No food items recognized from voice');
        }
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      toast.error('Failed to process voice input');
    } finally {
      setIsVoiceProcessing(false);
    }
  };

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleConfirmImage(file);
    }
  };

  // iOS Safari viewport fix
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Processing Status */}
      <ProcessingStatus 
        isProcessing={isAnalyzing || isVoiceProcessing || !!processingStep}
        processingStep={processingStep}
        showTimeout={isAnalyzing}
      />

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Log Your Food
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => setShowCamera(true)}
                  className="h-24 flex flex-col gap-2"
                  variant="outline"
                >
                  <Camera className="h-6 w-6" />
                  Take Photo
                </Button>
                
                <Button
                  onClick={() => setShowLogBarcodeScanner(true)}
                  className="h-24 flex flex-col gap-2"
                  variant="outline"
                >
                  <ScanBarcode className="h-6 w-6" />
                  Scan Barcode
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 flex flex-col gap-2"
                  variant="outline"
                >
                  <Upload className="h-6 w-6" />
                  Upload Photo
                </Button>
                
                <Button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className="h-24 flex flex-col gap-2"
                  variant="outline"
                  disabled={isVoiceProcessing}
                >
                  {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  {isRecording ? 'Stop Recording' : 'Voice Input'}
                </Button>
              </div>

              {/* Additional Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowSavedSetsSheet(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Saved Sets
                </Button>
                
                <Button
                  onClick={() => setShowManualFoodEntry(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Manual Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Unified Logging Tabs */}
      <UnifiedLoggingTabs 
        onFoodSelect={(food) => {
          console.log('[SAVED] Adding food:', food);
          // Handle food selection
        }}
        onBarcodeSelect={(barcode) => {
          console.log('[SAVED] Adding barcode:', barcode);
          // Handle barcode selection
        }}
        onBack={() => {
          console.log('[TABS] Back pressed');
          // Handle back action
        }}
      />

      {/* Saved Foods Tab Content - This would be controlled by the UnifiedLoggingTabs internally */

      {/* Activity Logging Section */}
      <div className="mt-8">
        <ActivityLoggingSection />
      </div>

      {/* Summary Review Panel */}
      {showSummary && (
        <SummaryReviewPanel
          isOpen={showSummary}
          onClose={() => setShowSummary(false)}
          onNext={(items) => {
            console.log('[SUMMARY] Confirmed items:', items);
            setShowSummary(false);
            setShowTransition(true);
          }}
          items={[]}
        />
      )}

      {/* Transition Screen */}
      {showTransition && (
        <TransitionScreen
          isOpen={showTransition}
          onComplete={handleTransitionComplete}
          duration={3500}
        />
      )}

      {/* Review Items Screen */}
      {inputSource !== 'barcode' && (
        <ReviewItemsScreen
          isOpen={showReviewScreen}
          onClose={handleReviewClose}
          onNext={handleReviewNext}
          items={reviewItems}
          context="logging"
        />
      )}

      {/* Log Barcode Scanner Modal */}
      <LogBarcodeScannerModal
        open={showLogBarcodeScanner}
        onOpenChange={setShowLogBarcodeScanner}
        onBarcodeDetected={handleBarcodeDetected}
        onManualEntry={() => {
          setShowLogBarcodeScanner(false);
          setShowManualBarcodeEntry(true);
        }}
      />

      {/* Barcode Not Found Modal */}
      <BarcodeNotFoundModal
        isOpen={showBarcodeNotFound}
        onClose={() => setShowBarcodeNotFound(false)}
        barcode={failedBarcode}
        onManualEntry={() => {
          setShowBarcodeNotFound(false);
          setShowManualFoodEntry(true);
        }}
        onTryAgain={() => {
          setShowBarcodeNotFound(false);
          setShowLogBarcodeScanner(true);
        }}
      />

      {/* Manual Barcode Entry Modal */}
      <ManualBarcodeEntry
        open={showManualBarcodeEntry}
        onOpenChange={setShowManualBarcodeEntry}
        onBarcodeEntered={handleBarcodeDetected}
        onCancel={() => setShowManualBarcodeEntry(false)}
        isProcessing={isAnalyzing}
      />

      {/* Manual Food Entry Modal */}
      <ManualFoodEntry
        isOpen={showManualFoodEntry}
        onClose={() => setShowManualFoodEntry(false)}
      />

      {/* Saved Sets Sheet */}
      <SavedSetsSheet 
        isOpen={showSavedSetsSheet}
        onClose={() => setShowSavedSetsSheet(false)}
        onInsertSet={(items) => {
          const reviewItems = items.map(item => ({
            id: Math.random().toString(36).substr(2, 9),
            name: item.name,
            canonicalName: item.canonicalName,
            portion: `${item.grams}g`,
            selected: true,
            grams: item.grams,
            mapped: true
          }));
          
          console.log('[FLOW][REVIEW:OPEN]', { count: reviewItems.length });
          setReviewItems(reviewItems);
          setShowReviewScreen(true);
        }}
      />

      {/* Unified Photo Capture Modal */}
      <UnifiedPhotoCaptureModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onConfirm={handleConfirmImage}
        title="Position food in the frame"
        subtitle="Capture, upload, or exit"
        bannerEmoji="🍽️"
        bannerTitle="Log your meal"
        bannerSubtext="We'll analyze the photo and prep your review"
      />

      {/* Smart Analyze Loader */}
      {showSmartLoader && (
        <SmartAnalyzeLoader
          phase="detecting"
          done={analyzeDone}
          onCancel={() => {
            cancelAnalyzeFlow();
            setShowSmartLoader(false);
          }}
          title="Preparing your review…"
          subtitle="We're analyzing your photo and loading nutrition data"
        />
      )}
    </div>
  );
};

export default CameraPage;
