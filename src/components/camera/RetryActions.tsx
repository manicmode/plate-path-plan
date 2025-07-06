
import { Button } from '@/components/ui/button';
import { Camera, Mic, Edit3, RotateCcw } from 'lucide-react';

interface RetryActionsProps {
  onRetryPhoto?: () => void;
  onRetryVoice?: () => void;
  onEditManually?: () => void;
  onStartOver?: () => void;
  disabled?: boolean;
}

export const RetryActions = ({
  onRetryPhoto,
  onRetryVoice,
  onEditManually,
  onStartOver,
  disabled = false
}: RetryActionsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {onRetryPhoto && (
        <Button 
          onClick={onRetryPhoto} 
          disabled={disabled}
          variant="outline" 
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          Try Photo Again
        </Button>
      )}
      
      {onRetryVoice && (
        <Button 
          onClick={onRetryVoice} 
          disabled={disabled}
          variant="outline" 
          className="flex items-center gap-2"
        >
          <Mic className="h-4 w-4" />
          Try Voice Again
        </Button>
      )}
      
      {onEditManually && (
        <Button 
          onClick={onEditManually} 
          disabled={disabled}
          variant="outline" 
          className="flex items-center gap-2"
        >
          <Edit3 className="h-4 w-4" />
          Edit Manually
        </Button>
      )}
      
      {onStartOver && (
        <Button 
          onClick={onStartOver} 
          disabled={disabled}
          variant="outline" 
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Start Over
        </Button>
      )}
    </div>
  );
};
