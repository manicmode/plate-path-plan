
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { withFrozenScroll } from '@/utils/freezeScroll';

interface ProfileActionsProps {
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const ProfileActions = ({ isEditing, onSave, onCancel }: ProfileActionsProps) => {
  const isMobile = useIsMobile();

  if (!isEditing) return null;

  return (
    <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-3'} animate-slide-up`} style={{ animationDelay: '500ms' }}>
      <Button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          withFrozenScroll(() => onSave());
        }} 
        className={`${isMobile ? 'w-full h-12' : 'flex-1'} gradient-primary`}
        style={{ touchAction: 'manipulation' }}
      >
        Save Changes
      </Button>
      <Button 
        variant="outline" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          withFrozenScroll(() => onCancel());
        }}
        className={`${isMobile ? 'w-full h-12' : ''} glass-button border-0`}
        style={{ touchAction: 'manipulation' }}
      >
        Cancel
      </Button>
    </div>
  );
};
