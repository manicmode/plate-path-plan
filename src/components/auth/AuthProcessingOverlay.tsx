import { Loader2 } from 'lucide-react';

export const AuthProcessingOverlay = () => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card rounded-lg p-8 shadow-lg max-w-sm mx-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="font-semibold text-lg">Processing login...</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Please wait while we complete your authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};