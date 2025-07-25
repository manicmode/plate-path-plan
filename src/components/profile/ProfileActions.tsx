
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

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
      <Button onClick={onSave} className={`${isMobile ? 'w-full h-12' : 'flex-1'} gradient-primary`}>
        Save Changes
      </Button>
      <Button 
        variant="outline" 
        onClick={onCancel}
        className={`${isMobile ? 'w-full h-12' : ''} glass-button border-0`}
      >
        Cancel
      </Button>
    </div>
  );
};
