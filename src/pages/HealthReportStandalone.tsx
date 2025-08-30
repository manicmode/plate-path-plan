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

  useEffect(() => {
    console.log('[REPORT][BOOT]', { 
      reportId, 
      hasLocationState: !!location.state,
      barcode: searchParams.get('barcode'),
      source: searchParams.get('source'),
      mode: searchParams.get('mode')
    });

    // Check for photo sessionStorage boot from unified pipeline (only on /photo route)
    if (location.pathname === '/photo' && location.state?.bootKey && location.state?.entry === 'photo') {
      console.log('[REPORT][PHOTO_BOOT] Using sessionStorage payload', location.state.bootKey);
      const storedPayload = sessionStorage.getItem(location.state.bootKey);
      if (storedPayload) {
        try {
          const payload = JSON.parse(storedPayload);
          setDirectPayload(payload);
          setLoading(false);
          // Clean up sessionStorage after boot
          sessionStorage.removeItem(location.state.bootKey);
          return;
        } catch (e) {
          console.error('[REPORT][PHOTO_BOOT] Failed to parse payload:', e);
        }
      }
    }

    // Check for direct barcode payload from unified pipeline
    if (location.state && (searchParams.get('mode') === 'barcode' || searchParams.get('barcode'))) {
      console.log('[REPORT][DIRECT] Using location state payload');
      setDirectPayload(location.state);
      setLoading(false);
      return;
    }

    // Check for barcode parameter and fetch via enhanced-health-scanner
    const barcode = searchParams.get('barcode');
    const source = searchParams.get('source') || 'unknown';
    if (barcode && !reportId) {
      console.log('[REPORT][BARCODE] Fetching barcode data', { barcode, source });
      fetchBarcodeData(barcode, source);
      return;
    }

    // Fallback to reportId lookup
    if (reportId) {
      fetchReportData(reportId);
    } else {
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
    // Navigate back to scan for now - could be improved to remember entry point
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
            source: searchParams.get('source') || 'barcode',
            barcode: searchParams.get('barcode') || undefined
          },
          initialIsSaved: false,
          hideCloseButton: true
        })}
      </div>
    );
  }

  if (!reportData) {
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