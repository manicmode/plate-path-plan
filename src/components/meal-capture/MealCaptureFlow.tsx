/**
 * Complete Meal Capture Flow Handler
 * REV: MEAL_REV_SBX=2025-08-31T17:55Z-r2
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, AlertCircle, ScanBarcode, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { MealItem } from '@/features/meal-capture/types';
import { isMealPhoto } from '@/features/meal-capture/isMealPhoto';
import { detectMealItems } from '@/features/meal-capture/mealDetect';
import { MealCaptureReview } from '@/features/meal-capture/MealCaptureReview';
import { MealReportStack } from '@/features/meal-capture/MealReportStack';

const MEAL_REV_SBX = "2025-08-31T17:55Z-r2";

interface MealCaptureFlowProps {
  imageUrl: string;
  onExit: () => void;
}

export const MealCaptureFlow: React.FC<MealCaptureFlowProps> = ({
  imageUrl,
  onExit
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'analyzing' | 'not_meal' | 'review' | 'reports'>('analyzing');
  const [detectedItems, setDetectedItems] = useState<MealItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<MealItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Process the captured image
  useEffect(() => {
    processMealImage();
  }, [imageUrl]);

  const processMealImage = async () => {
    try {
      setStep('analyzing');
      
      // Convert image URL to canvas for analysis
      const canvas = await imageUrlToCanvas(imageUrl);
      
      // Step 1: Check if this is a meal photo
      const gateResult = await isMealPhoto(canvas);
      
      if (!gateResult.isMeal) {
        setStep('not_meal');
        return;
      }
      
      // Step 2: Detect meal items
      const items = await detectMealItems(canvas);
      
      if (items.length === 0) {
        setError('No food items detected in the image');
        setStep('not_meal');
        return;
      }
      
      setDetectedItems(items);
      setStep('review');
      
    } catch (error) {
      console.error('[MEAL][FLOW] Error processing image:', error);
      setError('Failed to analyze the image');
      setStep('not_meal');
    }
  };

  const imageUrlToCanvas = (url: string): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleShowReports = (items: MealItem[]) => {
    setSelectedItems(items);
    setStep('reports');
  };

  const handleRetake = () => {
    // Go back to photo capture
    navigate('/scan');
  };

  const handleGoToBarcode = () => {
    navigate('/scan');
    // The scan hub will open the barcode scanner
  };

  const handleManualEntry = () => {
    navigate('/scan');
    // The scan hub will open manual entry
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {step === 'analyzing' && (
        <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Analyzing Your Meal</h2>
              <p className="text-muted-foreground">
                Detecting food items and estimating portions...
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'not_meal' && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-md">
            <div className="text-center p-6">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">
                {error || "We couldn't detect a meal"}
              </h2>
              <p className="text-muted-foreground mb-6">
                Use <strong>Scan Barcode</strong> or <strong>Manual Entry</strong> for packaged foods. 
                Take Photo is for meals only.
              </p>
              
              <div className="flex flex-col gap-3">
                <Button onClick={handleGoToBarcode} className="gap-2">
                  <ScanBarcode className="h-4 w-4" />
                  Scan Barcode
                </Button>
                <Button variant="outline" onClick={handleManualEntry} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Manual Entry
                </Button>
                <Button variant="ghost" onClick={onExit} size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Exit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {step === 'review' && (
        <MealCaptureReview
          items={detectedItems}
          onShowReports={handleShowReports}
          onRetake={handleRetake}
          onExit={onExit}
        />
      )}

      {step === 'reports' && (
        <MealReportStack
          items={selectedItems}
          onExit={onExit}
          onBack={() => setStep('review')}
        />
      )}
    </div>
  );
};