/**
 * Meal Capture Wizard - Isolated meal photo pipeline
 * MEAL_REV=2025-08-31T20:55Z-r3
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, X, ScanBarcode, Keyboard, AlertCircle, Sparkles } from 'lucide-react';
import { PhotoCaptureModal } from '@/components/scan/PhotoCaptureModal';
import { MealReportStack, MealReport } from './MealReportStack';
import { debugLog } from './isMealCaptureMode';
import { buildLogPrefillFromMeal, HealthAnalysisResult } from './buildLogPrefillFromMeal';
import { LogPrefill } from '@/lib/health/logPrefill';
import { toast } from 'sonner';

export interface DetectedItem {
  id: string;
  nameHypothesis: string;
  bbox: { x: number; y: number; w: number; h: number };
  cropUrl: string;
  portionGramsEst?: number;
  confidence: number;
}

interface MealCaptureWizardProps {
  onExit: () => void;
  onHandOffToConfirm: (prefill: LogPrefill) => void;
}

type FlowStep = 'capture' | 'classify' | 'detect' | 'select' | 'analyze' | 'reports' | 'packaged_gate';

export function MealCaptureWizard({ onExit, onHandOffToConfirm }: MealCaptureWizardProps) {
  const [step, setStep] = useState<FlowStep>('capture');
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reports, setReports] = useState<MealReport[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  React.useEffect(() => {
    debugLog('CAMERA][ENTER');
  }, []);

  // Mock meal classification - heuristics for meal vs packaged
  const classifyImage = useCallback(async (imageUrl: string): Promise<'meal' | 'packaged'> => {
    // Simplified heuristics - in real implementation, this would use AI
    // For now, assume most photos are meals unless clear packaged indicators
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
    
    const isMeal = Math.random() > 0.3; // 70% chance of meal for demo
    const classification = isMeal ? 'meal' : 'packaged';
    
    debugLog('CLASSIFY', { kind: classification });
    return classification;
  }, []);

  // Mock item detection
  const detectItems = useCallback(async (imageUrl: string): Promise<DetectedItem[]> => {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing

    // Mock detected items
    const mockItems: DetectedItem[] = [
      {
        id: 'item1',
        nameHypothesis: 'Grilled chicken breast',
        bbox: { x: 100, y: 50, w: 150, h: 100 },
        cropUrl: imageUrl, // In real implementation, this would be cropped
        portionGramsEst: 120,
        confidence: 0.85
      },
      {
        id: 'item2', 
        nameHypothesis: 'Rice pilaf',
        bbox: { x: 50, y: 160, w: 200, h: 80 },
        cropUrl: imageUrl,
        portionGramsEst: 80,
        confidence: 0.75
      },
      {
        id: 'item3',
        nameHypothesis: 'Mixed vegetables',
        bbox: { x: 200, y: 100, w: 120, h: 90 },
        cropUrl: imageUrl,
        portionGramsEst: 60,
        confidence: 0.70
      }
    ];

    debugLog('DETECT', { count: mockItems.length });
    return mockItems;
  }, []);

  // Mock analysis for selected items
  const analyzeItems = useCallback(async (items: DetectedItem[]): Promise<MealReport[]> => {
    const newReports: MealReport[] = [];

    for (const item of items) {
      debugLog('ANALYZE][BEGIN', { id: item.id, name: item.nameHypothesis });
      
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock health analysis result
      const analysis: HealthAnalysisResult = {
        itemName: item.nameHypothesis,
        healthScore: Math.floor(Math.random() * 4) + 6, // 6-10 range
        nutritionData: {
          calories: Math.floor(Math.random() * 200) + 100,
          protein_g: Math.floor(Math.random() * 25) + 5,
          carbs_g: Math.floor(Math.random() * 30) + 10,
          fat_g: Math.floor(Math.random() * 15) + 2,
          fiber_g: Math.floor(Math.random() * 5) + 1,
          sugar_g: Math.floor(Math.random() * 10) + 2,
          sodium_mg: Math.floor(Math.random() * 300) + 50,
        },
        healthProfile: {},
        personalizedWarnings: [
          'High in sodium - consider reducing salt',
          'Good protein source for muscle building'
        ],
        suggestions: [
          'Pair with leafy greens for more nutrients',
          'Great choice for post-workout meal'
        ],
        overallRating: 'Nutritious and balanced',
        analysisData: {
          source: 'meal-capture'
        }
      };

      const report: MealReport = {
        id: item.id,
        itemName: item.nameHypothesis,
        analysis,
        cropUrl: item.cropUrl
      };

      newReports.push(report);
      debugLog('ANALYZE][DONE', { id: item.id, name: item.nameHypothesis });
      debugLog('STACK][PUSH', { id: item.id, remaining: newReports.length });
    }

    return newReports;
  }, []);

  const handleCapture = async (imageBase64: string) => {
    debugLog('CAPTURE][SHOT');
    
    // Convert to HTTP URL (blob)
    const response = await fetch(imageBase64);
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    
    setCapturedImageUrl(imageUrl);
    setStep('classify');
    setIsProcessing(true);
    setProcessingStep('Analyzing image type...');

    try {
      const classification = await classifyImage(imageUrl);
      
      if (classification === 'packaged') {
        setStep('packaged_gate');
        return;
      }

      // Proceed with meal detection
      setStep('detect');
      setProcessingStep('Detecting meal items...');
      
      const items = await detectItems(imageUrl);
      setDetectedItems(items);
      
      // Auto-select all items initially
      setSelectedItems(new Set(items.map(i => i.id)));
      setStep('select');
      
    } catch (error) {
      console.error('[MEAL] Processing error:', error);
      toast.error('Failed to analyze image. Please try again.');
      setStep('capture');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleAnalyzeSelected = async () => {
    const itemsToAnalyze = detectedItems.filter(item => selectedItems.has(item.id));
    debugLog('SELECT', { picked: itemsToAnalyze.length });
    
    if (itemsToAnalyze.length === 0) {
      toast.error('Please select at least one item to analyze');
      return;
    }

    setStep('analyze');
    setIsProcessing(true);
    setProcessingStep('Analyzing selected items...');

    try {
      const newReports = await analyzeItems(itemsToAnalyze);
      setReports(newReports);
      setStep('reports');
    } catch (error) {
      console.error('[MEAL] Analysis error:', error);
      toast.error('Failed to analyze items. Please try again.');
      setStep('select');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleRemoveReport = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const handleExit = () => {
    debugLog('EXIT');
    onExit();
  };

  // Processing overlay
  if (isProcessing) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 mt-8">
            Meal Analysis
          </h1>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-lg font-medium">{processingStep}</p>
            <p className="text-sm text-muted-foreground">
              This may take a few moments...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 mt-8">
          Meal Capture
        </h1>
        <p className="text-muted-foreground">
          Take a photo to analyze your meal
        </p>
      </div>

      {step === 'capture' && (
        <PhotoCaptureModal
          open={true}
          onOpenChange={(open) => {
            if (!open) handleExit();
          }}
          onCapture={handleCapture}
          onManualFallback={handleExit}
          mode="meal-capture"
        />
      )}

      {step === 'packaged_gate' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Product Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We couldn't detect a meal. For branded products use "Scan barcode" or "Manual entry". 
              "Take Photo" is designed for meals and individual food items.
            </p>
            
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" onClick={() => window.location.href = '/scan'}>
                <ScanBarcode className="h-4 w-4 mr-2" />
                Scan Barcode Instead
              </Button>
              
              <Button variant="outline" className="w-full" onClick={() => window.location.href = '/scan'}>
                <Keyboard className="h-4 w-4 mr-2" />
                Manual Entry Instead
              </Button>
              
              <Button variant="ghost" className="w-full" onClick={handleExit}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Items to Analyze</CardTitle>
            <p className="text-sm text-muted-foreground">
              We detected {detectedItems.length} items. Select which ones to analyze:
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image preview */}
            {capturedImageUrl && (
              <div className="w-full h-48 rounded-lg overflow-hidden bg-muted">
                <img 
                  src={capturedImageUrl} 
                  alt="Captured meal"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Item selection grid */}
            <div className="space-y-2">
              {detectedItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedItems.has(item.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleItemToggle(item.id)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{item.nameHypothesis}</h4>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>~{item.portionGramsEst}g</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(item.confidence * 100)}% confident
                      </Badge>
                    </div>
                  </div>
                  
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedItems.has(item.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground'
                  }`}>
                    {selectedItems.has(item.id) && <span className="text-xs">✓</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAnalyzeSelected} className="flex-1">
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Selected ({selectedItems.size})
              </Button>
              <Button variant="outline" onClick={handleExit}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'reports' && (
        <MealReportStack
          reports={reports}
          onHandOffToConfirm={onHandOffToConfirm}
          onRemoveReport={handleRemoveReport}
          onExit={handleExit}
        />
      )}
    </div>
  );
}