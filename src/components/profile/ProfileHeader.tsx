
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { lockViewportDuring } from '@/utils/scrollLock';

interface User {
  name?: string;
  email?: string;
  dietaryGoals?: string[];
}

interface ProfileHeaderProps {
  user: User | null;
  isEditing: boolean;
  onEditToggle: () => void;
}

const dietaryGoalOptions = [
  { id: 'weight_loss', label: 'Weight Loss' },
  { id: 'muscle_gain', label: 'Muscle Gain' },
  { id: 'maintenance', label: 'Weight Maintenance' },
  { id: 'endurance', label: 'Endurance Training' },
  { id: 'general_health', label: 'General Health' },
];

export const ProfileHeader = ({ user, isEditing, onEditToggle }: ProfileHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
      <Avatar className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'}`}>
        <AvatarFallback className={`${isMobile ? 'text-xl' : 'text-2xl'} gradient-primary text-white`}>
          {user?.name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-900 dark:text-white truncate`}>{user?.name}</h2>
        <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'} truncate`}>{user?.email}</p>
        <div className={`flex flex-wrap gap-1 sm:gap-2 mt-2`}>
          {user?.dietaryGoals?.slice(0, isMobile ? 2 : 5).map(goal => (
            <Badge key={goal} variant="secondary" className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
              {dietaryGoalOptions.find(opt => opt.id === goal)?.label || goal}
            </Badge>
          ))}
          {isMobile && user?.dietaryGoals && user.dietaryGoals.length > 2 && (
            <Badge variant="outline" className="text-xs">+{user.dietaryGoals.length - 2}</Badge>
          )}
        </div>
      </div>
      <Button
        variant={isEditing ? "default" : "outline"}
        onClick={() => lockViewportDuring(() => onEditToggle())}
        size={isMobile ? "sm" : "default"}
        className={isMobile ? 'px-3' : ''}
      >
        <Settings className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-2'}`} />
        {!isMobile && (isEditing ? 'Cancel' : 'Edit')}
      </Button>
    </div>
  );
};
