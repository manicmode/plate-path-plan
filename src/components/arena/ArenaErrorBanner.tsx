import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ArenaErrorBannerProps {
  message?: string;
  onDismiss?: () => void;
}

export const ArenaErrorBanner: React.FC<ArenaErrorBannerProps> = ({ 
  message = 'Arena temporarily unavailable — try again shortly.',
  onDismiss 
}) => {
  return (
    <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
        <span className="text-sm text-warning-foreground flex-grow">{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-warning-foreground/60 hover:text-warning-foreground text-xs"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export function SimpleArenaErrorBanner({ message }: { message: string }) {
  return (
    <div style={{padding:12, margin:'8px 0', border:'1px solid #ddd', borderRadius:8}}>
      <strong>Arena temporarily unavailable.</strong>
      <div style={{marginTop:4}}>{message || 'Please try again shortly.'}</div>
    </div>
  );
}