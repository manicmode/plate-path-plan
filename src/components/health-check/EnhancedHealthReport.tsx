/**
 * Enhanced Health Report with Nutrition Toggle, Functional Tabs, and Personalized Suggestions
 * Replaces the existing HealthReportPopup with new features
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Save,
  Flag,
  RotateCcw,
  Star,
  ShieldCheck,
  Zap,
  X,
  Loader2,
  Plus,
  Settings
} from 'lucide-react';
import type { HealthAnalysisResult } from './HealthCheckModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { NutritionToggle } from './NutritionToggle';
import { FlagsTab } from './FlagsTab';
import { PersonalizedSuggestions } from './PersonalizedSuggestions';
import { detectPortionSafe, scalePer100ForDisplay } from '@/lib/nutrition/portionDetectionSafe';
import { supabase } from '@/integrations/supabase/client';
import { toNutritionLogRow } from '@/adapters/nutritionLogs';
import { mark, trace, logInfo, logWarn, logError } from '@/lib/util/log';
import { buildLogPrefill } from '@/lib/health/logPrefill';
import { httpOnly } from '@/lib/health/toLegacyFromEdge';

// Brand-only title sanitization helper
function sanitizeTitle(title: string, brand?: string): string {
  const brandOnly = [/^trader joe'?s?$/i, /^kirkland$/i, /^great value$/i, /^365$/i];
  const t = (title || '').trim();
  return brandOnly.some(p => p.test(t)) ? 'Food item' : t;
}

// --- Per-portion helpers (no fake scaling) ---
const round0 = (n: number) => Math.round(n);
const round1 = (n: number) => Math.round(n * 10) / 10;

type Per100 = {
  calories?: number;
  carbs?: number;
  fat?: number;
  protein?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
};

function computePerPortion(per100: Per100, grams: number | null) {
  if (grams == null || grams <= 0) return null; // unknown -> no scaling
  const f = grams / 100;
  return {
    calories: per100.calories != null ? round0(per100.calories * f) : null,
    carbs:    per100.carbs    != null ? round1(per100.carbs    * f) : null,
    fat:      per100.fat      != null ? round1(per100.fat      * f) : null,
    protein:  per100.protein  != null ? round1(per100.protein  * f) : null,
    fiber:    per100.fiber    != null ? round1(per100.fiber    * f) : null,
    sugar:    per100.sugar    != null ? round1(per100.sugar    * f) : null,
    sodium:   per100.sodium   != null ? Math.round(per100.sodium * f) : null,
    factor: f
  };
}

function scaleFromPer100(per100: any, grams?: number | null) {
  if (!per100 || !grams || grams <= 0) return null;
  const f = grams / 100;
  return {
    calories: per100.kcal ? Math.round(per100.kcal * f) : undefined,
    fat: per100.fat ? +(per100.fat * f).toFixed(1) : undefined,
    sat_fat: per100.sat_fat ? +(per100.sat_fat * f).toFixed(1) : undefined,
    carbs: per100.carbs ? +(per100.carbs * f).toFixed(1) : undefined,
    sugar: per100.sugar ? +(per100.sugar * f).toFixed(1) : undefined,
    fiber: per100.fiber ? +(per100.fiber * f).toFixed(1) : undefined,
    protein: per100.protein ? +(per100.protein * f).toFixed(1) : undefined,
    sodium: per100.sodium ? Math.round(per100.sodium * f) : undefined,
  };
}

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';
const CONFIRM_FIX_REV = "2025-08-31T13:36Z-r7";

// Save CTA Component with sticky positioning
const SaveCTA: React.FC<{
  result: HealthAnalysisResult;
  analysisData?: { source?: string; barcode?: string; imageUrl?: string };
  portionGrams?: number;
  ocrHash?: string;
  onSaved?: (logId: string) => void;
}> = ({ result, analysisData, portionGrams, ocrHash, onSaved }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [savedLogId, setSavedLogId] = useState<string | null>(null);

  const handleSaveReport = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save health scan results.",
        variant: "destructive"
      });
      return;
    }

    if (isSaving || savedLogId) return;

    try {
      setIsSaving(true);
      
        console.info('[REPORT][V2][CTA_SAVE]', { 
          source: analysisData?.source, 
          score: result?.healthScore 
        });

      // Create enhanced report snapshot with portion info
      const reportSnapshot = {
        ...result,
        portionGrams: portionGrams || 30,
        portionMode: portionGrams ? 'custom' : 'per100g',
        ocrHash,
        savedAt: new Date().toISOString()
      };

      // Map analysis data to nutrition log format
      const scanData = {
        ...result,
        imageUrl: analysisData?.imageUrl,
        barcode: analysisData?.barcode,
      };

      const source = analysisData?.source === 'barcode' ? 'barcode' : 
                     analysisData?.source === 'manual' ? 'manual' : 'photo';

      const sourceMeta = {
        source,
        barcode: analysisData?.barcode ?? null,
        imageUrl: analysisData?.imageUrl ?? null,
        productName: result.itemName ?? result.productName ?? null,
        portionGrams: portionGrams ?? null,
        ocrHash: ocrHash ?? null,
      };

      const payload = {
        ...toNutritionLogRow(scanData, source),
        report_snapshot: reportSnapshot,
        snapshot_version: 'v2', // Enhanced with portion info
        source_meta: sourceMeta,
      };
      
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert(payload as any)
        .select('id')
        .single();

      if (error) throw error;

      const logId = data.id;
      setSavedLogId(logId);
      onSaved?.(logId);

      toast({
        title: "Saved Successfully! 💾",
        description: `${result.itemName} has been saved to your nutrition logs.`,
      });
    } catch (error: any) {
      console.error('❌ Save failed:', error);
      toast({
        title: "Save Failed",
        description: error?.message ?? 'Unable to save health report. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (savedLogId) {
    return (
      <div className="px-4">
        <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl text-center shadow-lg">
          <div className="flex items-center justify-center space-x-2 text-primary font-semibold">
            <CheckCircle className="w-5 h-5" />
            <span>Report saved successfully!</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <Button
        onClick={handleSaveReport}
        disabled={isSaving || !user?.id}
        className="w-full rounded-2xl py-5 font-semibold shadow-lg text-lg
                   bg-teal-500 hover:bg-teal-400 active:bg-teal-600
                   text-slate-900 transition-colors disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Saving report...
          </>
        ) : (
          <>
            <Save className="w-5 h-5 mr-2" />
            Save this report
          </>
        )}
      </Button>
    </div>
  );
};

// Memoized Circular Progress Component with Animation
const CircularProgress = React.memo<{ 
  percentage: number; 
  size?: number; 
  strokeWidth?: number;
}>(({ percentage, size = 120, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Color based on percentage ranges
  const getColor = (pct: number) => {
    if (pct >= 80) return '#10B981'; // Green
    if (pct >= 40) return '#F59E0B'; // Yellow  
    return '#EF4444'; // Red
  };

  const color = getColor(percentage);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-border"
        />
        {/* Progress circle with animation */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out animate-pulse"
          style={{
            filter: `drop-shadow(0 0 8px ${color}60)`
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{percentage}%</span>
      </div>
    </div>
  );
});

interface EnhancedHealthReportProps {
  result: HealthAnalysisResult;
  onScanAnother: () => void;
  onClose: () => void;
  analysisData?: {
    source?: string;
    barcode?: string;
    imageUrl?: string;
    nutritionPanelText?: string;
    nutritionOCRText?: string;
    ocr?: {
      nutrition?: { text?: string };
      textBlocks?: { nutrition?: { raw?: string } };
      rawNutritionText?: string;
    };
    serving_size_g?: number;
  };
  initialIsSaved?: boolean;
  hideCloseButton?: boolean;
}

export const EnhancedHealthReport: React.FC<EnhancedHealthReportProps> = ({
  result,
  onScanAnother,
  onClose,
  analysisData,
  initialIsSaved = false,
  hideCloseButton = false
}) => {
  const navigate = useNavigate();
  // PORTION INQUIRY - Route & Product Identification
  useEffect(() => {
    console.info('[PORTION][INQ3][ROUTE]', { route: window.location?.pathname, hash: window.location?.hash });
    console.info('[PORTION][INQ3][PRODUCT]', { id: (result as any)?.id, barcode: (result as any)?.barcode, name: result?.itemName });
  }, [result]);

  mark('EnhancedHealthReport.render.start');
  const { toast } = useToast();
  const { user } = useAuth();

  // Add safety guards for all potentially undefined properties
  const nutritionData = result?.nutritionData || {};
  const flags = Array.isArray(result?.flags) ? result.flags : Array.isArray(result?.ingredientFlags) ? result.ingredientFlags : [];
  const ingredientsText = result?.ingredientsText || '';
  const healthScore = typeof result?.healthScore === 'number' ? result.healthScore : 0;

  // Portion detection with zero spillover
  const [portion, setPortion] = useState<{ grams: number | null; source: string; label: string; requiresConfirmation?: boolean } | null>(null);

  // Feature gate diagnostics
  useEffect(() => {
    trace('PORTION:CHECK:GATES', {
      portion_detection_enabled: (window as any).__flags?.portion_detection_enabled,
      portionOffQP: new URLSearchParams(window.location.search).has('portionOff'),
      emergencyKill: !!(window as any).__emergencyPortionsDisabled,
      location: window.location.search
    });
  }, []);

  // per100 must remain the raw per-100g values coming from nutritionData
  const per100 = {
    calories: nutritionData?.calories ?? null,
    carbs:    nutritionData?.carbs    ?? null,
    fat:      nutritionData?.fat      ?? null,
    protein:  nutritionData?.protein  ?? null,
    fiber:    nutritionData?.fiber    ?? null,
    sugar:    nutritionData?.sugar    ?? null,
    sodium:   nutritionData?.sodium   ?? null,
  };

  const grams = portion?.grams ?? (result as any)?.servingSizeGrams ?? (result as any)?.serving_size_g ?? (analysisData as any)?.serving_size_g ?? null;

  // Header serving candidate for display
  const headerServingG =
    (result as any)?.serving_size_g ??
    (result as any)?.nutrition?.serving_size_g ?? null;

  const perServingDisplay =
    (result?.nutritionData as any)?.perServing
      ?? (grams ? scaleFromPer100(nutritionData, grams) : null);

  const portionGrams = grams;
  const perPortion = computePerPortion(per100, portionGrams);

  // Header chips:
  const portionLabel =
    grams ? `${grams}g` : 'Unknown serving';

  console.log('[PORTION][UI]', {
    portionGrams, canScale: !!perPortion, 
    factor: perPortion?.factor ?? null,
    per100_cal: per100.calories, render_cal: perPortion?.calories ?? null
  });

  console.log('[ADAPTER][BARCODE.OUT][SERVING_KEYS]', {
    serving_size_gram: (result as any)?.nutrition?.serving_size_gram ?? null,
    serving_size_g: (result as any)?.nutrition?.serving_size_g ?? null,
    serving_g: (result as any)?.nutrition?.serving_g ?? null,
    perServing_kcal: (result as any)?.nutrition?.perServing_kcal ?? null,
  });

  // Generate stable fingerprint for effect dependency
  const productFingerprint = useMemo(() => {
    return (result as any)?.id || 
           (result as any)?.barcode || 
           result?.itemName || 
           JSON.stringify(result?.nutritionData || {}).substring(0, 50);
  }, [(result as any)?.id, (result as any)?.barcode, result?.itemName, result?.nutritionData]);

  // Async portion detection (no side effects, local state only)
  useEffect(() => {
    let alive = true;
    
    mark('EnhancedHealthReport.portionEffect.start', { productFingerprint });
    trace('PORTION:EFFECT:START', { 
      productFingerprint, 
      hasResult: !!result,
      hasIngredientsText: !!ingredientsText
    });
    
    // For photo items, use the servingSizeGrams directly from the analysis result
    const directServingGrams = (result as any)?.servingSizeGrams;
    if (typeof directServingGrams === 'number' && directServingGrams > 0) {
      console.log('[PORTION][PHOTO_ITEM] Using direct serving grams:', directServingGrams);
      setPortion({
        grams: directServingGrams,
        source: 'photo_analysis',
        label: `${directServingGrams}g`,
        requiresConfirmation: false
      });
      return;
    }
    
    // Start with no portion - let resolver determine
    setPortion({ grams: null, source: 'unknown', label: 'Unknown serving' });
    
    const runDetection = async () => {
      try {
        const route = window.location.pathname;
        const productId = (result as any)?.id || (result as any)?.barcode || result?.itemName;
        
        mark('EnhancedHealthReport.portionResolve.start');
        trace('PORTION:EFFECT:RESOLVING', {
          result: !!result,
          ocrText: ingredientsText ? 'present' : 'none',
          entry: 'enhanced_report'
        });
        console.log('[PORTION][OCR_SRC]', {
          fromResult: !!(result as any)?.nutritionOCRText,
          fromAnalysisNutrition: !!analysisData?.nutritionOCRText,
        });
        
        const nfOCR =
          analysisData?.nutritionOCRText ??
          (result as any)?.nutritionOCRText ??
          undefined; // no other fallback
        
        console.log('[PORTION][TRACE][REPORT_OCR]', { length: nfOCR?.length || 0 });
        
        console.log('[PORTION][TRACE][REPORT_INPUT_KEYS]', Object.keys(result || {}));
        console.log('[PORTION][INQ][RESOLVE] start', { productId, route });
        console.info('[PORTION][INQ3][RESOLVE_START]', { barcode: (result as any)?.barcode, id: (result as any)?.id });
        
        const { resolvePortion } = await import('@/lib/nutrition/portionResolver');
        const portionResult = await resolvePortion(result, nfOCR);
        
        mark('EnhancedHealthReport.portionResolve.complete', { resolved: !!portionResult });
        trace('PORTION:EFFECT:RESOLVED', portionResult);
        console.log('[PORTION][INQ][RESOLVE] done', { 
          chosen: { source: portionResult.source, grams: portionResult.grams },
          candidates: portionResult.candidates.map(c => ({ 
            source: c.source, 
            grams: c.grams, 
            confidence: c.confidence,
            penalties: c.details || 'none'
          })),
          route 
        });
        
        if (!alive) {
          trace('PORTION:EFFECT:CANCELLED', { reason: 'component_unmounted' });
          return; // Component unmounted
        }
        
        // Only update local state - no shared state mutation
        setPortion({
          grams: portionResult.grams,
          source: portionResult.source,
          label: portionResult.label,
          requiresConfirmation: portionResult.requiresConfirmation
        });
        
        // Add structured trace logging after portion resolution
        console.log('[PORTION][TRACE]', {
          upc: analysisData?.barcode,
          productName: result.itemName || result.productName,
          hasPerServingFromDB: Boolean((result as any)?.nutrition?.perServing_kcal || (result as any)?.nutrition?.serving_size_gram || (result as any)?.nutrition?.serving_size_g || (result as any)?.nutrition?.serving_g),
          ocrAttempted: Boolean((portionResult as any)?.debug?.ocrAttempted),
          ocrFoundGrams: (portionResult as any)?.debug?.ocrGrams ?? null,
          finalServingGrams: portionResult.grams ?? null,
          source: portionResult.source,
        });
        
        trace('PORTION:EFFECT:SET_STATE', {
          grams: portionResult.grams,
          source: portionResult.source,
          label: portionResult.label
        });
      } catch (error) {
        logWarn('REPORT:PORTION:FAILED', { error: String(error) });
        // Keep the fallback portion
      }
    };
    
    runDetection();
    
    return () => { 
      alive = false; 
      trace('PORTION:EFFECT:CLEANUP', { productFingerprint });
    };
  }, [productFingerprint, ingredientsText]);

  // Generate OCR hash for caching with safety
  const ocrHash = useMemo(() => {
    try {
      const text = ingredientsText || analysisData?.imageUrl || '';
      return text.length > 0 ? btoa(text.slice(0, 100)).slice(0, 8) : undefined;
    } catch (error) {
      console.warn('Failed to generate OCR hash:', error);
      return undefined;
    }
  }, [ingredientsText, analysisData?.imageUrl]);

  // Memoize health percentage with safety
  const healthPercentage = useMemo(() => {
    const rawScore = Number(healthScore) || 0;
    
    // Detect if score is on 0-100 scale (Photo Flow V2) or 0-10 scale (legacy)
    // Photo Flow V2 scores are typically > 10, legacy scores are <= 10
    const isV2Score = rawScore > 10 || (rawScore <= 10 && analysisData?.source === 'photo_flow_v2');
    
    if (isV2Score) {
      // Score is already on 0-100 scale
      return Math.max(0, Math.min(100, Math.round(rawScore)));
    } else {
      // Legacy 0-10 scale, convert to percentage
      const score10 = Math.max(0, Math.min(10, rawScore));
      return Math.round(score10 * 10);
    }
  }, [healthScore, analysisData?.source]);

  // Helper functions for score-based ratings
  const getScoreLabel = (score: number) => {
    // Convert to 0-10 scale for consistent thresholds
    const normalizedScore = score > 10 ? score / 10 : score;
    
    if (normalizedScore >= 8) return { label: 'Healthy', icon: '✅', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/30' };
    if (normalizedScore >= 4) return { label: 'Caution', icon: '⚠️', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' };
    return { label: 'Avoid', icon: '❌', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/30' };
  };

  const getScoreMessage = (score: number) => {
    // Convert to 0-10 scale for consistent thresholds
    const normalizedScore = score > 10 ? score / 10 : score;
    
    if (normalizedScore >= 8) return 'Looking good! Healthy choice.';
    if (normalizedScore >= 4) return 'Some concerns to keep in mind.';
    return 'We recommend avoiding this product.';
  };

  const getStarRating = (score: number) => {
    // Normalize score to 0-10 range first, then convert to 0-5 stars
    const score10 = Math.max(0, Math.min(10, Number(score) || 0));
    return Math.round(score10 / 2); // 0..5 stars
  };

  const scoreLabel = getScoreLabel(healthScore);
  const starCount = getStarRating(healthScore);

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* 🧬 Health Report Title */}
        <div className="relative text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center">
            <span className="text-4xl mr-3">🧬</span>
            Health Report
          </h1>
          {/* Close button */}
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-foreground hover:text-primary" />
            </button>
          )}
        </div>
        
        {/* 🔬 1. TOP SECTION — Summary Card */}
        <Card className={`${scoreLabel.bgColor} border-2 backdrop-blur-sm transition-all duration-300 shadow-xl`}>
          <CardContent className="p-8 text-center">
            {/* Product Name */}
            <h1 className="text-2xl font-bold text-foreground mb-6">{result?.itemName || 'Unknown Product'}</h1>
            
            {/* Health Score Circular Progress */}
            <div className="mb-4">
              <CircularProgress percentage={healthPercentage} size={140} strokeWidth={10} />
            </div>
            <div className="text-sm text-foreground font-medium mb-6">Health Score</div>
            
            {/* Star Rating */}
            <div className="flex justify-center space-x-1 mb-6">
              {[...Array(5)].map((_, i) => (
                  <Star 
                  key={i} 
                  className={`w-7 h-7 transition-all duration-200 ${
                    i < starCount 
                      ? 'text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400 drop-shadow-lg' 
                      : 'text-foreground/40'
                  }`} 
                />
              ))}
            </div>
            
            {/* Large Status Label */}
            <div className={`inline-flex items-center space-x-3 px-8 py-4 rounded-2xl ${scoreLabel.bgColor} border-2 mb-6 shadow-lg transition-all duration-1000 ease-out animate-pulse`}>
              <span className="text-3xl">{scoreLabel.icon}</span>
              <span className={`text-2xl font-bold ${scoreLabel.color}`}>{scoreLabel.label}</span>
            </div>
            
            {/* Friendly Message */}
            <p className={`text-lg ${scoreLabel.color} font-medium leading-relaxed`}>
              {getScoreMessage(healthScore)}
            </p>
            
            {/* Meta chips removed per requirements */}
            {import.meta.env.VITE_DEBUG_CONFIRM === 'true' && (() => {
              console.log('[HEALTH_CARD][META_CHIPS]', { rendered: false });
              return null;
            })()}
          </CardContent>
        </Card>

        {/* 📊 2. TABBED CONTENT AREA */}
        <Tabs defaultValue={flags.length > 0 ? "flags" : "nutrition"} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="flags">
              Flags
              {flags.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {flags.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            
            {/* Add cog-only tab for photo items portion editing */}
            {analysisData?.source === 'photo_item' && portion?.grams && (
              <TabsTrigger 
                value="nutrition"
                className="flex items-center justify-center p-2"
                aria-label="Edit portion size"
              >
                <Settings className="w-4 h-4" />
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="nutrition" className="mt-6">
            <NutritionToggle
              nutrition100g={nutritionData}
              productData={result}
              ocrText={ingredientsText}
              servingGrams={typeof portion?.grams === 'number' ? portion.grams : 
                          typeof headerServingG === 'number' ? headerServingG : undefined}
              portionLabel={typeof portion?.grams === 'number' ? `${portion.grams}g` : 'Unknown serving'}
              renderIconOnly={analysisData?.source === 'photo_item'}
            />
            {/* PORTION INQUIRY - Call Site Logging */}
            {(() => {
              console.info('[PORTION][INQ3][CALL]', {
                nutritionPropType: 'per100',
                servingGramsProp: portion?.grams ?? null,
                portionLabelProp: portion?.grams ? `${portion.grams}g` : 'Unknown serving'
              });
              return null;
            })()}
            {/* FORENSIC PROBE - PORTION INQUIRY */}
            {(() => {
              const route = window.location.pathname;
              const productId = (result as any)?.id || (result as any)?.barcode || result?.itemName;
              console.log('[PORTION][INQ][CALL]', { 
                route, 
                productId, 
                nutritionPropType: 'per100', 
                servingGramsProp: portion?.grams ?? null,
                portionLabelProp: portion?.grams ? `${portion.grams}g` : 'Unknown serving'
              });
              return null;
            })()}
          </TabsContent>
          
          <TabsContent value="flags" className="mt-6">
            <FlagsTab
              ingredientsText={ingredientsText}
              nutrition100g={nutritionData}
              reportId={ocrHash}
              ocrPreview={ingredientsText?.slice(0, 160)}
              existingFlags={flags}
            />
          </TabsContent>
          
          
          <TabsContent value="suggestions" className="mt-6">
            <PersonalizedSuggestions
              result={result}
              portionGrams={portion?.grams || null} // No 30g fallback for suggestions
              userProfile={{
                // Mock user profile - replace with real user data
                goals: user ? ['balanced_nutrition'] : [],
                restrictions: [],
                preferences: []
              }}
            />
          </TabsContent>
        </Tabs>

        {/* 🧪 3. INGREDIENT LIST */}
        <Card className="bg-card border-border backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <div className="text-2xl mr-3">🧪</div>
              Ingredient List
            </h3>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/50 border border-border rounded-lg">
              <p className="text-foreground leading-relaxed">
                <span className="font-semibold">Ingredients: </span>
                <span className="text-foreground">
                  {ingredientsText || 'Ingredient list not available from scan data'}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 🎯 4. ACTION BUTTONS */}
        <div className="flex flex-col gap-3 pt-6">
          {/* 💾 SAVE BUTTON */}
          <SaveCTA
            result={result}
            analysisData={analysisData}
            portionGrams={portion?.grams ?? null} // No 30g fallback
            ocrHash={ocrHash}
            onSaved={(logId) => {
              toast({
                title: "Successfully Saved!",
                description: `Report saved with ID: ${logId.slice(0, 8)}...`,
              });
            }}
          />

          {/* 🍽️ LOG THIS FOOD BUTTON */}
          <Button
            onClick={() => {
              const name = result.itemName || result.productName || 'Unknown Product';

              if (!portion?.grams) {
                console.log('[HEALTH][LOG_FOOD]', 'Routing to nutrition-capture (serving unknown)');

                navigate('/camera', {
                  state: {
                    mode: 'nutrition-capture',
                    productData: {
                      upc: analysisData?.barcode,
                      name,
                      brand: (result as any).brand || undefined,
                      imageUrl: analysisData?.imageUrl, // keep the scan image if we have one
                      ingredientsText: result.ingredientsText,
                      // send what we have; Camera will OCR the NF image to get grams
                    }
                  }
                });
                return;
              }

              const httpOnly = (u?: string | null) =>
                typeof u === "string" && /^https?:\/\//i.test(u) ? u : undefined;

              const itemName =
                result?.productName ?? result?.itemName ?? "Food item";
              // Image precedence (NOTE: prefer productImageUrl)
              const imgCand =
                (result as any)?.productImageUrl ?? (result as any)?.imageUrl ??
                (analysisData as any)?.productImageUrl ?? analysisData?.imageUrl;
              const imageHttp = httpOnly(imgCand);

              if (import.meta.env.VITE_DEBUG_CONFIRM === "true") {
                console.log("[PREFILL][BUILD]", {
                  rev: CONFIRM_FIX_REV,
                  itemName,
                  imageUrlKind: imageHttp ? "http" : "none",
                  portionGrams: portion?.grams,
                  originalImg: imgCand?.slice(0, 120) || "none",
                });
              }

              const per100 = {
                calories: nutritionData.calories || 0,
                protein_g: nutritionData.protein || 0,
                carbs_g: nutritionData.carbs || 0,
                fat_g: nutritionData.fat || 0,
                fiber_g: nutritionData.fiber || 0,
                sugar_g: nutritionData.sugar || 0,
                sodium_mg: nutritionData.sodium || 0,
              };

              const pg = portion?.grams ?? null;

              const prefill = buildLogPrefill(
                itemName,
                undefined, // brand not available in HealthAnalysisResult
                imageHttp,               // HTTP-only image
                result.ingredientsText,
                result.healthProfile?.allergens,
                result.healthProfile?.additives,
                [],
                per100,                               // <-- baseline per-100g
                pg,                                   // <-- grams (null if unknown)
                portion?.requiresConfirmation || false
              );

              // CRITICAL: stamp both keys so every downstream consumer succeeds
              if (prefill?.item) {
                (prefill.item as any).image = imageHttp ?? null;
                (prefill.item as any).imageUrl = imageHttp ?? null;
              }
              (prefill as any).source = "health-report";
              navigate("/camera", { state: { logPrefill: prefill, __rev: CONFIRM_FIX_REV } });
              
              console.debug('[HEALTH_REPORT][LOG_FOOD]', {
                itemName: prefill.item.itemName,
                portionGrams: prefill.item.portionGrams,
                hasIngredients: !!prefill.item.ingredientsText
              });
            }}
            variant="outline"
            className="w-full border-2 border-green-500/50 text-green-600 hover:bg-green-500/10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Log this food
          </Button>

          <Button
            onClick={onScanAnother}
            variant="outline"
            className="w-full border-2 border-primary/50 text-primary hover:bg-primary/10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Scan Another
          </Button>

          <Button
            onClick={onClose}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground py-4 px-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
            size="lg"
          >
            <X className="w-5 h-5 mr-2" />
            Close Report
          </Button>
        </div>
      </div>
    </div>
  );
};