
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
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                {processingStep || 'Processing...'}
              </p>
              {showTimeout && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  ⏱️ Maximum processing time: 25 seconds
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
