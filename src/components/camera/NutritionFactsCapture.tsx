import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Check, X, RotateCcw } from 'lucide-react';
import { callOCRFunction } from '@/lib/ocrClient';
import { toast } from 'sonner';

interface NutritionFactsCaptureProps {
  onSuccess: (grams: number) => void;
  onCancel: () => void;
  onRetry: () => void;
}

export function NutritionFactsCapture({ onSuccess, onCancel, onRetry }: NutritionFactsCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hasNutritionFacts, setHasNutritionFacts] = useState(false);

  const validateNutritionImage = async (imageDataUrl: string): Promise<boolean> => {
    try {
      setIsValidating(true);
      
      // Convert data URL to blob for OCR
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // Quick OCR pre-pass to validate content
      const ocrResult = await callOCRFunction(blob, { withAuth: true });
      const text = ocrResult.summary?.text_joined || '';
      
      // Check for nutrition facts keywords
      const hasKeywords = /nutrition\s*facts|serving\s*size/i.test(text);
      console.log('[NUTRITION_CAPTURE] Validation:', { hasKeywords, textLength: text.length });
      
      return hasKeywords;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleCapture = async () => {
    try {
      // Access camera and capture image
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Stop camera
      stream.getTracks().forEach(track => track.stop());
      
      setCapturedImage(imageDataUrl);
      setIsCapturing(false);
      
      // Validate the captured image
      const isValid = await validateNutritionImage(imageDataUrl);
      setHasNutritionFacts(isValid);
      
      if (!isValid) {
        toast.error('Nutrition Facts not detected. Please retake the photo.');
      }
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to capture image. Please try again.');
    }
  };

  const handleConfirm = async () => {
    if (!capturedImage || !hasNutritionFacts) return;
    
    try {
      // Process the nutrition facts image with full OCR
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const ocrResult = await callOCRFunction(blob, { withAuth: true });
      const text = ocrResult.summary?.text_joined || '';
      
      // Parse serving size from the text
      const { extractServingGramsFromText } = await import('@/lib/nutrition/parsers/nutritionFactsParser');
      const grams = extractServingGramsFromText(text);
      
      if (grams && grams >= 5 && grams <= 250) {
        console.log('[NUTRITION_CAPTURE] Success:', { grams });
        onSuccess(grams);
      } else {
        toast.error('Could not extract serving size. Please try again.');
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process nutrition facts. Please try again.');
    }
  };

  useEffect(() => {
    if (isCapturing) {
      handleCapture();
    }
  }, [isCapturing]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center space-y-4">
          <h2 className="text-xl font-semibold">Nutrition Facts Required</h2>
          <p className="text-sm text-muted-foreground">
            Photograph the Nutrition Facts panel. Make sure "Serving size" is visible and readable.
          </p>
          
          {isCapturing ? (
            <div className="space-y-4">
              <Camera className="mx-auto h-16 w-16 text-muted-foreground animate-pulse" />
              <p>Accessing camera...</p>
            </div>
          ) : capturedImage ? (
            <div className="space-y-4">
              <img 
                src={capturedImage} 
                alt="Captured nutrition facts" 
                className="w-full h-48 object-cover rounded-lg"
              />
              
              {isValidating ? (
                <p className="text-sm">Validating nutrition facts...</p>
              ) : hasNutritionFacts ? (
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="text-sm">Nutrition Facts detected</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 text-red-600">
                  <X className="h-5 w-5" />
                  <span className="text-sm">Nutrition Facts not found</span>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapturedImage(null);
                    setIsCapturing(true);
                    setHasNutritionFacts(false);
                  }}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                
                {hasNutritionFacts && (
                  <Button onClick={handleConfirm} className="flex-1">
                    <Check className="h-4 w-4 mr-2" />
                    Use This Photo
                  </Button>
                )}
              </div>
            </div>
          ) : null}
          
          <div className="flex space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button variant="outline" onClick={onRetry} className="flex-1">
              Try Different Product
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}