import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Loader2
} from 'lucide-react';
import { HealthAnalysisResult } from './HealthCheckModal';
import { saveScanToNutritionLogs } from '@/services/nutritionLogs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { toNutritionLogRow } from '@/adapters/nutritionLogs';
import { supabase } from '@/integrations/supabase/client';

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';

// Performance: gate heavy logging in production
const shouldDebugPerf = import.meta.env.VITE_DEBUG_PERF === 'true';

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

interface HealthReportPopupProps {
  result: HealthAnalysisResult;
  onScanAnother: () => void;
  onClose: () => void;
  analysisData?: {
    source?: string;
    barcode?: string;
    imageUrl?: string;
  };
  initialIsSaved?: boolean;
  hideCloseButton?: boolean;
}

export const HealthReportPopup: React.FC<HealthReportPopupProps> = ({
  result,
  onScanAnother,
  onClose,
  analysisData,
  initialIsSaved = false,
  hideCloseButton = false
}) => {
  // Portion resolver state
  const [portion, setPortion] = useState<{ grams: number; label: string; source: string } | null>(null);
  const [isResolvingPortion, setIsResolvingPortion] = useState(false);

  // Extract ingredients text for OCR portion resolution
  const ingredientsText = useMemo(() => {
    return (result as any)?.ingredientsText || (result as any)?.ocrText || null;
  }, [result]);

  // Create stable product fingerprint for dependencies
  const productFingerprint = useMemo(() => JSON.stringify({
    id: (result as any)?.id,
    barcode: (result as any)?.barcode || analysisData?.barcode,
    itemName: result?.itemName,
    hasNutrition: !!result?.nutritionData
  }), [result, analysisData?.barcode]);

  // Resolve portion size using the same system as EnhancedHealthReport
  useEffect(() => {
    let alive = true;
    
    const runDetection = async () => {
      try {
        const route = window.location.pathname;
        const productId = (result as any)?.id || (result as any)?.barcode || result?.itemName;
        
        console.log('[PORTION][INQ][RESOLVE] start', { productId, route });
        
        const { resolvePortion } = await import('@/lib/nutrition/portionResolver');
        const portionResult = await resolvePortion(result, ingredientsText);
        
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
          return;
        }
        
        setPortion({
          grams: portionResult.grams,
          label: portionResult.label,
          source: portionResult.source
        });
        
      } catch (error) {
        if (!alive) return;
        
        console.error('Portion resolution failed:', error);
        
        // Fallback to default
        setPortion({
          grams: 30,
          label: '30g · est.',
          source: 'fallback'
        });
      } finally {
        if (alive) {
          setIsResolvingPortion(false);
        }
      }
    };

    setIsResolvingPortion(true);
    runDetection();
    
    return () => {
      alive = false;
    };
  }, [productFingerprint, ingredientsText]);
  
  if (shouldDebugPerf) {
    console.info('[UI][NUTRITION.READ]', {
      reads_per100g_from: 'result.nutritionData.*',
      reads_perServing_from: 'result.nutritionDataPerServing.*',
      has_perServing_prop: !!(result as any)?.nutritionDataPerServing,
      sample: {
        per100g_kcal: result?.nutritionData?.calories,
        perServing_kcal: (result as any)?.nutritionDataPerServing?.energyKcal
      }
    });
  }
  
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(initialIsSaved);

  // Memoize heavy derived values
  const nutritionSummary = useMemo(() => {
    const nutrition = result?.nutritionData || {};
    return {
      calories: nutrition.calories || 0,
      protein: nutrition.protein || 0,
      carbs: nutrition.carbs || 0,
      fat: nutrition.fat || 0,
      fiber: nutrition.fiber || 0,
      sugar: nutrition.sugar || 0,
      sodium: nutrition.sodium || 0,
    };
  }, [result?.nutritionData]);

  const flagsSummary = useMemo(() => {
    // Check both flags and ingredientFlags properties for analyzer results
    const flags = result?.flags ?? result?.ingredientFlags ?? [];
    console.log('[REPORT][FLAGS]', { count: flags?.length ?? 0 });
    return {
      total: flags.length,
      high: flags.filter(f => f.severity === 'high').length,
      medium: flags.filter(f => f.severity === 'medium').length,
      low: flags.filter(f => f.severity === 'low').length,
      flags: flags.slice(0, 5) // Limit to first 5 for performance
    };
  }, [result?.flags, result?.ingredientFlags]);

  const healthPercentage = useMemo(() => {
    // Expect healthScore on a 0..10 scale for barcode or 0..100 for other sources
    const score10 = Math.max(0, Math.min(10, Number(result?.healthScore) || 0));
    return Math.round(score10 * 10); // Convert to percentage for display
  }, [result?.healthScore]);

  // Defer non-critical sections using requestIdleCallback
  const [showSecondaryInfo, setShowSecondaryInfo] = useState(false);

  React.useEffect(() => {
    const showSecondary = () => {
      setShowSecondaryInfo(true);
    };

    if ('requestIdleCallback' in window) {
      const idleCallback = requestIdleCallback(showSecondary, { timeout: 2000 });
      return () => cancelIdleCallback(idleCallback);
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeout = setTimeout(showSecondary, 100);
      return () => clearTimeout(timeout);
    }
  }, []);

  const handleSaveToLog = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save health scan results.",
        variant: "destructive"
      });
      return;
    }

    if (isSaving || isSaved) return;

    try {
      setIsSaving(true);
      console.log('[SAVE] Saving health scan to nutrition logs:', {
        itemName: result.itemName,
        source: analysisData?.source,
        barcode: analysisData?.barcode
      });

      // Map analysis data to scan format for adapter
      const scanData = {
        ...result,
        imageUrl: analysisData?.imageUrl,
        barcode: analysisData?.barcode,
      };

      const source = analysisData?.source === 'barcode' ? 'barcode' : 
                     analysisData?.source === 'manual' ? 'manual' : 'photo';

      // Save the full snapshot exactly as rendered
      const snapshot: HealthAnalysisResult = result;

      const source_meta = {
        source,
        barcode: analysisData?.barcode ?? null,
        imageUrl: analysisData?.imageUrl ?? null,
        productName: result.itemName ?? result.productName ?? null,
      };

      const payload = {
        ...toNutritionLogRow(scanData, source),
        report_snapshot: snapshot,
        snapshot_version: 'v1',
        source_meta,
      };
      
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert(payload as any)
        .select('*')
        .single();

      if (error) throw error;

      console.log('[SNAPSHOT][SAVED]', { id: data?.id, ok: !error });
      
      setIsSaved(true);
      toast({
        title: "Saved Successfully! 💾",
        description: `${result.itemName} has been saved to your nutrition logs.`,
      });
    } catch (error: any) {
      console.error('❌ Save failed:', error);
      toast({
        title: "Save Failed",
        description: error?.message ?? 'Unable to save health scan result. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, isSaving, isSaved, result, analysisData, toast]);
  
  // Helper functions for score-based ratings
  const getScoreLabel = (score: number) => {
    if (score >= 8) return { label: 'Healthy', icon: '✅', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/30' };
    if (score >= 4) return { label: 'Caution', icon: '⚠️', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' };
    return { label: 'Avoid', icon: '❌', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/30' };
  };

  const getScoreMessage = (score: number) => {
    if (score >= 8) return 'Looking good! Healthy choice.';
    if (score >= 4) return 'Some concerns to keep in mind.';
    return 'We recommend avoiding this product.';
  };

  const getStarRating = (score: number) => {
    // Normalize score to 0-10 range first, then convert to 0-5 stars
    const score10 = Math.max(0, Math.min(10, Number(score) || 0));
    return Math.round(score10 / 2); // 0..5 stars
  };

  const hasValidNutrition = (nutrition: any): boolean => {
    return nutrition && 
           typeof nutrition === 'object' && 
           !Array.isArray(nutrition) &&
           Object.keys(nutrition).length > 0 &&
           Object.values(nutrition).some(value => value !== null && value !== undefined);
  };

  const scoreLabel = getScoreLabel(result.healthScore);
  const starCount = getStarRating(result.healthScore);

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
            <h1 className="text-2xl font-bold text-foreground mb-6">{result.itemName}</h1>
            
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
            <div className={`inline-flex items-center space-x-3 px-8 py-4 rounded-2xl ${scoreLabel.bgColor} border-2 mb-6 shadow-lg`}>
              <span className="text-3xl">{scoreLabel.icon}</span>
              <span className={`text-2xl font-bold ${scoreLabel.color}`}>{scoreLabel.label}</span>
            </div>
            
            {/* Friendly Message */}
            <p className={`text-lg ${scoreLabel.color} font-medium leading-relaxed`}>
              {getScoreMessage(result.healthScore)}
            </p>
          </CardContent>
        </Card>

        {/* 🚩 2. FLAGGED INGREDIENTS SECTION - Only show for successful scans (deferred) */}
        {showSecondaryInfo && result.healthScore !== null && result.healthScore > 0 && (
          <Card className="bg-card border-border backdrop-blur-sm">
            <CardHeader className="pb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3" />
                Flagged Ingredients
                {flagsSummary.total > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {flagsSummary.total} warning{flagsSummary.total > 1 ? 's' : ''}
                  </Badge>
                )}
              </h3>
            </CardHeader>
            <CardContent>
            {flagsSummary.total > 0 ? (
              <div className="space-y-4">
                {/* Warning Summary */}
                <div className="p-4 bg-destructive/10 border-l-4 border-destructive rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-destructive mr-2" />
                    <p className="text-destructive-foreground font-semibold">
                      This product contains {flagsSummary.total} ingredient{flagsSummary.total > 1 ? 's' : ''} 
                      that may not align with your health profile.
                    </p>
                  </div>
                </div>

                {/* Detailed Flagged Ingredients */}
                <div className="space-y-3">
                  {flagsSummary.flags.map((flag, index) => {
                    const getSeverityColor = (severity: string) => {
                      switch (severity.toLowerCase()) {
                        case 'high': return { bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive-foreground', icon: 'text-destructive' };
                        case 'medium': return { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-600 dark:text-orange-400', icon: 'text-orange-500' };
                        default: return { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', icon: 'text-yellow-500' };
                      }
                    };

                    const colors = getSeverityColor(flag.severity);
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border ${colors.bg}`}
                      >
                        <div className="flex items-start space-x-3">
                          <XCircle className={`w-5 h-5 ${colors.icon} mt-0.5 flex-shrink-0`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`font-bold ${colors.text} capitalize`}>
                                {flag.ingredient || flag.flag}
                              </h4>
                              <Badge 
                                variant={flag.severity === 'high' ? 'destructive' : flag.severity === 'medium' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {flag.severity} risk
                              </Badge>
                            </div>
                            <p className={`${colors.text} text-sm leading-relaxed`}>
                              {flag.reason || flag.flag || `This ingredient may be concerning based on your health conditions.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Health Condition Context */}
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-primary-foreground text-sm">
                    💡 <strong>Note:</strong> These warnings are personalized based on your health profile. 
                    Consult with your healthcare provider for specific dietary guidance.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-primary" />
                <div>
                  <span className="text-primary-foreground dark:text-primary font-medium">No concerning ingredients detected for your health profile!</span>
                  <p className="text-primary-foreground dark:text-primary text-sm mt-1">This product appears to be safe based on your health conditions.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* 📊 3. NUTRITION FACTS */}
        <Card className="bg-card border-border backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <div className="text-2xl mr-3">📊</div>
              NUTRITION FACTS
            </h3>
          </CardHeader>
          <CardContent>
            {hasValidNutrition(result.nutritionData) ? (
              <>
                {/* FORENSIC PROBE - PORTION INQUIRY */}
                {(() => {
                  const route = window.location.pathname;
                  const productId = (result as any)?.id || (result as any)?.barcode || result?.itemName;
                  console.log('[PORTION][INQ][CALL]', { 
                    route, 
                    productId, 
                    nutritionPropType: 'per100', 
                    servingGramsProp: portion?.grams ?? 30, 
                    portionLabelProp: portion?.label ?? '30g · est.' 
                  });
                  return null;
                })()}
                
                <h4 className="text-lg font-semibold mb-3">
                  {portion ? `Per portion (${portion.grams}g)` : 'Per 100g'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(result.nutritionData).map(([key, value]) => {
                    if (value === undefined || value === null || value === 0) return null;

                    // Scale nutrition values if we have a resolved portion
                    const scaledValue = portion ? (Number(value) * portion.grams / 100) : value;

                    // Map nutrient keys to display names and units
                    const nutrientInfo = {
                      calories: { label: 'Calories', unit: 'kcal', priority: 1 },
                      protein: { label: 'Protein', unit: 'g', priority: 2 },
                      carbs: { label: 'Carbs', unit: 'g', priority: 3 },
                      fat: { label: 'Total Fat', unit: 'g', priority: 4 },
                      sugar: { label: 'Sugar', unit: 'g', priority: 5 },
                      fiber: { label: 'Fiber', unit: 'g', priority: 6 },
                      sodium: { label: 'Sodium', unit: 'mg', priority: 7 },
                      // Additional mappings for different naming schemes
                      sugars_g: { label: 'Sugar', unit: 'g', priority: 5 },
                      saturated_fat_g: { label: 'Sat Fat', unit: 'g', priority: 8 }
                    }[key as keyof typeof result.nutritionData];

                    if (!nutrientInfo) return null;

                    const displayValue = typeof value === 'number' ? 
                      (nutrientInfo.unit === 'mg' ? Math.round(Number(value)) : Number(value).toFixed(1)) : 
                      value;

                    return (
                      <div key={key} className="text-center p-3 bg-primary/10 border border-primary/30 rounded-lg">
                        <div className="text-2xl font-bold text-foreground">
                          {portion ? Math.round(scaledValue * 10) / 10 : displayValue}
                          {nutrientInfo.unit}
                        </div>
                        <div className="text-sm font-medium text-foreground mt-1">{nutrientInfo.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Per-serving nutrition (gated) */}
                {import.meta.env.VITE_SHOW_PER_SERVING === 'true' && result?.nutritionDataPerServing && (
                  <section className="mt-6">
                    <h4 className="text-lg font-semibold mb-3">
                      Per serving{result?.serving_size ? ` (${result.serving_size})` : ''}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Calories</div>
                        <div className="text-lg font-semibold text-foreground">{result.nutritionDataPerServing.energyKcal ?? '—'} kcal</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Sugar</div>
                        <div className="text-lg font-semibold text-foreground">{result.nutritionDataPerServing.sugar_g ?? '—'} g</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Sodium</div>
                        <div className="text-lg font-semibold text-foreground">{result.nutritionDataPerServing.sodium_mg ?? '—'} mg</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Fat</div>
                        <div className="text-lg font-semibold text-foreground">{result.nutritionDataPerServing.fat_g ?? '—'} g</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Sat fat</div>
                        <div className="text-lg font-semibold text-foreground">{result.nutritionDataPerServing.satfat_g ?? '—'} g</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Fiber</div>
                        <div className="text-lg font-semibold text-foreground">{result.nutritionDataPerServing.fiber_g ?? '—'} g</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Protein</div>
                        <div className="text-lg font-semibold text-foreground">{result.nutritionDataPerServing.protein_g ?? '—'} g</div>
                      </div>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-foreground font-medium">
                Nutrition facts not available from scan data
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🧪 4. INGREDIENT LIST */}
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
                {/* Now using full ingredient list from legacy adapter instead of additives only */}
                  <span className="text-foreground">
                    {result.ingredientsText || 'Ingredient list not available from scan data'}
                  </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 💬 5. AI COACH COMMENTARY (deferred) */}
        {showSecondaryInfo && (
        <Card className="bg-card border-border backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <Zap className="w-6 h-6 text-primary mr-3" />
              AI Coach Insights
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Personalized Warnings */}
              {result.personalizedWarnings.length > 0 && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-destructive-foreground mb-2">Health Warnings</h4>
                      <ul className="space-y-1">
                        {result.personalizedWarnings.map((warning, index) => (
                          <li key={index} className="text-destructive-foreground">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-primary-foreground mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {result.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-foreground">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Enhanced Default commentary */}
              {result.personalizedWarnings.length === 0 && result.suggestions.length === 0 && (
                <div className="p-4 bg-muted border border-border rounded-lg">
                  <div className="space-y-3">
                    {result.healthScore >= 8 ? (
                      <>
                        <p className="text-foreground font-medium">
                          "This is a great option if you're avoiding added sugars and processed ingredients."
                        </p>
                        <p className="text-foreground">
                          "Keep up the excellent work with mindful food choices - your body will thank you!"
                        </p>
                      </>
                    ) : result.healthScore >= 4 ? (
                      <>
                        <p className="text-foreground font-medium">
                          "This product is okay in moderation, but consider alternatives with cleaner ingredients."
                        </p>
                        <p className="text-foreground">
                          "Some users prefer products without artificial additives for optimal health benefits."
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-foreground font-medium">
                          "Consider avoiding this product regularly - it contains several concerning ingredients."
                        </p>
                        <p className="text-foreground">
                          "Look for simpler alternatives with whole food ingredients and fewer additives."
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* 🎯 6. ACTION BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
          <Button
            onClick={handleSaveToLog}
            disabled={isSaving || isSaved || !user}
            className="bg-primary hover:bg-primary/90 text-primary-foreground py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : isSaved ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Saved ✓
              </>
            ) : (
              <>
                <span className="text-xl mr-2">💾</span>
                Save
              </>
            )}
          </Button>
          
          <Button
            onClick={() => {/* Handle flag item */}}
            variant="outline"
            className="border-2 border-destructive/50 text-destructive hover:bg-destructive/10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Flag className="w-5 h-5 mr-2" />
            Flag Item
          </Button>
          
          <Button
            onClick={onScanAnother}
            variant="outline"
            className="border-2 border-primary/50 text-primary hover:bg-primary/10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Scan Another
          </Button>

          <Button
            onClick={onClose}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground py-4 px-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};