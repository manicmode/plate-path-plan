/**
 * Enhanced Health Report with Nutrition Toggle, Functional Tabs, and Personalized Suggestions
 * Replaces the existing HealthReportPopup with new features
 */

import React, { useState, useMemo } from 'react';
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
  Loader2
} from 'lucide-react';
import type { HealthAnalysisResult } from './HealthCheckModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { NutritionToggle } from './NutritionToggle';
import { FlagsTab } from './FlagsTab';
import { PersonalizedSuggestions } from './PersonalizedSuggestions';
import { parsePortionGrams } from '@/lib/nutrition/portionCalculator';
import { supabase } from '@/integrations/supabase/client';
import { toNutritionLogRow } from '@/adapters/nutritionLogs';

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';

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
      
      // Log V2 CTA telemetry
      console.info('[REPORT][V2][CTA_SAVE]', { 
        source: analysisData?.source, 
        score: result?.healthScore 
      });

      // Create enhanced report snapshot with portion info
      const reportSnapshot = {
        ...result,
        portionGrams,
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
      <div className="sticky bottom-[88px] md:bottom-6 z-20 px-4">
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
    <div className="sticky bottom-[88px] md:bottom-6 z-20 px-4">
      <Button
        onClick={handleSaveReport}
        disabled={isSaving || !user?.id}
        className="w-full rounded-2xl py-4 font-semibold shadow-lg
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
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Saves score, flags & portion to your log
      </p>
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
  const { toast } = useToast();
  const { user } = useAuth();

  // Add safety guards for all potentially undefined properties
  const nutritionData = result?.nutritionData || {};
  const flags = Array.isArray(result?.flags) ? result.flags : Array.isArray(result?.ingredientFlags) ? result.ingredientFlags : [];
  const ingredientsText = result?.ingredientsText || '';
  const healthScore = typeof result?.healthScore === 'number' ? result.healthScore : 0;

  // Parse portion information with safety
  const portionInfo = useMemo(() => {
    try {
      return parsePortionGrams(result, analysisData?.imageUrl);
    } catch (error) {
      console.warn('Failed to parse portion grams:', error);
      return { grams: 30, isEstimated: true, source: 'fallback' };
    }
  }, [result, analysisData?.imageUrl]);

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
    const score10 = Math.max(0, Math.min(10, Number(healthScore) || 0));
    return Math.round(score10 * 10); // Convert to percentage for display
  }, [healthScore]);

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
            
            {/* Source Badge */}
            {analysisData?.source && (
              <div className="mt-4">
                <Badge variant="outline" className="text-xs">
                  Source: {analysisData.source === 'barcode' ? 'Barcode' : 
                          analysisData.source === 'manual' ? 'Manual' : 'Photo'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 📊 2. TABBED CONTENT AREA */}
        <Tabs defaultValue="nutrition" className="w-full">
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
          </TabsList>
          
          <TabsContent value="nutrition" className="mt-6">
            <NutritionToggle
              nutrition100g={nutritionData}
              productData={result}
              ocrText={ingredientsText}
            />
          </TabsContent>
          
          <TabsContent value="flags" className="mt-6">
            <FlagsTab
              ingredientsText={ingredientsText}
              nutrition100g={nutritionData}
              reportId={ocrHash}
              ocrPreview={ingredientsText?.slice(0, 160)}
            />
          </TabsContent>
          
          
          <TabsContent value="suggestions" className="mt-6">
            <PersonalizedSuggestions
              result={result}
              portionGrams={portionInfo.grams}
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

        {/* 💾 FULL-WIDTH SAVE CTA */}
        <SaveCTA
          result={result}
          analysisData={analysisData}
          portionGrams={portionInfo.grams}
          ocrHash={ocrHash}
          onSaved={(logId) => {
            toast({
              title: "Successfully Saved!",
              description: `Report saved with ID: ${logId.slice(0, 8)}...`,
            });
          }}
        />

        {/* 🎯 4. ACTION BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <Button
            onClick={onScanAnother}
            variant="outline"
            className="border-2 border-primary/50 text-primary hover:bg-primary/10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Scan Another
          </Button>

          <Button
            onClick={onClose}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground py-4 px-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
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