import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HealthReportPopup } from '@/components/health-check/HealthReportPopup';
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
}

export default function HealthReportStandalone() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<HealthAnalysisResult | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);

  useEffect(() => {
    if (reportId) {
      fetchReportData(reportId);
    }
  }, [reportId]);

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
        navigate('/saved-reports');
        return;
      }

      if (!data) {
        toast({
          title: "Not Found",
          description: "Health report not found",
          variant: "destructive"
        });
        navigate('/saved-reports');
        return;
      }

      // Convert nutrition log data to HealthAnalysisResult format
      const healthAnalysisResult = convertToHealthAnalysisResult(data);
      setReportData(healthAnalysisResult);
      setOriginalData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({
        title: "Error",
        description: "Failed to load health report",
        variant: "destructive"
      });
      navigate('/saved-reports');
    } finally {
      setLoading(false);
    }
  };

  const convertToHealthAnalysisResult = (data: NutritionLogData): HealthAnalysisResult => {
    // Extract and normalize quality score to 0-100 scale, then convert to 0-10 for HealthAnalysisResult
    const normalizedScore = extractScore(data.quality_score) ?? 0;
    const healthScore = normalizedScore / 10;
    
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

  const handleScanAnother = () => {
    navigate('/scan');
  };

  const handleClose = () => {
    navigate('/saved-reports');
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

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-green-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-white">Report not found</p>
          <Button onClick={() => navigate('/saved-reports')} variant="outline">
            Back to Saved Reports
          </Button>
        </div>
      </div>
    );
  }

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
      <HealthReportPopup
        result={reportData}
        onScanAnother={handleScanAnother}
        onClose={handleClose}
        analysisData={{
          source: originalData?.source,
          barcode: originalData?.barcode,
          imageUrl: originalData?.image_url
        }}
      />
    </div>
  );
}