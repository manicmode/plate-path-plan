import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, Keyboard, Mic, Zap, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HealthScannerInterface } from './HealthScannerInterface';
import { FF } from '@/featureFlags';
import { PipelineRouter } from './PipelineRouter';
import BarcodeScannerShim from './BarcodeScannerShim';
import { HealthAnalysisLoading } from './HealthAnalysisLoading';
import { HealthReportPopup } from './HealthReportPopup';
import { NoDetectionFallback } from './NoDetectionFallback';
import { ManualEntryFallback } from './ManualEntryFallback';
import { ImprovedManualEntry } from './ImprovedManualEntry';
import { BrandedCandidatesList } from './BrandedCandidatesList';
import { MultiAIFoodDetection } from '@/components/camera/MultiAIFoodDetection';
import { ResultCard } from './ResultCard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { triggerDailyScoreCalculation } from '@/lib/dailyScoreUtils';
import { toLegacyFromEdge } from '@/lib/health/toLegacyFromEdge';
import { logScoreNorm } from '@/lib/health/extractScore';
import { isFeatureEnabled, isInRollout } from '@/lib/featureFlags';
import { analyzeProductForQuality, nutriScoreTo10, type AnalyzerResult } from '@/shared/barcode-analyzer';
import { useE2EPhotoCheck } from '@/hooks/useE2EPhotoCheck';
import { detectFoodsFromAllSources } from '@/utils/multiFoodDetector';
import { logMealAsSet } from '@/utils/mealLogging';
import { useScanRecents } from '@/hooks/useScanRecents';
import { useHealthCheckV2 } from './HealthCheckModalV2';
import { handleSearchPick, num, score10, pickBrand, displayNameFor } from '@/shared/search-to-analysis';
import { mark, measure } from '@/lib/perf';
import { logActiveCSP } from '@/lib/cspUtils';

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';

// Performance optimization: throttle debug logs in production
const debugThrottled = (() => {
  let lastLog = 0;
  return (message: string, data?: any) => {
    const now = Date.now();
    if (now - lastLog > 1000) { // Max 1 log per second
      console.log(message, data);
      lastLog = now;
    }
  };
})();

// Robust score extractor (0–100) with scoreUnit handling
function extractScore(raw: unknown, scoreUnit?: string): number | undefined {
  const candidate =
    raw && typeof raw === 'object' ? (raw as any).score ?? (raw as any).value ?? raw : raw;
  if (candidate == null) return undefined;
  const s = String(candidate).trim();

  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const num = Number(frac[1]), den = Number(frac[2] || 100);
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
      return Math.max(0, Math.min(100, (num / den) * 100));
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  
  // Trust 0-10 scores, convert others
  if (scoreUnit === '0-10') {
    return Math.max(0, Math.min(100, n * 10)); // 0-10 to 0-100
  }
  
  const pct = n <= 1 ? n * 100 : n;           // accept 0–1 and 0–100
  return Math.max(0, Math.min(100, pct));     // clamp
}

// Extract nutrition data with 7-field mapping for OFF - prefer per-serving with fallbacks
function extractNutritionData(nutritionData: any) {
  if (!nutritionData || typeof nutritionData !== 'object') {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    };
  }

  // OFF nutriments → prefer per serving; fallback to per 100g; scale by serving_size if needed
  const n = nutritionData;
  const getNum = (v: any) => (typeof v === 'number' ? v : Number(v));

  const servingSizeStr = n['serving_size'] || n['serving-size'] || null;
  const servingG = (() => {
    if (!servingSizeStr || typeof servingSizeStr !== 'string') return null;
    const m = servingSizeStr.toLowerCase().match(/([\d.]+)\s*g/);
    return m ? Number(m[1]) : null;
  })();

  const pick = (servKey: string, per100Key: string, convert?: (v:number)=>number) => {
    const s = getNum(n[servKey]);
    if (isFinite(s)) return convert ? convert(s) : s;

    const h = getNum(n[per100Key]);
    if (isFinite(h) && servingG != null) {
      const scaled = (h * servingG) / 100; // scale per 100g → per serving grams
      return convert ? convert(scaled) : scaled;
    }
    return isFinite(h) ? (convert ? convert(h) : h) : 0;
  };

  // energy: kcal
  const kcal = (() => {
    // explicit kcal_serving or energy_serving (kJ)
    const kcalServing = getNum(n['energy-kcal_serving']);
    if (isFinite(kcalServing)) return kcalServing;

    const kJserv = getNum(n['energy_serving']); // kJ
    if (isFinite(kJserv)) return kJserv * 0.239005736;

    // per 100g fallback
    const kcal100 = getNum(n['energy-kcal_100g']);
    if (isFinite(kcal100) && servingG != null) return (kcal100 * servingG) / 100;

    const kJ100 = getNum(n['energy_100g']);
    if (isFinite(kJ100) && servingG != null) return (kJ100 * 0.239005736 * servingG) / 100;

    return isFinite(kcal100) ? kcal100 : (isFinite(kJ100) ? kJ100 * 0.239005736 : 0);
  })();

  // Sodium: OFF is usually grams; UI expects mg
  const toMg = (g:number) => g * 1000;

  // Salt→Sodium: g of salt × 400 = mg sodium
  const saltToSodiumMg = (g:number) => g * 400 * 1000;

  return {
    calories: Math.max(0, Number(kcal) || 0),
    protein:  Math.max(0, Number(pick('proteins_serving', 'proteins_100g')) || 0),
    carbs:    Math.max(0, Number(pick('carbohydrates_serving', 'carbohydrates_100g')) || 0),
    fat:      Math.max(0, Number(pick('fat_serving', 'fat_100g')) || 0),
    sugar:    Math.max(0, Number(pick('sugars_serving', 'sugars_100g')) || 0),
    fiber:    Math.max(0, Number(pick('fiber_serving', 'fiber_100g')) || 0),
    sodium:   (() => {
      const sServ = getNum(n['sodium_serving']); if (isFinite(sServ)) return toMg(sServ);
      const s100 = getNum(n['sodium_100g']);     if (isFinite(s100) && servingG != null) return toMg((s100 * servingG) / 100);
      const saltServ = getNum(n['salt_serving']); if (isFinite(saltServ)) return saltToSodiumMg(saltServ);
      const salt100 = getNum(n['salt_100g']);     if (isFinite(salt100) && servingG != null) return saltToSodiumMg((salt100 * servingG) / 100);
      return 0;
    })()
  };
}

interface HealthCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialState?: ModalState;
  analysisData?: {
    source?: string;
    barcode?: string;
    name?: string;
    productName?: string;
    product?: any;
    imageBase64?: string;
    captureTs?: number;
  };
}

export interface HealthAnalysisResult {
  itemName: string;
  productName?: string; // alias for components reading productName
  title?: string;       // alias for components reading title
  healthScore: number;
  ingredientsText?: string; // Full ingredient list from product data
  ingredientFlags: Array<{
    ingredient: string;
    flag: string;
    severity: 'low' | 'medium' | 'high';
    reason?: string;
  }>;
  flags?: Array<{
    ingredient: string;
    flag: string;
    severity: 'low' | 'medium' | 'high';
    reason?: string;
  }>; // Alias for ingredientFlags to ensure UI compatibility
  nutritionData: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  // Add per-serving nutrition support
  nutritionDataPerServing?: {
    energyKcal?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    satfat_g?: number;
  };
  serving_size?: string;
  // Provide both nutrition shapes for UI compatibility
  nutrition?: { nutritionData: any };
  healthProfile: {
    isOrganic?: boolean;
    isGMO?: boolean;
    allergens?: string[];
    preservatives?: string[];
    additives?: string[];
  };
  personalizedWarnings: string[];
  suggestions: string[];
  overallRating: 'excellent' | 'good' | 'fair' | 'poor' | 'avoid';
}

type ModalState = 'scanner' | 'loading' | 'report' | 'fallback' | 'no_detection' | 'not_found' | 'candidates' | 'meal_detection' | 'meal_confirm';

export const HealthCheckModal: React.FC<HealthCheckModalProps> = ({
  isOpen,
  onClose,
  initialState = 'scanner',
  analysisData
}) => {
  const [currentState, setCurrentState] = useState<ModalState>(initialState);
  const [analysisResult, setAnalysisResult] = useState<HealthAnalysisResult | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [mealFoods, setMealFoods] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [analysisType, setAnalysisType] = useState<'barcode' | 'image' | 'manual'>('image');
  const [currentAnalysisData, setCurrentAnalysisData] = useState<{
    source: string;
    barcode?: string;
    imageUrl?: string;
  }>({ source: 'photo' });
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addRecent } = useScanRecents();
  const currentRunId = useRef<string | null>(null);
  const { onAnalyzeImage } = useHealthCheckV2();
  const processedPhotoKeyRef = useRef<string>('');

  // OCR-only pipeline that bypasses barcode/hybrid scanners
  const runOcrPipeline = async (imageBase64: string) => {
    console.groupCollapsed("[PHOTO][OCR_ONLY]");
    
    const runId = crypto.randomUUID();
    currentRunId.current = runId;
    
    const currentCaptureId = crypto.randomUUID().substring(0, 8);
    setCaptureId(currentCaptureId);
    setIsProcessing(true);
    
    try {
      setCurrentState('loading');
      setLoadingMessage('Reading text from image...');
      setCurrentAnalysisData({ source: 'photo' });
      
      // Convert base64 to blob for OCR
      let ocrBlob: Blob;
      if (imageBase64.startsWith('data:')) {
        const response = await fetch(imageBase64);
        ocrBlob = await response.blob();
        console.info("[CAPTURE]", { 
          bytes: ocrBlob.size, 
          mime: ocrBlob.type, 
          dims: 'unknown' 
        });
      } else {
        // Handle raw base64
        const byteString = atob(imageBase64);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const int8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          int8Array[i] = byteString.charCodeAt(i);
        }
        ocrBlob = new Blob([arrayBuffer], { type: 'image/jpeg' });
        console.info("[CAPTURE]", { 
          bytes: ocrBlob.size, 
          mime: 'image/jpeg', 
          dims: 'unknown' 
        });
      }
      
      // Call OCR function
      setLoadingMessage('Extracting text...');
      const startTime = Date.now();
      
      const { callOCRFunction } = await import('@/lib/ocrClient');
      const ocrResult = await callOCRFunction(ocrBlob, { withAuth: true });
      
      const durationMs = Date.now() - startTime;
      console.info("[OCR][RESPONSE]", { 
        status: ocrResult.ok ? 200 : 'error', 
        durationMs, 
        words: ocrResult.summary?.words || 0 
      });
      
      if (currentRunId.current !== runId) return; // stale
      
      if (!ocrResult.ok || !ocrResult.summary?.text_joined) {
        toast({
          title: "No readable text found",
          description: "Please try taking a clearer photo or use manual entry.",
          variant: "destructive",
        });
        setCurrentState('scanner'); // Keep modal open
        return;
      }
      
      const text = ocrResult.summary.text_joined;
      
      // Handle low-signal text
      if (text.trim().length < 30) {
        toast({
          title: "No readable ingredients/nutrition text found",
          description: "Please try again with a clearer image or use manual entry.",
          variant: "destructive",
        });
        setCurrentState('scanner'); // Keep modal open
        return;
      }
      
      // Parse through shared free-text parser
      setLoadingMessage('Analyzing nutrition...');
      const { toReportFromOCR } = await import('@/lib/health/adapters/toReportInputFromOCR');
      const healthResult = await toReportFromOCR(text);
      
      if (currentRunId.current !== runId) return; // stale
      
      if (!healthResult.ok) {
        const failedResult = healthResult as { ok: false, reason: string };
        if (failedResult.reason === 'low_confidence') {
          toast({
            title: "Unable to analyze text",
            description: "The extracted text doesn't contain enough nutrition information.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Analysis failed",
            description: "Please try again or use manual entry.",
            variant: "destructive",
          });
        }
        setCurrentState('scanner'); // Keep modal open
        return;
      }
      
      // Run through same analyzer as other flows
      const report = healthResult.report;
      
      // Convert report to analyzer input format
      const analyzerInput = {
        name: report.productName || 'OCR Product',
        ingredientsText: report.ingredientsText,
        nutrition: report.nutritionData
      };
      
      const { analyzeProductForQuality } = await import('@/shared/barcode-analyzer');
      const analyzerResult = await analyzeProductForQuality(analyzerInput);
      
      if (currentRunId.current !== runId) return; // stale
      
      // Log pipeline result
      const words = text.split(/\s+/).length;
      const score = Math.round((report.healthScore || 0) * 10); // Normalize to 0-100
      const flags = report.ingredientFlags?.length || 0;
      
      console.info("[OCR][PIPELINE]", { words, score, flags });
      
      // Transform to HealthAnalysisResult format
      const analysisResult: HealthAnalysisResult = {
        itemName: report.productName || 'OCR Product',
        productName: report.productName || 'OCR Product',
        title: report.productName || 'OCR Product',
        healthScore: (report.healthScore || 0) / 10, // Convert to 0-10 scale for display
        ingredientsText: report.ingredientsText,
        ingredientFlags: report.ingredientFlags || [],
        flags: report.ingredientFlags || [],
        nutritionData: extractNutritionData(report.nutritionData || {}),
        healthProfile: {
          isOrganic: report.ingredientsText?.toLowerCase().includes('organic') || false,
          isGMO: report.ingredientsText?.toLowerCase().includes('gmo') || false,
          allergens: report.ingredientsText ? 
            ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].filter(allergen => 
              report.ingredientsText!.toLowerCase().includes(allergen)
            ) : [],
          preservatives: [],
          additives: []
        },
        personalizedWarnings: [],
        suggestions: (report.ingredientFlags || []).filter((f: any) => f.severity === 'medium').map((f: any) => f.flag || f.description || ''),
        overallRating: report.healthScore == null ? 'avoid' : 
                      report.healthScore >= 8 ? 'excellent' : 
                      report.healthScore >= 6 ? 'good' : 
                      report.healthScore >= 4 ? 'fair' : 
                      report.healthScore >= 2 ? 'poor' : 'avoid'
      };
      
      // Add to recents
      addRecent({
        mode: 'photo',
        label: report.productName || 'OCR Product'
      });
      
      setAnalysisResult(analysisResult);
      setCurrentState('report');
      
      // Update analysis data for ResultCard source badge
      setCurrentAnalysisData({ 
        source: 'photo',
        imageUrl: imageBase64
      });
      
    } catch (error) {
      console.error('[OCR][ERROR]', error);
      if (currentRunId.current !== runId) return; // stale
      
      toast({
        title: "Analysis failed",
        description: "Please try again or use manual entry.",
        variant: "destructive",
      });
      setCurrentState('scanner'); // Keep modal open
    } finally {
      setIsProcessing(false);
      console.groupEnd();
    }
  };

  // Helper to choose v1/v2 pipeline or OCR-only mode
  const runPhotoAnalysis = async (imgB64: string, options?: { ocrOnly?: boolean }) => {
    // OCR-only mode bypass all hybrid/barcode scanners
    if (options?.ocrOnly) {
      await runOcrPipeline(imgB64);
      return;
    }
    
    // Use existing handlers in this file - match existing pattern
    const usePhotoPipelineV2 = typeof import.meta.env.VITE_PHOTO_PIPELINE_V2 !== 'undefined' && 
                               import.meta.env.VITE_PHOTO_PIPELINE_V2 === 'true';
    if (usePhotoPipelineV2) {
      await handleImageCaptureV2(imgB64);
    } else {
      await handleImageCapture(imgB64);
    }
  };

  // Mount probe
  useEffect(() => { console.log('[HC][MOUNT] v1'); }, []);

  // AUTO-KICK when a photo payload is provided from ScanHub
  useEffect(() => {
    if (!isOpen) return;

    // Log CSP when Health Check modal opens (dev helper)
    logActiveCSP('HEALTH_MODAL_OPEN');

    const isPhoto = analysisData?.source === 'photo';
    const img = (analysisData as any)?.imageBase64 as string | undefined;
    if (!isPhoto || !img || img.length < 50) return; // trivial sanity

    // Avoid reprocessing same image if component re-renders
    const key = `${img.length}:${analysisData?.captureTs ?? ''}`;
    if (processedPhotoKeyRef.current === key) return;
    processedPhotoKeyRef.current = key;

    console.log('[HC][PHOTO][AUTO]', { hasImage: true, key });

    // ensure UI shows loading (not scanner)
    setCurrentState('loading');

    // fire analysis
    runPhotoAnalysis(img, { ocrOnly: true }).catch(err => {
      console.error('[HC][PHOTO][AUTO][ERROR]', err);
      // fall back gracefully
      setCurrentState('fallback');
    });
  }, [isOpen, analysisData?.source, (analysisData as any)?.imageBase64, analysisData?.captureTs]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log('[HC][STEP]', initialState, { source: analysisData?.source });
      setCurrentState(initialState);
      setAnalysisResult(null);
      setCandidates([]);
      setMealFoods([]);
      setIsProcessing(false);
      setCaptureId(null);
      setLoadingMessage('');
      setCurrentAnalysisData({ source: 'photo' });
    }
  }, [isOpen, initialState, analysisData]);

  // Handle analysis data from URL params (e.g., from manual entry)
  useEffect(() => {
    if (!isOpen || !analysisData) return;
    
    const { source, barcode, name } = analysisData;
    
    // Guard scanner mount for manual/voice
    if (source === 'manual' || source === 'voice') {
      console.log('[HC][STATE] skip scanner for', source);
      setCurrentState('loading');
      // Continue to manual/voice processing path
    }
    
    // Check URL params for search modal routing
    const urlParams = new URLSearchParams(window.location.search);
    const modal = urlParams.get('modal');
    const urlSource = urlParams.get('source');
    const urlName = urlParams.get('name');
    
    // Voice → Search guard - prevent health analysis flow
    if (modal === 'search' && urlSource === 'voice' && urlName) {
      console.log('[VOICE→SEARCH] initialized', { q: urlName });
      setCurrentState('fallback'); // Use fallback state which shows manual entry
      setLoadingMessage('');
      return; // Don't fall through to any "health/analysis" effects
    }
    
    // Handle manual product analysis directly in modal
    if (source === 'manual' && analysisData.product) {
      console.log('[ANALYZER][REQ]', {
        source: analysisData?.source,
        name: analysisData?.name,
        text: (analysisData as any)?.text,
        hasProduct: !!analysisData?.product
      });
      console.log('[MANUAL→HEALTH] Processing product directly:', analysisData.product);
      
      const runId = crypto.randomUUID();
      currentRunId.current = runId;
      
      console.log('[HC][STEP]', 'loading', { source: 'manual_product_analysis' });
      setCurrentState('loading');
      setLoadingMessage(`Analyzing "${analysisData.productName || name}"...`);
      setAnalysisType('manual');
      setCurrentAnalysisData({ source: 'manual' });
      
      // Convert product to analysis format and process
      setTimeout(async () => {
        try {
          const { handleSearchPick } = await import('@/shared/search-to-analysis');
          await handleSearchPick({
            item: analysisData.product,
            source: 'manual',
            setAnalysisData: (result) => {
              if (currentRunId.current !== runId) return;
              console.log('[ANALYZER][RES]', {
                status: 'success',
                itemName: result?.analysis?.itemName,
                scoreRaw: result?.analysis?.healthScore ?? result?.analysis?.quality?.score,
                scoreUnit: 'expected 0–10',
              });
              processDirectAnalysisResult(result);
            },
            setStep: (step: string) => {
              if (currentRunId.current !== runId) return;
              if (step === 'report') {
                // Result was processed successfully
                return;
              }
              setCurrentState(step as ModalState);
            },
            onError: (error) => {
              if (currentRunId.current !== runId) return;
              console.log('[ANALYZER][RES]', {
                status: 'error',
                error: error?.message,
                scoreUnit: 'failed',
              });
              console.error('[MANUAL→HEALTH] Analysis failed:', error);
              setCurrentState('fallback');
            }
          });
        } catch (error) {
          if (currentRunId.current !== runId) return;
          console.log('[ANALYZER][SKIP][FALLBACK]', { reason: 'processing_failed' });
          console.error('[MANUAL→HEALTH] Processing failed:', error);
          setCurrentState('fallback');
        }
      }, 100);
      return;
    }
    
    // Prevent enhanced-health-scanner calls for search flows (voice/manual selection)
    const isSearchFlow = source === 'voice';
    if (isSearchFlow) {
      console.log(`🚫 Blocking enhanced-health-scanner for search flow: ${source}`);
      return;
    }
    
    // Handle voice-specific routing first
    if (source === 'voice' && name) {
      if (import.meta.env.DEV) console.log('[VOICE→HEALTH] start', { name });
      
      const runId = crypto.randomUUID();
      currentRunId.current = runId;
      
      console.log('[HC][STEP]', 'loading', { source: 'voice_lookup' });
      setCurrentState('loading');
      setLoadingMessage(`Looking up "${name}"...`);
      setAnalysisType('manual');
      setCurrentAnalysisData({ source: 'voice' });
      
      const handleVoiceAnalysis = async () => {
        try {
          // Hard timeout for safety
          const watchdog = setTimeout(() => {
            if (currentRunId.current === runId) {
              console.log('[VOICE→HEALTH] timeout, fallback to manual');
              toManualAdd(name);
            }
          }, 8000);
          
          // Quick name lookup with network guard
          const controller = new AbortController();
          const abortTimer = setTimeout(() => controller.abort(), 6000);
          
          try {
            const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
              body: { 
                mode: 'search',
                query: name,
                source: 'voice-health-scan'
              }
            });
            
            clearTimeout(abortTimer);
            
            if (currentRunId.current !== runId) return; // stale
            
            if (error || !data?.ok) {
              if (import.meta.env.DEV) console.log('[VOICE→HEALTH] lookup failed, fallback to manual', { error });
              toManualAdd(name);
              return;
            }
            
            // Process successful result
            processDirectAnalysisResult({ ...data, source: 'voice', confidence: 0.9 });
            
          } catch (networkError) {
            if (currentRunId.current !== runId) return; // stale
            if (import.meta.env.DEV) console.log('[VOICE→HEALTH] network error, fallback to manual', networkError);
            toManualAdd(name);
          } finally {
            clearTimeout(watchdog);
          }
          
        } catch (error) {
          if (currentRunId.current !== runId) return; // stale
          console.error('[VOICE→HEALTH] analysis failed:', error);
          toManualAdd(name);
        }
      };
      
      const toManualAdd = (productName: string) => {
        if (currentRunId.current !== runId) return; // stale
        if (import.meta.env.DEV) console.log('[VOICE→HEALTH] fallback→manual', productName);
        
        // Navigate to manual entry with prefilled name
        window.history.replaceState(null, '', `/scan?manual=${encodeURIComponent(productName)}`);
        setCurrentState('fallback');
      };
      
      handleVoiceAnalysis();
      return;
    }

    // Handle barcode analysis from URL params
    if (barcode && initialState === 'loading') {
      console.log('🔍 Processing analysis data from URL params:', analysisData);
      
      // Create a run ID to prevent stale results
      const runId = crypto.randomUUID();
      currentRunId.current = runId;
      
      const processAnalysisData = async () => {
        try {
          setIsProcessing(true);
          console.log('[HC][STEP]', 'loading', { source: 'barcode_analysis' });
          setCurrentState('loading');
          setLoadingMessage('Processing product...');
          setAnalysisType('barcode');
          setCurrentAnalysisData({ 
            source: 'barcode', 
            barcode: analysisData.barcode 
          });
          
          // Use the enhanced health scanner with the provided barcode
          const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
            body: { 
              mode: 'barcode', 
              barcode: analysisData.barcode, 
              source: 'health-scan-url' 
            }
          });

          // Check if result is stale
          if (currentRunId.current !== runId) return;

          if (error || !data?.ok) {
            console.log('⚠️ Analysis data barcode lookup failed:', error);
            setCurrentState('not_found');
            return;
          }

          // Use the same processing logic as successful barcode flow
          const legacy = toLegacyFromEdge(data);
          console.log('[HS URL BARCODE] Legacy result:', legacy);
          
          if (legacy.status === 'no_detection') {
            setCurrentState('no_detection');
            return;
          }
          
          if (legacy.status === 'not_found') {
            setCurrentState('not_found'); 
            return;
          }
          
          // Process successful result
          await processAndShowResult(legacy, data, 'url-analysis', 'barcode');
          
        } catch (error) {
          console.error('❌ Analysis data processing failed:', error);
          setCurrentState('fallback');
        } finally {
          setIsProcessing(false);
        }
      };
      
      processAnalysisData();
    }
  }, [isOpen, analysisData, initialState]);

  // Helper to process direct analysis results from manual entry
  const processDirectAnalysisResult = (result: any) => {
    mark('[HS] process_result_start');
    
    if (!result) {
      setCurrentState('fallback');
      return;
    }

    try {
      // Handle both raw and wrapped shapes
      let raw = (result?.analysis ?? result) as any;

      // NEW: unwrap { foods: [...] } if present
      if (raw?.foods) {
        if (Array.isArray(raw.foods) && raw.foods.length > 0) {
          raw = raw.foods[0];
        } else {
          console.warn('[MODAL][FOODS] Empty or invalid foods array');
        }
      }

      // Canonical name enforcement
      const brand = pickBrand(result?.product || {});
      const pickedName = displayNameFor(result?.product || {});
      const rawName = raw.itemName || raw.productName || raw.title || raw.name || '';

      const isGeneric = (analyzerName: string, brand: string) => {
        const a = (analyzerName||'').toLowerCase().trim();
        const b = (brand||'').toLowerCase().trim();
        return !a || a === b || a.length < 4;
      };

      const finalName = isGeneric(rawName, brand) ? pickedName : rawName;

      if (finalName !== rawName) {
        console.log('[REPORT][TITLE_FIX]', { from: rawName, to: finalName, pickedName, brand });
      }

      const itemName = finalName || 'Unknown Product';

      // Score
      const ENABLE_LOCAL_SCORE_FALLBACK = import.meta.env.VITE_LOCAL_SCORE_FALLBACK === 'true';
      
      let score10Value = score10(
        raw?.healthScore ?? raw?.quality?.score ?? raw?.score ?? raw?.rating ?? raw?.overall?.score ?? raw?.grades?.health
      );

      if (ENABLE_LOCAL_SCORE_FALLBACK && (!isFinite(score10Value) || score10Value === 0)) {
        const n = raw?.nutrition ?? raw?.nutritionData ?? raw?.macros ?? {};
        const kcal = num(n.calories ?? n.energy_kcal) ?? 0;
        score10Value = Math.max(0, Math.min(10, 10 - (kcal / 1000) * 10));
      }

      // Nutrition (convert unit strings -> numbers)
      const n = raw?.nutrition ?? raw?.nutritionData ?? raw?.macros ?? {};
      const nutritionData = {
        calories: num(n.calories ?? n.energy_kcal) ?? 0,
        protein:  num(n.protein_g ?? n.protein) ?? 0,
        carbs:    num(n.carbs_g   ?? n.carbs   ?? n.carbohydrates) ?? 0,
        fat:      num(n.fat_g     ?? n.fat) ?? 0,
        sugar:    num(n.sugar_g   ?? n.sugar   ?? n.sugars) ?? 0,
        fiber:    num(n.fiber_g   ?? n.fiber   ?? n.dietary_fiber) ?? 0,
        sodium:   num(n.sodium_mg ?? n.sodium) ?? 0,
      };

      console.log('[REPORT][NUMERIC]', {
        score10: score10Value,
        nutritionPreview: Object.fromEntries(Object.entries(nutritionData).slice(0,6))
      });

      // Ingredients + flags/insights
      const ingredientsText =
        raw?.ingredientsText ??
        raw?.ingredients ??
        result?.product?.ingredientsText ??
        '';

      const flags    = raw?.flags ?? raw?.ingredientFlags ?? [];
      const insights = raw?.insights ?? raw?.suggestions ?? [];

      const ingredientFlags = flags.map((f: any) => ({
        ingredient: f.ingredient || f.key || f.label || 'Ingredient',
        flag: f.flag || f.description || f.label || '',
        severity:
          f.severity === 'high' || f.level === 'danger' ? 'high' :
          f.severity === 'medium' || f.level === 'warning' ? 'medium' :
          'low',
        reason: f.reason,
      }));

      // Optional sanity: if analyzer echoed selection meta, assert it:
      if (result?._meta?.selectionId && result?.__selection?.selectionId) {
        const same = result._meta.selectionId === result.__selection.selectionId;
        if (!same) console.warn('[REPORT][SELECTION_MISMATCH]', { analyzer: result._meta, client: result.__selection });
      }

      // Compose → state
      const normalized: HealthAnalysisResult = {
        itemName,
        productName: itemName,
        title: itemName,
        healthScore: score10Value,
        ingredientsText,
        ingredientFlags,
        nutritionData,
        healthProfile: raw?.healthProfile || {
          isOrganic: raw?.isOrganic,
          isGMO: raw?.isGMO,
          allergens: raw?.allergens || [],
          preservatives: raw?.preservatives || [],
          additives: raw?.additives || []
        },
        personalizedWarnings: raw?.personalizedWarnings || raw?.warnings || [],
        suggestions: insights,
        overallRating: raw?.overallRating || raw?.rating || 'fair'
      };

      if (import.meta.env.VITE_DEBUG_HEALTH === 'true') {
        console.log('[MAPPED][REPORT]', {
          itemName: normalized.itemName,
          healthScore10: normalized.healthScore,
          hasNutrition: Object.values(nutritionData).some(v => Number(v) > 0),
          hasIngredients: !!ingredientsText,
          flagCount: ingredientFlags.length,
        });
      }

      setAnalysisResult(normalized);
      setCurrentState('report');
      // --- end robust mapping ---
      
      // Add to recents
      if (user?.id) {
        addRecent({ 
          mode: 'manual', 
          label: normalized.itemName
        });
      }
      
      // Trigger daily score calculation if user is logged in
      if (user?.id) {
        triggerDailyScoreCalculation(user.id).catch(err => 
          console.warn('Daily score calculation failed:', err)
        );
      }
      
    } catch (error) {
      console.error('Failed to process analysis result:', error);
      setCurrentState('fallback');
    }
  };

  // Photo Pipeline v2 handler
  const handleImageCaptureV2 = async (payload: any) => {
    console.log("🚀 Photo Pipeline v2 - handleImageCapture");
    
    // Generate unique run ID to prevent stale results
    const runId = crypto.randomUUID();
    currentRunId.current = runId;
    
    // Generate unique capture ID for correlation
    const currentCaptureId = crypto.randomUUID().substring(0, 8);
    setCaptureId(currentCaptureId);
    setIsProcessing(true);
    
    try {
      console.log('[HC][STEP]', 'loading', { source: 'photo_analysis_v2' });
      setCurrentState('loading');
      setLoadingMessage('Analyzing image...');
      
      // Extract data from payload
      const imageBase64 = typeof payload === 'string' ? payload : payload.imageBase64;
      const detectedBarcode = typeof payload === 'string' ? 
        payload.match(/&barcode=(\d+)$/)?.[1] || null : 
        payload.detectedBarcode;
      
      setCurrentAnalysisData({ 
        source: detectedBarcode ? 'barcode' : 'photo', 
        barcode: detectedBarcode || undefined,
        imageUrl: imageBase64
      });
      
      // Create Blob URL instead of storing base64 in state (Phase 3)
      const imageBlob = await fetch(`data:image/jpeg;base64,${imageBase64}`).then(r => r.blob());
      const imageObjectUrl = URL.createObjectURL(imageBlob);
      
      // Cleanup function
      const cleanup = () => {
        URL.revokeObjectURL(imageObjectUrl);
      };
      
      await onAnalyzeImage(
        imageBase64,
        detectedBarcode || undefined,
        async (result, sourceMeta) => {
          if (currentRunId.current !== runId) {
            cleanup();
            return; // stale
          }
          
          // Process successful result
          await processAndShowResult(result, result, currentCaptureId, sourceMeta.source === 'photo' ? 'image' : 'barcode');
          cleanup();
        },
        (error) => {
          if (currentRunId.current !== runId) {
            cleanup();
            return; // stale
          }
          
          console.error('❌ Photo Pipeline v2 analysis failed:', error);
          toast({
            title: "Analysis Failed",
            description: error,
            variant: "destructive"
          });
          setCurrentState('fallback');
          cleanup();
        }
      );
      
    } catch (error) {
      if (currentRunId.current !== runId) return; // stale
      
      console.error('❌ Photo Pipeline v2 processing failed:', error);
      setCurrentState('fallback');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageCapture = async (payload: any, options?: { ocrOnly?: boolean }) => {
    console.log("🚀 HealthCheckModal.handleImageCapture called!");
    console.log("📥 Payload received:", payload);
    console.log("👤 User ID:", user?.id || "NO USER");
    console.log("🔍 Options:", options);
    
    // Prevent concurrent analysis calls
    if (isProcessing) {
      console.log("⚠️ Analysis already in progress, ignoring request");
      return;
    }

    // OCR-only mode bypass all hybrid/barcode scanners
    if (options?.ocrOnly) {
      const imageData = typeof payload === 'string' ? payload : payload.imageBase64;
      return runOcrPipeline(imageData);
    }

    // Check for Photo Pipeline v2 feature flag
    const usePhotoPipelineV2 = typeof import.meta.env.VITE_PHOTO_PIPELINE_V2 !== 'undefined' && 
                               import.meta.env.VITE_PHOTO_PIPELINE_V2 === 'true';

    if (usePhotoPipelineV2) {
      return handleImageCaptureV2(payload);
    }
    
    // Generate unique run ID to ignore stale results
    const runId = crypto.randomUUID();
    currentRunId.current = runId;
    
    // Generate unique capture ID for correlation
    const currentCaptureId = crypto.randomUUID().substring(0, 8);
    setCaptureId(currentCaptureId);
    setIsProcessing(true);
    
    try {
      console.log('[HC][STEP]', 'loading', { source: 'photo_analysis_v1' });
      setCurrentState('loading');
      setLoadingMessage('Analyzing image...');
      
      // Extract data from payload (either legacy string format or new object format)
      const imageData = typeof payload === 'string' ? payload : payload.imageBase64;
      const detectedBarcode = typeof payload === 'string' ? 
        payload.match(/&barcode=(\d+)$/)?.[1] || null : 
        payload.detectedBarcode;
      
      setCurrentAnalysisData({ 
        source: detectedBarcode ? 'barcode' : 'photo', 
        barcode: detectedBarcode || undefined,
        imageUrl: typeof payload === 'string' ? payload : payload.imageBase64
      });
      
      if (detectedBarcode) {
        console.log(`📊 Barcode detected in image [${currentCaptureId}]:`, detectedBarcode);
        setAnalysisType('barcode');
        setLoadingMessage('Processing barcode...');
        
        // Remove the barcode part from the image data
        const cleanImageData = imageData.replace(/&barcode=\d+$/, '');
        
        // Use unified barcode pipeline (same as Log flow)
        try {
          console.log(`🔄 Processing barcode [${currentCaptureId}]:`, detectedBarcode);
          console.log('[HS PIPELINE]', 'enhanced-health-scanner (unified)', { mode: 'barcode', barcode: detectedBarcode });
          
          const { data: result, error } = await supabase.functions.invoke('enhanced-health-scanner', {
            body: { mode: 'barcode', barcode: detectedBarcode, source: 'health-scan' }
          });
          
          if (error || !result?.ok) {
            console.log(`⚠️ No results from unified barcode pipeline [${currentCaptureId}], falling back to image analysis`);
            // If barcode lookup fails, continue with regular image analysis
            return handleImageCapture(cleanImageData);
          }
          
          // Use the tolerant adapter to normalize the data (same as Log flow)
          console.log(`[HS BARCODE] Raw result before adapter [${currentCaptureId}]:`, result);
          const legacy = toLegacyFromEdge(result);
          console.log(`[HS BARCODE] Legacy after adapter [${currentCaptureId}]:`, legacy);
          
          // Barcode analysis completed successfully
          
          // Handle different statuses
          if (legacy.status === 'no_detection') {
            console.log(`[HS] No detection from barcode [${currentCaptureId}], showing no detection UI`);
            setCurrentState('no_detection');
            return;
          }
          
          if (legacy.status === 'not_found') {
            console.log(`[HS] Barcode not found [${currentCaptureId}], showing not found UI`);
            setCurrentState('not_found'); 
            return;
          }
          
          // Process barcode result and show report
          await processAndShowResult(legacy, result, currentCaptureId, 'barcode');
          return;
          
        } catch (barcodeError) {
          console.error(`❌ Barcode analysis failed [${currentCaptureId}]:`, barcodeError);
          // Continue with image analysis as fallback
          console.log(`🔄 Falling back to image analysis... [${currentCaptureId}]`);
        }
      }
      
      // If no barcode or barcode processing failed, proceed with image analysis
      setAnalysisType('image');
      
      console.log(`🖼️ About to call enhanced-health-scanner function [${currentCaptureId}]...`);
      
      // Check if enhanced image analyzer is enabled
      if (!isFeatureEnabled('image_analyzer_v1')) {
        console.log('🚫 Enhanced image analyzer disabled, showing fallback for manual entry');
        setCurrentState('fallback');
        return;
      }
      
      // Clean image data if it contains a barcode parameter
      const cleanImageData = typeof imageData === 'string' && detectedBarcode ? 
        imageData.replace(/&barcode=\d+$/, '') : 
        imageData;
        
      // First, try OCR extraction
      let ocrText = '';
      try {
        console.log(`🔍 Attempting OCR extraction [${currentCaptureId}]...`);
        
        // Convert base64 to blob for OCR
        let ocrBlob: Blob;
        if (cleanImageData.startsWith('data:')) {
          const response = await fetch(cleanImageData);
          ocrBlob = await response.blob();
        } else {
          // Handle raw base64
          const byteString = atob(cleanImageData);
          const arrayBuffer = new ArrayBuffer(byteString.length);
          const int8Array = new Uint8Array(arrayBuffer);
          for (let i = 0; i < byteString.length; i++) {
            int8Array[i] = byteString.charCodeAt(i);
          }
          ocrBlob = new Blob([arrayBuffer], { type: 'image/jpeg' });
        }
        
        const { callOCRFunction } = await import('@/lib/ocrClient');
        const ocrResult = await callOCRFunction(ocrBlob, { withAuth: true });
        
        if (ocrResult.ok && ocrResult.summary?.text_joined) {
          ocrText = ocrResult.summary.text_joined;
          console.log(`✅ OCR extracted text [${currentCaptureId}]:`, ocrText.slice(0, 100) + '...');
        } else {
          console.log(`⚠️ OCR returned no text [${currentCaptureId}]`);
        }
      } catch (ocrError) {
        console.log(`⚠️ OCR failed [${currentCaptureId}], continuing with image analysis:`, ocrError);
      }
      
      // If we have meaningful OCR text, try to use it for health analysis
      if (ocrText && ocrText.length > 10) {
        try {
          console.log(`📝 Using OCR text for health analysis [${currentCaptureId}]`);
          setLoadingMessage('Analyzing extracted text...');
          
          const { data: textResult, error: textError } = await supabase.functions.invoke('enhanced-health-scanner', {
            body: { 
              mode: 'search',
              query: ocrText,
              source: 'ocr-health-scan'
            }
          });
          
          if (currentRunId.current !== runId) return; // stale
          
          if (!textError && textResult?.ok) {
            console.log(`✅ OCR-based health analysis successful [${currentCaptureId}]`);
            const legacy = toLegacyFromEdge(textResult);
            await processAndShowResult(legacy, textResult, currentCaptureId, 'image');
            return;
          } else {
            console.log(`⚠️ OCR-based health analysis failed [${currentCaptureId}], falling back to image analysis`);
          }
        } catch (textAnalysisError) {
          console.log(`⚠️ OCR text analysis failed [${currentCaptureId}], falling back to image analysis:`, textAnalysisError);
        }
      }
        
      // Helper to check for brand signal in steps
      const hasBrandSignal = (steps?: any[]): boolean =>
        !!steps?.some(s =>
          (s.stage === 'logo' && s.ok) ||
          (s.stage === 'ocr' && (s.meta?.topTokens ?? []).some((t: string) =>
            /trader|kellogg|nestle|pepsi|coca|quaker|nature|kind|clif|oreo|cheerios/i.test(t)
          )) ||
          (s.stage === 'openai' && s.ok && (s.meta?.confidence ?? 0) >= 0.4)
        );

      // Helper to call analyzer with stale check
      const callAnalyzer = async (analyzerPayload: any) => {
        if (currentRunId.current !== runId) return null; // stale
        
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body: analyzerPayload
        });
        
        if (currentRunId.current !== runId) return null; // stale
        if (error) throw new Error(error.message || 'Failed to analyze image');
        return data;
      };
        
      // Use enhanced scanner with structured results
      const analyzerPayload = {
        imageBase64: cleanImageData,
        mode: 'scan',
        detectedBarcode: detectedBarcode || null,
        provider: 'hybrid',
        debug: true
      };
      
      console.log(`📦 Enhanced scanner payload [${currentCaptureId}]:`, {
        mode: analyzerPayload.mode,
        provider: analyzerPayload.provider,
        dataLength: analyzerPayload.imageBase64?.length || 0,
        hasDetectedBarcode: !!detectedBarcode
      });
      
      // Primary analysis call
      let data = await callAnalyzer(analyzerPayload);
      if (!data) return; // stale
      
      console.debug('[HS RESULT]', { 
        kind: data?.kind, 
        provider: data?.provider_used, 
        steps: data?.steps 
      });

      // One-time provider retry before showing "no detection"
      if (data?.kind === 'none') {
        console.log('[HS] Hybrid returned none, trying single providers...');
        
        // Prefer OpenAI first (it nailed Trader Joe's at 0.99 in probe tests)
        const openaiResult = await callAnalyzer({ ...analyzerPayload, provider: 'openai' });
        if (!openaiResult) return; // stale
        
        console.debug('[HS RETRY OPENAI]', { kind: openaiResult?.kind });
        
        if (openaiResult?.kind === 'branded_candidates' || openaiResult?.kind === 'single_product') {
          data = openaiResult;
        } else {
          // Last-resort: Google-only
          const googleResult = await callAnalyzer({ ...analyzerPayload, provider: 'google' });
          if (!googleResult) return; // stale
          
          console.debug('[HS RETRY GOOGLE]', { kind: googleResult?.kind });
          data = googleResult?.kind !== 'none' ? googleResult : data;
        }
      }

      // Route to brand candidates when there's any brand signal in steps
      if (data?.kind === 'none' && hasBrandSignal(data?.steps)) {
        console.log('[HS] Found brand signal in steps, converting to candidates');
        data = {
          ...data,
          kind: 'branded_candidates',
          candidates: data?.candidates ?? []
        };
      }

      // Use the tolerant adapter to map edge response to legacy fields
      const legacy = toLegacyFromEdge(data);
      
      // Route based on detection kind
      await routeBasedOnKind(data, legacy, cleanImageData, currentCaptureId);
      
    } catch (error) {
      console.error(`💥 Image capture error [${currentCaptureId}]:`, error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze the image. Please try again.",
        variant: "destructive",
      });
      setCurrentState('fallback');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to detect if input is a barcode
  const isBarcode = (input: string): boolean => {
    const cleaned = input.trim().replace(/\s+/g, '');
    // Check if it's all digits and has a reasonable barcode length (8-14 digits)
    return /^\d{8,14}$/.test(cleaned);
  };

  const handleManualEntry = async (query: string, type: 'text' | 'voice') => {
    try {
      const trimmedQuery = query.trim();
      console.log(`📝 Processing ${type} input:`, trimmedQuery);
      
      console.log('[HC][STEP]', 'loading', { source: 'manual_entry' });
      setCurrentState('loading');
      setAnalysisType('manual');
      setCurrentAnalysisData({ 
        source: isBarcode(trimmedQuery) ? 'barcode' : 'manual',
        barcode: isBarcode(trimmedQuery) ? trimmedQuery.replace(/\s+/g, '') : undefined
      });
      
      // Intelligent routing based on input content
      if (isBarcode(trimmedQuery)) {
        console.log('🏷️ Input detected as barcode, routing to enhanced-health-scanner');
        setLoadingMessage('Processing barcode...');
        
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body: { 
            mode: 'barcode', 
            barcode: trimmedQuery.replace(/\s+/g, ''), 
            source: 'health-scan-manual' 
          }
        });

        if (error || !data?.ok) {
          console.log('⚠️ Barcode lookup failed:', error);
          setCurrentState('not_found');
          return;
        }

        // Use the same adapter logic as successful barcode pipeline
        const legacy = toLegacyFromEdge(data);
        console.log('[HS MANUAL BARCODE] Legacy result:', legacy);
        
        // Handle different statuses
        if (legacy.status === 'no_detection') {
          console.log('[HS] Manual barcode: no detection');
          setCurrentState('no_detection');
          return;
        }
        
        if (legacy.status === 'not_found') {
          console.log('[HS] Manual barcode: not found');
          setCurrentState('not_found'); 
          return;
        }
        
        // Process successful barcode result (same logic as barcode capture)
        const itemName = legacy.productName || 'Unknown item';
        
        // PATCH 3: No double-scaling when flagged as 0-10
        const rawLegacyScore = Number(legacy?.healthScore);
        const score10 =
          legacy?.scoreUnit === '0-10'
            ? Math.max(0, Math.min(10, isFinite(rawLegacyScore) ? rawLegacyScore : 0))
            : extractScore(rawLegacyScore) / 10; // legacy normalization for non-barcode paths
        
        if (DEBUG) {
          console.log('[REPORT][SCORE_TRACE]', {
            fromAdapter: legacy.healthScore,
            unit: legacy.scoreUnit,
            final10: score10
          });
        }
        
        const rawFlags = Array.isArray(legacy.healthFlags) ? legacy.healthFlags : [];
        const ingredientFlags = rawFlags.map((f: any) => ({
          ingredient: f.title || f.label || f.key || 'Ingredient',
          flag: f.description || f.label || '',
          severity: (/danger|high/i.test(f.severity) ? 'high' : /warn|med/i.test(f.severity) ? 'medium' : 'low') as 'low' | 'medium' | 'high',
        }));

        const analysisResult: HealthAnalysisResult = {
          itemName,
          productName: itemName,
          title: itemName,
          healthScore: score10 ?? 0,
          ingredientsText: legacy.ingredientsText,
          ingredientFlags,
          nutritionData: extractNutritionData(legacy.nutritionData || {}),
          healthProfile: {
            isOrganic: legacy.ingredientsText?.includes('organic') || false,
            isGMO: legacy.ingredientsText?.toLowerCase().includes('gmo') || false,
            allergens: legacy.ingredientsText ? 
              ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].filter(allergen => 
                legacy.ingredientsText!.toLowerCase().includes(allergen)
              ) : [],
            preservatives: [],
            additives: []
          },
          personalizedWarnings: [],
          suggestions: ingredientFlags.filter(f => f.severity === 'medium').map(f => f.flag),
          overallRating: score10 == null ? 'avoid' : 
                        score10 >= 8 ? 'excellent' : 
                        score10 >= 6 ? 'good' : 
                        score10 >= 4 ? 'fair' : 
                        score10 >= 2 ? 'poor' : 'avoid'
        };

        // Add to recent scans
        addRecent({
          mode: 'barcode',
          label: itemName
        });

        setAnalysisResult(analysisResult);
      setCurrentState('report');
      mark('[HC] process_analysis_end');
      measure('[HC] process_analysis_total', '[HC] process_analysis_start');
        
      } else {
        console.log('📝 Input detected as text/description, routing to GPT analyzer');
        setLoadingMessage(type === 'voice' ? 'Processing voice input...' : 'Analyzing food description...');
        
        const { data, error } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
          body: {
            text: trimmedQuery,
            taskType: 'food_analysis',
            complexity: 'auto'
          }
        });

        if (error) {
          throw new Error(error.message || `Failed to analyze ${type} input`);
        }

        console.log('✅ GPT analyzer response:', data);
        
        if (!data.foods || data.foods.length === 0 || data.total_confidence < 0.3) {
          console.log('⚠️ GPT analysis returned low confidence or no foods');
          setCurrentState('no_detection');
          return;
        }

        // Transform GPT response to Health Analysis format
        const primaryFood = data.foods[0]; // Use the first/primary food item
        const itemName = primaryFood.name || trimmedQuery;
        
        // Convert nutrition to health score (simple heuristic)
        const calories = primaryFood.calories || 0;
        const protein = primaryFood.protein || 0;
        const fiber = primaryFood.fiber || 0;
        const sugar = primaryFood.sugar || 0;
        const sodium = primaryFood.sodium || 0;
        
        // Basic health scoring based on nutrition
        let healthScore = 5; // Start neutral
        if (fiber > 3) healthScore += 1;
        if (protein > 10) healthScore += 1;
        if (sugar > 15) healthScore -= 1;
        if (sodium > 400) healthScore -= 1;
        if (calories > 300) healthScore -= 0.5;
        healthScore = Math.max(1, Math.min(10, healthScore));

        const analysisResult: HealthAnalysisResult = {
          itemName,
          productName: itemName,
          title: itemName,
          healthScore,
          ingredientsText: undefined, // GPT analyzer doesn't provide ingredients
          ingredientFlags: [],
          nutritionData: {
            calories: primaryFood.calories,
            protein: primaryFood.protein,
            carbs: primaryFood.carbs,
            fat: primaryFood.fat,
            fiber: primaryFood.fiber,
            sugar: primaryFood.sugar,
            sodium: primaryFood.sodium,
          },
          healthProfile: {
            isOrganic: false,
            isGMO: false,
            allergens: [],
            preservatives: [],
            additives: []
          },
          personalizedWarnings: [],
          suggestions: data.processing_notes ? [data.processing_notes] : [],
          overallRating: healthScore >= 8 ? 'excellent' : 
                        healthScore >= 6 ? 'good' : 
                        healthScore >= 4 ? 'fair' : 
                        healthScore >= 2 ? 'poor' : 'avoid'
        };

        // Add to recent scans
        addRecent({
          mode: type === 'voice' ? 'voice' : 'manual',
          label: itemName
        });

        setAnalysisResult(analysisResult);
        setCurrentState('report');
      }
      
      // Trigger daily score calculation after health scan completion
      if (user?.id) {
        triggerDailyScoreCalculation(user.id);
      }
      
    } catch (error) {
      console.error(`❌ ${type} analysis failed:`, error);
      
      // Reset loading state immediately
      console.log('[HC][STEP]', 'scanner', { source: 'error_fallback' });
      setCurrentState('scanner');
      
      toast({
        title: "Analysis Failed",
        description: `Unable to process ${type} input. Please try again.`,
        variant: "destructive",
      });
      
      // If it's a voice input, show fallback options
      if (type === 'voice') {
        setTimeout(() => {
          setCurrentState('fallback');
        }, 1000);
      }
    }
  };

  /**
   * Convert LogProduct to legacy HealthAnalysisResult format
   */
  const legacyFromProduct = (product: any, metadata: { source: string }): HealthAnalysisResult => {
    const itemName = product.productName || 'Unknown item';
    const healthScore = product.health?.score ? product.health.score / 10 : 0; // Convert 0-100 to 0-10
    
    const ingredientFlags = (product.health?.flags || []).map((f: any) => ({
      ingredient: f.label || 'Ingredient',
      flag: f.details || f.label || '',
      severity: (f.level === 'danger' ? 'high' : f.level === 'warning' ? 'medium' : 'low') as 'low' | 'medium' | 'high',
    }));

    const nutritionData = {
      calories: product.nutrition?.calories || 0,
      protein: product.nutrition?.protein_g || 0,
      carbs: product.nutrition?.carbs_g || 0,
      fat: product.nutrition?.fat_g || 0,
      fiber: product.nutrition?.fiber_g || 0,
      sugar: product.nutrition?.sugar_g || 0,
      sodium: product.nutrition?.sodium_mg || 0,
    };

    return {
      itemName,
      productName: itemName,
      title: itemName,
      healthScore,
      ingredientsText: product.ingredients?.join(', '),
      ingredientFlags,
      nutritionData,
      healthProfile: {
        isOrganic: product.ingredients?.some((ing: string) => ing.toLowerCase().includes('organic')) || false,
        isGMO: product.ingredients?.some((ing: string) => ing.toLowerCase().includes('gmo')) || false,
        allergens: product.ingredients ? 
          ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].filter(allergen => 
            product.ingredients!.some((ing: string) => ing.toLowerCase().includes(allergen))
          ) : [],
        preservatives: product.ingredients?.filter((ing: string) => 
          ing.toLowerCase().includes('preservative') || 
          ing.toLowerCase().includes('sodium benzoate') ||
          ing.toLowerCase().includes('potassium sorbate')
        ) || [],
        additives: product.ingredients?.filter((ing: string) => 
          ing.toLowerCase().includes('artificial') || 
          ing.toLowerCase().includes('flavor') ||
          ing.toLowerCase().includes('color')
        ) || []
      },
      personalizedWarnings: [],
      suggestions: ingredientFlags.filter(f => f.severity === 'medium').map(f => f.flag),
      overallRating: healthScore >= 8 ? 'excellent' : 
                    healthScore >= 6 ? 'good' : 
                    healthScore >= 4 ? 'fair' : 
                    healthScore >= 2 ? 'poor' : 'avoid'
    };
  };

  /**
   * Route analysis based on detection kind
   */
  const routeBasedOnKind = async (data: any, legacy: any, imageData: string, captureId: string) => {
    const kind = data?.kind || 'none';
    const fallback = data?.fallback === true;
    const hasProduct = !!data?.product;
    const productName = data?.product?.productName || data?.productName || 'Unknown';
    
    console.log(`[HS] Routing DEV log [${captureId}]:`, { kind, fallback, hasProduct, productName });
    
    switch (kind) {
      case 'single_product':
        case 'branded': // Support both naming conventions
          // Use direct product mapping when product is available, bypass toLegacyFromEdge
          if (data.product && !fallback) {
            console.log(`[HS] Single product with direct product data [${captureId}]`);
            const directLegacy = legacyFromProduct(data.product, { source: 'image' });
            
            // Add to recent scans
            addRecent({
              mode: 'photo',
              label: directLegacy.itemName
            });
            
            setAnalysisResult(directLegacy);
            setCurrentState('report');
            
            // Trigger daily score calculation
            if (user?.id) {
              triggerDailyScoreCalculation(user.id);
            }
          } else {
          // Fallback to existing toLegacyFromEdge flow
          console.log(`[HS] Single product using legacy adapter [${captureId}]`);
          await processAndShowResult(legacy, data, captureId, 'image');
        }
        break;
        
      case 'multiple_candidates':
      case 'branded_candidates':
        // Multiple branded products → show candidate picker
        if (isInRollout('photo_meal_ui_v1', user?.id) && data.candidates && data.candidates.length > 1) {
          console.log(`[HS] Found ${data.candidates.length} candidates, showing selection UI [${captureId}]`);
          setCandidates(data.candidates);
          setCurrentState('candidates');
        } else {
          // Fallback to first candidate or no detection
          await handleFallbackFromCandidates(data, legacy, captureId);
        }
        break;
        
      case 'meal':
        // Multi-food meal detected → show meal detection UI  
        if (isInRollout('photo_meal_ui_v1', user?.id) && data.foods && data.foods.length > 0) {
          console.log(`[HS] Meal detected with ${data.foods.length} foods [${captureId}]`);
          setMealFoods(data.foods);
          setCurrentState('meal_detection');
        } else {
          // Fallback to multi-detector
          await handleMealFallback(imageData, captureId);
        }
        break;
        
      case 'none':default:
        // No clear detection → try multi-detector as fallback
        console.log(`[HS] No detection, trying multi-food fallback [${captureId}]`);
        await handleMealFallback(imageData, captureId);
        break;
    }
  };
  
  /**
   * Handle meal detection fallback using multi-detector
   */
  const handleMealFallback = async (imageData: string, captureId: string) => {
    if (!isInRollout('photo_meal_ui_v1', user?.id)) {
      // Feature not enabled, show no detection
      setCurrentState('no_detection');
      return;
    }
    
    try {
      console.log(`[HS] Running multi-food detector fallback [${captureId}]`);
      setLoadingMessage('Detecting individual foods...');
      
      const detectedFoods = await detectFoodsFromAllSources(imageData);
      
      if (detectedFoods && detectedFoods.length > 0) {
        console.log(`[HS] Multi-detector found ${detectedFoods.length} foods [${captureId}]`);
        setMealFoods(detectedFoods);
        setCurrentState('meal_detection');
      } else {
        console.log(`[HS] Multi-detector found no foods [${captureId}]`);
        setCurrentState('no_detection');
      }
    } catch (error) {
      console.error(`[HS] Multi-detector failed [${captureId}]:`, error);
      setCurrentState('no_detection');
    }
  };
  
  /**
   * Handle candidates fallback
   */
  const handleFallbackFromCandidates = async (data: any, legacy: any, captureId: string) => {
    if (data.candidates && data.candidates.length > 0) {
      // Use first candidate as fallback
      console.log(`[HS] Using first candidate as fallback [${captureId}]`);
      await processAndShowResult(legacy, data, captureId, 'image');
    } else {
      console.log(`[HS] No candidates available [${captureId}]`);
      setCurrentState('no_detection');  
    }
  };
  
  /**
   * Process result and show appropriate report
   */
  const processAndShowResult = async (legacy: any, data: any, captureId: string, type: string) => {
    // Handle different statuses
    if (legacy.status === 'no_detection') {
      console.log(`[HS] No detection from ${type} [${captureId}], showing no detection UI`);
      setCurrentState('no_detection');
      return;
    }
    
    if (legacy.status === 'not_found') {
      console.log(`[HS] ${type} not found [${captureId}], showing not found UI`);
      setCurrentState('not_found'); 
      return;
    }
    
    // Robust barcode detection - trust adapter output and skip enrichment entirely
    const isBarcode =
      type === 'barcode' ||
      legacy?._dataSource === 'openfoodfacts/barcode' ||
      !!legacy?.barcode ||
      data?.mode === 'barcode' ||
      !!data?.barcode;

    // Early return for barcode - trust adapter values completely
    if (isBarcode) {
      // --- Pull from adapter (authoritative for barcode) ---
      const name = legacy.productName || legacy.label || 'Unknown item';

      // 1) SCORE: adapter emits healthScore (0–10). Also allow nested health.score.
      const score10 =
        legacy.healthScore ??
        legacy.health?.score ??
        (typeof legacy.health === 'number' ? legacy.health : undefined);

      // 2) FLAGS → UI shape (ingredientFlags). Use adapter flags or healthFlags.
      const rawFlags = Array.isArray(legacy.flags) ? legacy.flags : Array.isArray(legacy.healthFlags) ? legacy.healthFlags : [];
      const ingredientFlags = rawFlags.map((f: any) => ({
        ingredient: f.title || f.label || f.code || f.ingredient || 'Ingredient',
        flag: f.reason || f.description || f.label || f.code || '',
        severity:
          /high|danger/i.test(f.severity) ? 'high' :
          /med|warn/i.test(f.severity)   ? 'medium' : 'low',
      }));

      // 3) NUTRITION: Use adapter's per-100g and per-serving data directly
      const nd100 = legacy.nutritionData || {};
      const perServing =
        legacy.nutritionDataPerServing ??
        legacy.perServing ??
        legacy.nutrition_per_serving ?? null;

      const SHOW_PER_SERVING = import.meta.env.VITE_SHOW_PER_SERVING === 'true';

      // 4) Build final report object with both shapes and aliases
      const report = {
        source: 'barcode',
        title: name,
        image_url: legacy.image_url,
        brands: legacy.brands,

        // score kept exactly as adapter computed
        health: { score: score10, unit: '0-10' },

        // flags panel expects ingredientFlags
        ingredientFlags,

        // nutrition per 100g (canonical + UI aliases) - adapter already has these
        nutritionData: nd100,

        // nutrition per serving for the UI - adapter provides this (gated)
        ...(SHOW_PER_SERVING && { nutritionDataPerServing: perServing }),

        // keep old nesting some components may read
        nutrition: { nutritionData: nd100 },

        // helpful metadata
        serving_size: legacy.serving_size,
        serving_size_g: legacy.serving_size_g,
        _dataSource: legacy._dataSource || 'openfoodfacts/barcode'
      };

      if (import.meta.env.VITE_DEBUG_PERF === 'true') {
        console.info('[REPORT][FINAL][BARCODE]', {
          score10: report.health?.score,
          has_perServing: !!report.nutritionDataPerServing,
          perServing_kcal: report.nutritionDataPerServing?.energyKcal
        });
      }

      // Convert to HealthAnalysisResult format
      const itemName = report.title;
      
      // Add to recent scans 
      addRecent({
        mode: 'barcode',
        label: itemName
      });

      const analysisResult: HealthAnalysisResult = {
        itemName,
        productName: itemName,
        title: itemName,
        healthScore: score10 ?? 0,
        ingredientsText: legacy.ingredientsText,
        ingredientFlags,
        flags: ingredientFlags, // Set both properties so UI can find them
        nutritionData: report.nutritionData,
        // Add per-serving nutrition data for UI display (gated)
        ...(SHOW_PER_SERVING && { nutritionDataPerServing: perServing }),
        serving_size: legacy.serving_size,
        // Provide both nutrition shapes for UI compatibility
        nutrition: { nutritionData: report.nutritionData },
        healthProfile: {
          isOrganic: legacy.ingredientsText?.includes('organic') || false,
          isGMO: legacy.ingredientsText?.toLowerCase().includes('gmo') || false,
          allergens: legacy.ingredientsText ? 
            ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].filter(allergen => 
              legacy.ingredientsText!.toLowerCase().includes(allergen)
            ) : [],
          preservatives: legacy.ingredientsText ? 
            legacy.ingredientsText.split(',').filter(ing => 
              ing.toLowerCase().includes('preservative') || 
              ing.toLowerCase().includes('sodium benzoate') ||
              ing.toLowerCase().includes('potassium sorbate')
            ) : [],
          additives: legacy.ingredientsText ? 
            legacy.ingredientsText.split(',').filter(ing => 
              ing.toLowerCase().includes('artificial') || 
              ing.toLowerCase().includes('flavor') ||
              ing.toLowerCase().includes('color')
            ) : []
        },
        personalizedWarnings: [],
        suggestions: ingredientFlags.filter(f => f.severity === 'medium').map(f => f.flag),
        overallRating: (score10 ?? 0) >= 8 ? 'excellent' : 
                      (score10 ?? 0) >= 6 ? 'good' : 
                      (score10 ?? 0) >= 4 ? 'fair' : 
                      (score10 ?? 0) >= 2 ? 'poor' : 'avoid'
      };

      setAnalysisResult(analysisResult);
      setCurrentState('report');
      
      // Trigger daily score calculation
      if (user?.id) {
        triggerDailyScoreCalculation(user.id);
      }
      return; // IMPORTANT: skip any enrichment below
    }

    // Non-barcode processing continues below...
    // Set name once and mirror to all possible header keys
    const itemName = legacy.productName || 'Unknown item';
    console.log(`[HS ${type.toUpperCase()}] Final itemName [${captureId}]:`, itemName);
    
    // Add to recent scans based on type
    const scanMode = type === 'barcode' ? 'barcode' : 
                    type === 'image' ? 'photo' : 
                    type === 'manual' ? 'manual' : 'photo';
    
    addRecent({
      mode: scanMode,
      label: itemName
    });
    
    console.log('[REPORT][NON_BARCODE]', { scoreUnit: legacy.scoreUnit });
    
    // Non-barcode paths use existing logic
    const finalScore10 = legacy?.scoreUnit === '0-10'
      ? Math.max(0, Math.min(10, Number(legacy.healthScore) || 0))
      : (extractScore(legacy?.healthScore, legacy?.scoreUnit) || 0) / 10;
    
    // Keep existing flag logic for non-barcode paths
    const rawFlags = Array.isArray(legacy.healthFlags) ? legacy.healthFlags
      : Array.isArray((data as any)?.healthFlags) ? (data as any).healthFlags
      : [];
    const ingredientFlags = rawFlags.map((f: any) => ({
      ingredient: f.title || f.label || f.key || 'Ingredient',
      flag: f.description || f.label || '',
      severity: (/danger|high/i.test(f.severity) ? 'high' : /warn|med/i.test(f.severity) ? 'medium' : 'low') as 'low' | 'medium' | 'high',
    }));
    
    console.log('[REPORT][ENRICHED]', { scoreUnit: legacy?.scoreUnit, finalScore10, flagsCount: ingredientFlags.length });
    
    // Extract nutrition data - use existing extraction logic for non-barcode paths
    const nutritionData = extractNutritionData(legacy.nutritionData || legacy.nutrition || {});
    console.log('[REPORT][NUTRITION]', { nutritionData });
    
    const ingredientsText = legacy.ingredientsText;

    // Use the already-processed ingredientFlags for final flags
    const finalFlags = ingredientFlags;
    
    const analysisResult: HealthAnalysisResult = {
      itemName,
      productName: itemName,
      title: itemName,
      healthScore: finalScore10, // Keep as 0-10 scale
      ingredientsText,
      ingredientFlags: finalFlags,
      flags: finalFlags, // Set both properties so UI can find them
      nutritionData: nutritionData || {},
      // Provide both nutrition shapes for UI compatibility
      nutrition: { nutritionData: nutritionData || {} },
      healthProfile: {
        isOrganic: ingredientsText?.includes('organic') || false,
        isGMO: ingredientsText?.toLowerCase().includes('gmo') || false,
        allergens: ingredientsText ? 
          ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].filter(allergen => 
            ingredientsText!.toLowerCase().includes(allergen)
          ) : [],
        preservatives: ingredientsText ? 
          ingredientsText.split(',').filter(ing => 
            ing.toLowerCase().includes('preservative') || 
            ing.toLowerCase().includes('sodium benzoate') ||
            ing.toLowerCase().includes('potassium sorbate')
          ) : [],
        additives: ingredientsText ? 
          ingredientsText.split(',').filter(ing => 
            ing.toLowerCase().includes('artificial') || 
            ing.toLowerCase().includes('flavor') ||
            ing.toLowerCase().includes('color')
          ) : []
      },
      personalizedWarnings: [],
      suggestions: ingredientFlags.filter(f => f.severity === 'medium').map(f => f.flag),
      overallRating: finalScore10 == null ? 'avoid' : 
                    finalScore10 >= 8 ? 'excellent' : 
                    finalScore10 >= 6 ? 'good' : 
                    finalScore10 >= 4 ? 'fair' : 
                    finalScore10 >= 2 ? 'poor' : 'avoid'
    };
    
    setAnalysisResult(analysisResult);
    setCurrentState('report');
    
    // Trigger daily score calculation
    if (user?.id) {
      triggerDailyScoreCalculation(user.id);
    }
  };

  /**
   * Handle meal confirmation from multi-food detection
   */
  const handleMealConfirm = async (selectedFoods: any[]) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to save meals.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('[HC][STEP]', 'loading', { source: 'meal_save' });
      setCurrentState('loading');
      setLoadingMessage('Saving meal...');
      
      const result = await logMealAsSet(selectedFoods, user.id);
      
      if (result.success) {
        toast({
          title: "Meal Saved!",
          description: `Successfully logged ${selectedFoods.length} food items as a meal.`,
        });
        
        // Show meal confirmation state
        setCurrentState('meal_confirm');
        
        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to save meal');
      }
    } catch (error) {
      console.error('❌ Meal confirmation failed:', error);
      toast({
        title: "Error",
        description: "Failed to save meal. Please try again.",
        variant: "destructive",
      });
      setCurrentState('meal_detection');
    }
  };
  
  /**
   * Handle meal cancellation
   */
  const handleMealCancel = () => {
    setCurrentState('fallback');
  };
  
  /**
   * Handle adding food manually from meal detection
   */
  const handleMealAddManually = () => {
    setCurrentState('fallback');
  };

  const handleCandidateSelect = async (candidateId: string) => {
    console.log(`🔍 Fetching details for candidate: ${candidateId}`);
    
    try {
      console.log('[HC][STEP]', 'loading', { source: 'candidate_select' });
      setCurrentState('loading');
      setLoadingMessage('Fetching product details...');
      
      // Fetch detailed product information using barcode mode
      const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { mode: 'barcode', barcode: candidateId, source: 'candidate-selection' }
      });
      
      if (error || !data?.ok) {
        throw new Error('Failed to fetch candidate details');
      }
      
      // Use the same processing logic as the main flow
      const legacy = toLegacyFromEdge(data);
      
      if (legacy.status === 'no_detection' || legacy.status === 'not_found') {
        setCurrentState('fallback');
        return;
      }
      
      // Process the result same as barcode flow
      const itemName = legacy.productName || 'Unknown item';
      
      // PATCH 3: No double-scaling when flagged as 0-10
      const rawLegacyScore = Number(legacy?.healthScore);
      const score10 =
        legacy?.scoreUnit === '0-10'
          ? Math.max(0, Math.min(10, isFinite(rawLegacyScore) ? rawLegacyScore : 0))
          : extractScore(rawLegacyScore) / 10; // legacy normalization for non-barcode paths
      
      const rawFlags = Array.isArray(legacy.healthFlags) ? legacy.healthFlags : [];
      const ingredientFlags = rawFlags.map((f: any) => ({
        ingredient: f.title || f.label || f.key || 'Ingredient',
        flag: f.description || f.label || '',
        severity: (/danger|high/i.test(f.severity) ? 'high' : /warn|med/i.test(f.severity) ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      }));
      
      const ingredientsText = legacy.ingredientsText;
      const nutritionData = legacy.nutritionData || {};
      
        const analysisResult: HealthAnalysisResult = {
          itemName,
          productName: itemName,
          title: itemName,
          healthScore: score10 ?? 0,
          ingredientsText,
          ingredientFlags,
          nutritionData: extractNutritionData(legacy.nutritionData || {}),
          healthProfile: {
            isOrganic: ingredientsText?.includes('organic') || false,
            isGMO: ingredientsText?.toLowerCase().includes('gmo') || false,
            allergens: ingredientsText ? 
              ['milk', 'eggs', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy'].filter(allergen => 
                ingredientsText!.toLowerCase().includes(allergen)
              ) : [],
            preservatives: ingredientsText ? 
              ingredientsText.split(',').filter(ing => 
                ing.toLowerCase().includes('preservative') || 
                ing.toLowerCase().includes('sodium benzoate') ||
                ing.toLowerCase().includes('potassium sorbate')
              ) : [],
            additives: ingredientsText ? 
              ingredientsText.split(',').filter(ing => 
                ing.toLowerCase().includes('artificial') || 
                ing.toLowerCase().includes('flavor') ||
                ing.toLowerCase().includes('color')
              ) : []
          },
          personalizedWarnings: [],
          suggestions: ingredientFlags.filter(f => f.severity === 'medium').map(f => f.flag),
          overallRating: score10 == null ? 'avoid' : 
                        score10 >= 8 ? 'excellent' : 
                        score10 >= 6 ? 'good' : 
                        score10 >= 4 ? 'fair' : 
                        score10 >= 2 ? 'poor' : 'avoid'
        };
        
        // Add to recent scans 
        addRecent({
          mode: 'barcode',
          label: itemName
        });
        
        setAnalysisResult(analysisResult);
        setCurrentState('report');
      
      // Trigger daily score calculation
      if (user?.id) {
        triggerDailyScoreCalculation(user.id);
      }
      
    } catch (candidateError) {
      console.error('❌ Candidate selection failed:', candidateError);
      toast({
        title: "Error",
        description: "Failed to fetch product details. Please try again.",
        variant: "destructive",
      });
      setCurrentState('fallback');
    }
  };

  const handleCandidateManualEntry = () => {
    setCurrentState('fallback');
  };

  const handleScanAnother = () => {
    console.log('[HC][STEP]', 'scanner', { source: 'scan_another' });
    setCurrentState('scanner');
    setAnalysisResult(null);
  };

  const handleClose = () => {
    console.log('[HEALTH_MODAL] Close called - navigating back to original entry');
    console.log('[HC][STEP]', 'scanner', { source: 'modal_close' });
    setCurrentState('scanner');
    setAnalysisResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`max-w-full max-h-full w-full h-full p-0 border-0 pointer-events-auto ${
          currentState === 'report' ? 'bg-background overflow-auto' : 'bg-black overflow-hidden'
        }`}
        showCloseButton={false}
      >
        <div className="relative w-full h-full">
          {/* Main Content */}
          {currentState === 'scanner' && analysisData?.source !== 'manual' && analysisData?.source !== 'voice' && (
            FF.PIPELINE_ISOLATION && FF.BARCODE_ISOLATED ? (
              <PipelineRouter mode="barcode">
                <BarcodeScannerShim 
        onCapture={(blob) => handleImageCapture(blob, { ocrOnly: true })}
                  onManualEntry={() => setCurrentState('fallback')}
                  onManualSearch={handleManualEntry}
                  onCancel={handleClose}
                />
              </PipelineRouter>
            ) : (
              <HealthScannerInterface 
                onCapture={(blob) => handleImageCapture(blob, { ocrOnly: true })}
                onManualEntry={() => setCurrentState('fallback')}
                onManualSearch={handleManualEntry}
                onCancel={handleClose}
              />
            )
          )}

          {currentState === 'loading' && (
            <HealthAnalysisLoading 
              message={loadingMessage || (analysisData?.source === 'voice' ? `Looking up "${analysisData.name}"...` : 'Analyzing...')}
              analysisType={analysisType}
            />
          )}

          {currentState === 'report' && analysisResult && (
            <HealthReportPopup
              result={analysisResult}
              onScanAnother={handleScanAnother}
              onClose={handleClose}
              analysisData={currentAnalysisData}
            />
          )}

          {currentState === 'meal_detection' && isInRollout('photo_meal_ui_v1', user?.id) && (
            <MultiAIFoodDetection
              detectedFoods={mealFoods}
              isLoading={false}
              onConfirm={handleMealConfirm}
              onCancel={handleMealCancel}
              onAddManually={handleMealAddManually}
              onAddToResults={() => {}} // Not used in health check context
            />
          )}

          {currentState === 'meal_confirm' && (
            <div className="w-full min-h-screen bg-background flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <div className="text-6xl mb-6">✅</div>
                <h2 className="text-2xl font-bold text-foreground">Meal Saved Successfully!</h2>
                <p className="text-foreground/70">Your food items have been logged as a complete meal.</p>
                <div className="pt-4">
                  <Button onClick={onClose} className="px-8">
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentState === 'candidates' && isInRollout('photo_meal_ui_v1', user?.id) && (
            <BrandedCandidatesList
              candidates={candidates}
              onSelectCandidate={handleCandidateSelect}
              onManualEntry={handleCandidateManualEntry}
            />
          )}

          {(currentState === 'no_detection' || currentState === 'not_found') && (
            <NoDetectionFallback
              status={currentState}
              onRetryCamera={() => {
                console.log('[HC][NAV]', 'Navigating to barcode scan', { source: 'retry_camera' });
                handleClose();
                navigate('/scan');
              }}
              onRetryPhoto={() => {
                console.log('[HC][NAV]', 'Navigating to photo mode', { source: 'retry_photo' });
                handleClose();
                navigate('/scan', { state: { openPhotoModal: true } });
              }}
              onManualEntry={() => {
                console.log('[HC][NAV]', 'Navigating to manual entry', { source: 'manual_entry' });
                handleClose();
                navigate('/scan', { state: { openManualEntry: true } });
              }}
              onVoiceEntry={() => {
                console.log('[HC][NAV]', 'Navigating to voice entry', { source: 'voice_entry' });
                handleClose();
                navigate('/scan?modal=voice');
              }}
              onBack={handleClose}
            />
          )}

          {currentState === 'fallback' && (
            <ImprovedManualEntry
              onProductSelected={async (product) => {
                await handleSearchPick({
                  item: product,
                  source: 'manual',
                  setAnalysisData: (data) => { processDirectAnalysisResult(data); }, // flattened data
                  setStep: (step) => {
                    if (step === 'loading') setCurrentState('loading');
                    else if (step === 'fallback') setCurrentState('fallback');
                    // 'report' is driven by processDirectAnalysisResult
                  },
                  onError: (err) => { console.error('[FALLBACK] Analysis failed:', err); setCurrentState('fallback'); }
                });
              }}
              onBack={() => {
                console.log('[HC][STEP]', 'scanner', { source: 'manual_entry_back' });
                setCurrentState('scanner');
              }}
              setAnalysisData={setAnalysisResult}
              setStep={(step) => setCurrentState(step as ModalState)}
            />
          )}
          
          {/* Dev-only OCR status footer */}
          {import.meta.env.DEV && (
            <div style={{ 
              position: 'absolute', 
              bottom: 8, 
              right: 8, 
              fontSize: 10, 
              color: '#666', 
              background: 'rgba(0,0,0,0.1)', 
              padding: '2px 6px', 
              borderRadius: 4,
              fontFamily: 'monospace'
            }}>
              last OCR: -ms · status: ready
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
