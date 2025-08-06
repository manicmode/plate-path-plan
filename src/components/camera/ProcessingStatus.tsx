
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ProcessingStatusProps {
  isProcessing: boolean;
  processingStep: string;
  error?: string;
  success?: string;
  showTimeout?: boolean;
}

export const ProcessingStatus = ({ 
  isProcessing, 
  processingStep, 
  error, 
  success, 
  showTimeout 
}: ProcessingStatusProps) => {
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (isProcessing && showTimeout) {
      setCountdown(15);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isProcessing, showTimeout]);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <CheckCircle className="h-5 w-5" />
            <p className="font-medium">{success}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isProcessing) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div className="text-center">
                <p className="text-lg font-medium text-blue-800 dark:text-blue-200">
                  {processingStep || 'Analyzing your meal...'}
                </p>
                {showTimeout && countdown > 0 && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    ⏱️ Processing: {countdown}s remaining (max 15s)
                  </p>
                )}
              </div>
            </div>
            
            <div className="w-full max-w-xs">
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
            
            <p className="text-xs text-blue-700 dark:text-blue-300 text-center max-w-sm">
              Our AI is carefully analyzing your food to provide accurate nutritional information
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
