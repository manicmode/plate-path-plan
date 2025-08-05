import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface LoadingErrorFallbackProps {
  error?: Error | string | null;
  onRetry?: () => void;
  onRefresh?: () => void;
  context?: string;
}

export const LoadingErrorFallback: React.FC<LoadingErrorFallbackProps> = ({
  error,
  onRetry,
  onRefresh = () => window.location.reload(),
  context = 'component'
}) => {
  console.error(`🚨 LoadingErrorFallback: ${context} failed`, error);

  const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md w-full">
        <div className="space-y-2">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Loading Error</h2>
          <p className="text-muted-foreground">
            Please refresh the page to continue.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="bg-muted p-3 rounded text-left text-xs max-h-32 overflow-auto">
            <strong>Error in {context}:</strong><br />
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <Button 
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          <Button 
            onClick={onRefresh}
            className="flex items-center gap-2 bg-primary text-primary-foreground"
            size="sm"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  );
};