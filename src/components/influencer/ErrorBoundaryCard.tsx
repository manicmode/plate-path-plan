import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryCardProps {
  title: string;
  error?: string;
  onRetry?: () => void;
}

export const ErrorBoundaryCard: React.FC<ErrorBoundaryCardProps> = ({ 
  title, 
  error, 
  onRetry 
}) => {
  return (
    <Card className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
          {title} Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-red-600 dark:text-red-300">
          {error || 'Something went wrong loading this section. Please try refreshing.'}
        </p>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};