import { useState, useRef } from 'react';

export interface RecognizedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturated_fat?: number;
  confidence: number;
  serving?: string;
  servingSize?: string;
  source: string;
  isBranded?: boolean;
  ingredients?: string;
  barcode?: string;
  allergens?: string[];
  additives?: string[];
  nova?: number;
  nutriscore?: string;
  debugLog?: string;
}

export interface VisionApiResponse {
  success: boolean;
  foodLabels?: Array<{ name: string; confidence: number }>;
  textDetected?: string;
  objects?: Array<{ name: string; confidence: number }>;
  plateConfidence?: number;
  error?: string;
}

export interface VoiceApiResponse {
  success: boolean;
  items?: Array<{ name: string; quantity?: string }>;
  error?: string;
}

export function useCameraState() {
  // Image and analysis state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisRequestId, setAnalysisRequestId] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState('');
  
  // Food recognition results
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [visionResults, setVisionResults] = useState<VisionApiResponse | null>(null);
  const [voiceResults, setVoiceResults] = useState<VoiceApiResponse | null>(null);
  
  // UI state
  const [inputSource, setInputSource] = useState<'photo' | 'voice' | 'manual' | 'barcode'>('photo');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'saved' | 'recent'>('main');
  
  // Voice state
  const [voiceText, setVoiceText] = useState('');
  const [showVoiceEntry, setShowVoiceEntry] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  
  // Error state
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState('');
  const [errorSuggestions, setErrorSuggestions] = useState<string[]>([]);
  
  // Barcode state
  const [showBarcodeLogModal, setShowBarcodeLogModal] = useState(false);
  const [isLoadingBarcode, setIsLoadingBarcode] = useState(false);
  const [showBarcodeNotFound, setShowBarcodeNotFound] = useState(false);
  const [failedBarcode, setFailedBarcode] = useState('');
  
  // Manual entry state
  const [showManualEdit, setShowManualEdit] = useState(false);
  
  // Review state
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [summaryItems, setSummaryItems] = useState<any[]>([]);
  
  // Multi-AI detection state
  const [showMultiAIDetection, setShowMultiAIDetection] = useState(false);
  const [isMultiAILoading, setIsMultiAILoading] = useState(false);
  const [multiAIDetectedData, setMultiAIDetectedData] = useState<Map<string, any>>(new Map());
  
  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Reset functions
  const resetErrorState = () => {
    setShowError(false);
    setErrorMessage('');
    setErrorType('');
    setErrorSuggestions([]);
  };

  const resetAnalysisState = () => {
    setIsAnalyzing(false);
    setProcessingStep('');
    setAnalysisRequestId(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const resetAllState = () => {
    setSelectedImage(null);
    setRecognizedFoods([]);
    setVisionResults(null);
    setVoiceResults(null);
    setShowConfirmation(false);
    setVoiceText('');
    setShowVoiceEntry(false);
    setIsVoiceProcessing(false);
    setShowSummaryPanel(false);
    setShowReviewScreen(false);
    setReviewItems([]);
    setSummaryItems([]);
    setShowMultiAIDetection(false);
    setIsMultiAILoading(false);
    setMultiAIDetectedData(new Map());
    resetErrorState();
    resetAnalysisState();
  };

  return {
    // State
    selectedImage, setSelectedImage,
    isAnalyzing, setIsAnalyzing,
    analysisRequestId, setAnalysisRequestId,
    processingStep, setProcessingStep,
    recognizedFoods, setRecognizedFoods,
    visionResults, setVisionResults,
    voiceResults, setVoiceResults,
    inputSource, setInputSource,
    showConfirmation, setShowConfirmation,
    activeTab, setActiveTab,
    voiceText, setVoiceText,
    showVoiceEntry, setShowVoiceEntry,
    isVoiceProcessing, setIsVoiceProcessing,
    showError, setShowError,
    errorMessage, setErrorMessage,
    errorType, setErrorType,
    errorSuggestions, setErrorSuggestions,
    showBarcodeLogModal, setShowBarcodeLogModal,
    isLoadingBarcode, setIsLoadingBarcode,
    showBarcodeNotFound, setShowBarcodeNotFound,
    failedBarcode, setFailedBarcode,
    showManualEdit, setShowManualEdit,
    showSummaryPanel, setShowSummaryPanel,
    showReviewScreen, setShowReviewScreen,
    reviewItems, setReviewItems,
    summaryItems, setSummaryItems,
    showMultiAIDetection, setShowMultiAIDetection,
    isMultiAILoading, setIsMultiAILoading,
    multiAIDetectedData, setMultiAIDetectedData,
    abortControllerRef,
    
    // Actions
    resetErrorState,
    resetAnalysisState,
    resetAllState,
  };
}