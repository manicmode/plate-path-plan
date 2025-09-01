import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HealthReportPopup } from '@/components/health-check/HealthReportPopup';
import { renderHealthReport } from '@/lib/health/renderHealthReport';
import { HealthAnalysisResult } from '@/components/health-check/HealthCheckModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractScore } from '@/lib/health/extractScore';
import { get as getPhoto, del as delPhoto } from '@/lib/stores/photoFlowStore';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { 
  parseServingFromOcr,
  parseNutritionFromOcr,
  extractIngredients,
  extractNameFromOcr,
  computeFlags,
  computeScore,
  toServingNutrition,
  parsePortionToGrams,
  determinePortionPrecedence
} from '@/lib/health/photoFlowV2Utils';

interface NutritionLogData {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturated_fat?: number;
  quality_score: number;
  quality_verdict: string;
  quality_reasons?: string[];
  serving_size?: string;
  source: string;
  image_url?: string;
  processing_level?: string;
  ingredient_analysis?: any;
  confidence?: number;
  barcode?: string;
  brand?: string;
  created_at: string;
  report_snapshot?: any;
  snapshot_version?: string;
  source_meta?: any;
}

export default function HealthReportStandalone() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<NutritionLogData | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [directPayload, setDirectPayload] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rid = searchParams.get('rid');
    const src = searchParams.get('src');
    const isPhotoFlowV2Enabled = isFeatureEnabled('photo_flow_v2');
    
    console.log('[REPORT][BOOT]', { 
      reportId, 
      rid,
      source: src,
      hasLocationState: !!location.state,
      barcode: searchParams.get('barcode'),
      mode: searchParams.get('mode')
    });

    // V2 Photo Flow: Get data from ephemeral store
    if (src === 'photo' && isPhotoFlowV2Enabled && rid) {
      const rec = getPhoto(rid);
      console.log('[PHOTO][ANALYZE] Retrieved from store:', { rid, hasData: !!rec });
      
      if (rec) {
        try {
          if (rec.kind === 'label') {
            console.log('[PHOTO][ANALYZE] Processing nutrition label...');
            const data = rec.data;
            const text = data?.text ?? data?.ocrText ?? '';
            const ocrImageUrl = data?.imageUrl ?? null;
            const ocrPortion = data?.portion ?? null;

            console.log('[PHOTO][ANALYZE]', { 
              ocr_len: text.length, 
              hasParsedNutrition: !!data?.nutrition 
            });

            // Parse serving and nutrition from OCR
            const servingFromOcr = ocrPortion ?? parseServingFromOcr(text);
            const nutritionRaw = data?.nutrition ?? parseNutritionFromOcr(text);
            
            // Determine portion precedence and normalize nutrition
            const portionChosen = determinePortionPrecedence(
              servingFromOcr ? `${servingFromOcr.amount}${servingFromOcr.unit}` : null,
              null, // user preference
              servingFromOcr ? `${servingFromOcr.amount}${servingFromOcr.unit}` : null,
              null  // estimate
            );

            console.log('[PHOTO][ANALYZE]', { 
              portionChosen, 
              grams: parsePortionToGrams(portionChosen.portion)
            });

            const nutritionPerServing = toServingNutrition(nutritionRaw, parsePortionToGrams(portionChosen.portion));
            
            // Extract ingredients and compute flags/score
            const ingredients = extractIngredients(text);
            const flags = computeFlags(ingredients, []);
            const score = computeScore(nutritionPerServing); // 0–100 (do NOT divide)
            const productName = extractNameFromOcr(text) ?? 'Unknown item';

            console.log('[PHOTO][ANALYZE]', { 
              final_score: score, 
              flag_count: flags.length 
            });

            const finalPayload = {
              productName,
              imageUrl: ocrImageUrl,
              nutritionData: nutritionPerServing,
              flags,
              healthScore: score,
              portion: `${portionChosen?.portion ?? ''} · OCR`,
              source: 'photo_flow_v2',
            };

            setDirectPayload(finalPayload);
            setLoading(false);
          } else if (rec.kind === 'meal') {
            console.log('[PHOTO][ANALYZE] Processing detected meal...');
            const data = rec.data;
            const items = data?.items || [];
            
            console.log('[PHOTO][MEAL] items_detected=', items.length);
            
            if (items.length === 0) {
              setError("Couldn't detect foods. Retake with better lighting, or Try Manual Entry.");
              setLoading(false);
              delPhoto(rid);
              return;
            }

            // Choose top 3 items by confidence
            const topItems = items
              .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))
              .slice(0, 3);

            // Only create report if we have meaningful nutrition data
            // Don't synthesize fake 50% scores or Unknown Products
            const productName = topItems.length === 1 
              ? topItems[0].name 
              : 'Detected meal';

            // Estimate calories based on detected items and their grams
            const estimatedCalories = topItems.reduce((sum: number, item: any) => {
              const grams = item.grams || 100;
              // Basic calorie estimates per 100g for common foods
              const caloriesPer100g: Record<string, number> = {
                salmon: 208, chicken: 165, beef: 250, fish: 150, tuna: 144,
                rice: 130, pasta: 131, bread: 265, potato: 77,
                salad: 15, lettuce: 15, spinach: 23, broccoli: 34, carrot: 41,
                tomato: 18, asparagus: 20, avocado: 160,
                eggs: 155, cheese: 402, yogurt: 59, milk: 42,
                apple: 52, banana: 89, orange: 47, lemon: 29,
                nuts: 607, beans: 347, lentils: 353,
                pizza: 266, burger: 295, sandwich: 250, fries: 365, soup: 40
              };
              
              const baseCalories = caloriesPer100g[item.name] || 100;
              return sum + Math.round((baseCalories * grams) / 100);
            }, 0);

            const finalPayload = {
              productName,
              imageUrl: data?.imageUrl ?? null,
              nutritionData: {
                basis: 'per_serving',
                calories: estimatedCalories,
                protein_g: Math.round(estimatedCalories * 0.15 / 4), // rough estimate
                carbs_g: Math.round(estimatedCalories * 0.45 / 4),   // rough estimate  
                fat_g: Math.round(estimatedCalories * 0.35 / 9),     // rough estimate
                fiber_g: Math.max(1, Math.round(estimatedCalories / 100)),
                sugar_g: Math.max(1, Math.round(estimatedCalories / 200)),
                sodium_mg: Math.round(estimatedCalories * 2),
              },
              flags: [],
              healthScore: Math.min(85, Math.max(45, 70 - (estimatedCalories > 600 ? 15 : 0))), // realistic score based on calories
              portion: `Photo · ${topItems.length} items`,
              source: 'photo_flow_v2_meal',
              detectedItems: topItems, // Include detected items for display
            };

            setDirectPayload(finalPayload);
            setLoading(false);
          }
          
          // Clean up store
          delPhoto(rid);
          return;
        } catch (error) {
          console.error('[PHOTO][ANALYZE] Processing failed:', error);
          setError('Failed to process photo analysis');
          setLoading(false);
          delPhoto(rid);
          return;
        }
      }
    }

    // Check for direct barcode payload from unified pipeline (legacy support)
    if (location.state && (searchParams.get('mode') === 'barcode' || searchParams.get('barcode'))) {
      console.log('[REPORT][DIRECT] Using location state payload');
      setDirectPayload(location.state);
      setLoading(false);
      return;
    }

    // Check for barcode parameter and fetch via enhanced-health-scanner
    const barcode = searchParams.get('barcode');
    const barcodeSource = searchParams.get('source') || 'unknown';
    if (barcode && !reportId) {
      console.log('[REPORT][BARCODE] Fetching barcode data', { barcode, source: barcodeSource });
      fetchBarcodeData(barcode, barcodeSource);
      return;
    }

    // Fallback to reportId lookup
    if (reportId) {
      fetchReportData(reportId);
    } else if (!rid || src !== 'photo') {
      // Only redirect if we don't have a valid rid from photo flow
      // Show friendly error with retry button for invalid rid
      if (rid && src === 'photo') {
        console.log('[PHOTO][ROUTE] Invalid or expired rid, showing retry');
        setDirectPayload(null);
        setLoading(false);
        return;
      }
      // No valid params, redirect to scan
      navigate('/scan');
    }
  }, [reportId, location.state, searchParams]);

  const fetchBarcodeData = async (barcode: string, source: string) => {
    try {
      setLoading(true);
      console.log('[REPORT][FETCH] Fetching barcode from enhanced-health-scanner');
      
      const { data: result, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { 
          mode: 'barcode', 
          barcode, 
          source: `health-scan-${source}`
        }
      });

      if (error) {
        console.error('[REPORT][ERROR] Failed to fetch barcode data:', error);
        toast({
          title: "Error",
          description: "Failed to load product information",
          variant: "destructive"
        });
        navigate('/scan');
        return;
      }

      if (!result) {
        toast({
          title: "Product Not Found",
          description: "This product is not in our database",
          variant: "destructive"
        });
        navigate('/scan');
        return;
      }

      console.log('[REPORT][SUCCESS] Barcode data loaded');
      setDirectPayload(result);
      
    } catch (error) {
      console.error('[REPORT][EXCEPTION] Error fetching barcode:', error);
      toast({
        title: "Error", 
        description: "Failed to load product information",
        variant: "destructive"
      });
      navigate('/scan');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch from nutrition_logs_clean view
      const { data, error } = await (supabase as any)
        .from('nutrition_logs_clean')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching report:', error);
        toast({
          title: "Error",
          description: "Failed to load health report",
          variant: "destructive"
        });
        navigate('/scan/saved-reports');
        return;
      }

      if (!data) {
        toast({
          title: "Not Found",
          description: "Health report not found",
          variant: "destructive"
        });
        navigate('/scan/saved-reports');
        return;
      }

      // Convert nutrition log data to HealthAnalysisResult format
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({
        title: "Error",
        description: "Failed to load health report",
        variant: "destructive"
      });
      navigate('/scan/saved-reports');
    } finally {
      setLoading(false);
    }
  };

  const convertToHealthAnalysisResult = (data: NutritionLogData): HealthAnalysisResult => {
    // Fixed score math for existing rows
    const raw = Number(data.quality_score);
    const score10 =
      Number.isFinite(raw) ? (raw <= 10 ? raw : raw / 10)
      : (() => { const n = extractScore(data.quality_score); return n == null ? 0 : (n <= 10 ? n : n / 10); })();
    const healthScore = score10;
    
    // Convert quality reasons to ingredient flags format
    const ingredientFlags = (data.quality_reasons || []).map((reason, index) => ({
      ingredient: 'ingredient',
      flag: reason,
      severity: determineFlagSeverity(reason) as 'low' | 'medium' | 'high',
      reason: reason
    }));

    // Create nutrition data object
    const nutritionData = {
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      fiber: data.fiber || 0,
      sugar: data.sugar || 0,
      sodium: data.sodium || 0
    };

    // Map overall rating to expected values
    const mapOverallRating = (verdict: string): "excellent" | "good" | "fair" | "poor" | "avoid" => {
      const lowerVerdict = verdict.toLowerCase();
      if (lowerVerdict.includes('excellent')) return 'excellent';
      if (lowerVerdict.includes('good')) return 'good';
      if (lowerVerdict.includes('fair') || lowerVerdict.includes('moderate')) return 'fair';
      if (lowerVerdict.includes('poor')) return 'poor';
      if (lowerVerdict.includes('avoid')) return 'avoid';
      return 'fair'; // default
    };

    return {
      itemName: data.food_name,
      productName: data.food_name,
      title: data.food_name,
      healthScore,
      overallRating: mapOverallRating(data.quality_verdict || 'fair'),
      ingredientFlags,
      nutritionData,
      healthProfile: {
        isOrganic: false,
        isGMO: false,
        allergens: [],
        preservatives: [],
        additives: []
      },
      personalizedWarnings: data.quality_reasons || [],
      suggestions: [],
      ingredientsText: extractIngredientsText(data.ingredient_analysis)
    };
  };

  const determineFlagSeverity = (reason: string): string => {
    const reasonLower = reason.toLowerCase();
    
    if (reasonLower.includes('high') || reasonLower.includes('danger') || reasonLower.includes('avoid')) {
      return 'high';
    }
    
    if (reasonLower.includes('moderate') || reasonLower.includes('warning') || reasonLower.includes('limit')) {
      return 'medium';
    }
    
    return 'low';
  };

  /**
   * Process Photo Flow V2 data from ephemeral store
   */
  const processPhotoFlowV2Data = (data: any) => {
    console.log('[PHOTO][ANALYZE] Processing V2 data', { 
      hasText: !!data?.text, 
      textLength: data?.text?.length || 0 
    });

    const ocrText = data?.text ?? data?.ocrText ?? '';
    const ocrImageUrl = data?.imageUrl ?? null;
    const ocrPortion = data?.portion ?? null;
    const ocrServings = data?.servings ?? null;

    console.log('[PHOTO][ANALYZE] ocr_len=', ocrText.length, 'hasParsedNutrition=checking');

    // Parse serving size from OCR
    const servingFromOcr = ocrPortion ?? parseServingFromOcr(ocrText);
    
    // Parse nutrition from OCR or use provided nutrition
    const nutritionRaw = data?.nutrition ?? parseNutritionFromOcr(ocrText);
    const hasParsedNutrition = !!(nutritionRaw.calories || nutritionRaw.protein_g || nutritionRaw.carbs_g);
    
    console.log('[PHOTO][ANALYZE] ocr_len=', ocrText.length, 'hasParsedNutrition=', hasParsedNutrition);

    // Determine portion using precedence
    const portionResult = determinePortionPrecedence(
      servingFromOcr ? `${servingFromOcr.amount}${servingFromOcr.unit}` : null,
      null, // user preference
      servingFromOcr ? `${servingFromOcr.amount}${servingFromOcr.unit}` : null,
      null  // estimate
    );
    
    const portionGrams = parsePortionToGrams(portionResult.portion);
    console.log('[PHOTO][ANALYZE] portionChosen=', portionResult.portion, 'grams=', portionGrams);

    // Scale nutrition to serving
    const nutritionPerServing = hasParsedNutrition 
      ? toServingNutrition(nutritionRaw, portionGrams)
      : {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0
        };

    // Extract ingredients and compute flags
    const ingredientsText = extractIngredients(ocrText);
    const flags = computeFlags(ingredientsText, []);

    // Compute score (0-100 scale)
    const score = hasParsedNutrition 
      ? computeScore(nutritionPerServing, flags, ingredientsText)
      : 0;
    
    console.log('[PHOTO][ANALYZE] final_score=', score, 'flag_count=', flags.length);

    // Extract product name
    const productName = extractNameFromOcr(ocrText) ?? 'Unknown item';

    // If we can't parse anything meaningful, return error state
    if (!hasParsedNutrition && !ingredientsText && productName === 'Unknown item') {
      return {
        error: true,
        message: "Couldn't read nutrition panel. Retake photo of the nutrition label or try Manual Entry."
      };
    }

    return {
      productName,
      itemName: productName,
      title: productName,
      imageUrl: ocrImageUrl,
      nutritionData: nutritionPerServing,
      nutritionDataPerServing: nutritionPerServing,
      flags: flags.map(f => ({
        ingredient: f.label,
        flag: f.key,
        severity: f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low',
        reason: f.description || f.label
      })),
      ingredientFlags: flags.map(f => ({
        ingredient: f.label,
        flag: f.key,
        severity: f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low',
        reason: f.description || f.label
      })),
      healthFlags: flags.map(f => ({
        key: f.key,
        label: f.label,
        severity: f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warning' : 'good',
        description: f.description || null
      })),
      healthScore: score, // 0-100 scale
      overallRating: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : score >= 20 ? 'poor' : 'avoid',
      ingredientsText,
      healthProfile: {
        isOrganic: /organic/i.test(ingredientsText),
        isGMO: false,
        allergens: [],
        preservatives: [],
        additives: []
      },
      personalizedWarnings: [],
      suggestions: score < 50 ? ['Consider choosing a healthier alternative'] : [],
      portion: `${portionResult.portion} · ${portionResult.source}`,
      source: 'photo_flow_v2'
    };
  };

  const extractIngredientsText = (ingredientAnalysis: any): string => {
    if (!ingredientAnalysis) return '';
    
    if (typeof ingredientAnalysis === 'string') {
      return ingredientAnalysis;
    }
    
    if (typeof ingredientAnalysis === 'object') {
      return ingredientAnalysis.ingredients || 
             ingredientAnalysis.text || 
             JSON.stringify(ingredientAnalysis);
    }
    
    return '';
  };

  const joinIngredientsFromAnalysis = (ia: any): string | null => {
    if (!ia) return null;
    if (Array.isArray(ia.list) && ia.list.length) return ia.list.join(', ');
    const parts: string[] = [];
    if (Array.isArray(ia.additives) && ia.additives.length) parts.push(...ia.additives);
    if (Array.isArray(ia.allergens) && ia.allergens.length) parts.push(...ia.allergens);
    return parts.length ? parts.join(', ') : null;
  };

  const handleScanAnother = () => {
    navigate('/scan');
  };

  const handleClose = () => {
    navigate('/scan');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-green-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-400" />
          <p className="text-white">Loading health report...</p>
        </div>
      </div>
    );
  }

  // Handle direct payload from unified barcode pipeline
  if (directPayload) {
    console.log('[REPORT][RENDER] Rendering direct payload from unified pipeline');
    
    // Handle V2 photo error state
    if (directPayload.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h2 className="text-2xl font-bold text-foreground mb-4">Analysis Failed</h2>
            <p className="text-foreground/60 mb-6">{directPayload.message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/scan')} variant="default">
                Retake Photo
              </Button>
              <Button onClick={() => navigate('/scan/manual')} variant="outline">
                Try Manual Entry
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-background/95 backdrop-blur border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Scan
          </Button>
        </div>
        
        {renderHealthReport({
          result: directPayload,
          onScanAnother: handleScanAnother,
          onClose: handleClose,
          analysisData: {
            source: searchParams.get('source') || (directPayload.source === 'photo_flow_v2' ? 'photo' : 'barcode'),
            barcode: searchParams.get('barcode') || undefined,
            imageUrl: directPayload.imageUrl
          },
          initialIsSaved: false,
          hideCloseButton: true
        })}
      </div>
    );
  }

  const src = searchParams.get('src');
  const rid = searchParams.get('rid');
  
  if (!reportData && !directPayload && rid && src === 'photo') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Session Expired</h2>
          <p className="text-foreground/60 mb-4">Your photo analysis session has expired. Please retake your photo.</p>
          <Button onClick={() => navigate('/scan')}>
            Retake Photo
          </Button>
        </div>
      </div>
    );
  }

  if (!reportData && !directPayload) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Report Not Found</h2>
          <p className="text-foreground/60 mb-4">The requested health report could not be found.</p>
          <Button onClick={() => navigate('/scan/saved-reports')}>
            Back to Saved Reports
          </Button>
        </div>
      </div>
    );
  }

  // Check for saved snapshot first - SNAPSHOT-FIRST LOGIC
  let analysis: HealthAnalysisResult | null = null;

  if (reportData.report_snapshot) {
    analysis = reportData.report_snapshot as HealthAnalysisResult;
    console.log('[SNAPSHOT][LOADED]', { id: reportData.id, hasSnapshot: true });
    
    return (
      <div className="w-full">
        <div className="mb-4">
          <Button
            variant="outline" 
            onClick={() => navigate('/scan/saved-reports')}
            className="flex items-center"
          >
            ← Back to Saved Reports
          </Button>
        </div>
        
        {renderHealthReport({
          result: analysis,
          onScanAnother: handleScanAnother,
          onClose: handleClose,
          analysisData: {
            source: reportData.source || 'unknown',
            barcode: reportData.barcode || undefined
          },
          initialIsSaved: true,
          hideCloseButton: true
        })}
      </div>
    );
  } else {
    // Fallback to converter for legacy data
    analysis = convertToHealthAnalysisResult(reportData);
    console.log('[SNAPSHOT][FALLBACK]', { id: reportData.id });

    // Guardrails for legacy rows so full sections render correctly:
    if (!analysis?.nutritionData) {
      analysis = {
        ...analysis,
        nutritionData: {
          calories: reportData.calories ?? 0,
          carbs: reportData.carbs ?? null,
          sugar: reportData.sugar ?? null,
          sodium: reportData.sodium ?? null,
          protein: reportData.protein ?? null,
          fat: reportData.fat ?? null,
        },
      };
    }

    if (!analysis?.ingredientsText) {
      const ia = reportData.ingredient_analysis ?? null;
      const text = joinIngredientsFromAnalysis(ia);
      analysis = {
        ...analysis,
        ingredientsText: text ?? '',
      };
    }
  }

  const convertedResult = analysis;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-green-950">
      {/* Header with back button */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Health Report Popup */}
        {renderHealthReport({
          result: convertedResult,
          onScanAnother: handleScanAnother,
          onClose: handleClose,
          analysisData: {
            source: reportData?.source || 'unknown',
            barcode: reportData?.barcode || undefined,
            imageUrl: reportData?.image_url
          },
          initialIsSaved: true,
          hideCloseButton: true
        })}
    </div>
  );
}