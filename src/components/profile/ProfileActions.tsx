
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
      <Button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSave();
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
          
          // Store current scroll position
          const currentScrollY = window.scrollY;
          
          onCancel();
          
          // Restore scroll position after DOM update
          requestAnimationFrame(() => {
            window.scrollTo({ top: currentScrollY, behavior: 'instant' });
          });
        }}
        className={`${isMobile ? 'w-full h-12' : ''} glass-button border-0`}
        style={{ touchAction: 'manipulation' }}
      >
        Cancel
      </Button>
    </div>
  );
};
