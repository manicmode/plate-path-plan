import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Plus, X } from 'lucide-react';

interface DetectorUnavailableSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onManualAdd: () => void;
}

export function DetectorUnavailableSheet({
  isOpen,
  onClose,
  onRetry,
  onManualAdd
}: DetectorUnavailableSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Couldn't reach the photo analyzer</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The photo analysis service is temporarily unavailable. You can try again or add your food manually.
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={onRetry}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={onManualAdd}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Food Manually
            </Button>
            
            <Button 
              onClick={onClose}
              className="w-full"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}