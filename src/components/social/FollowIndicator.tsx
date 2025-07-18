import { Badge } from '@/components/ui/badge';
import { Heart, Users } from 'lucide-react';
import { useFollow } from '@/hooks/useFollow';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface FollowIndicatorProps {
  userId: string;
  className?: string;
  size?: 'sm' | 'default';
}

export const FollowIndicator = ({ 
  userId, 
  className = '',
  size = 'default' 
}: FollowIndicatorProps) => {
  const { user } = useAuth();
  const { getFollowStatus } = useFollow();
  const [followStatus, setFollowStatus] = useState({
    isFollowing: false,
    isFollowedBy: false
  });

  // Don't show for current user
  if (!user || userId === user.id) return null;

  useEffect(() => {
    const loadStatus = async () => {
      const status = await getFollowStatus(userId);
      if (status) {
        setFollowStatus({
          isFollowing: status.isFollowing,
          isFollowedBy: status.isFollowedBy
        });
      }
    };

    loadStatus();
  }, [userId, getFollowStatus]);

  // Show mutual follow indicator
  if (followStatus.isFollowing && followStatus.isFollowedBy) {
    return (
      <Badge 
        variant="secondary" 
        className={`flex items-center gap-1 ${className}`}
        title="Mutual followers"
      >
        <Heart className={`${size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'} fill-current text-red-500`} />
        {size !== 'sm' && 'Mutual'}
      </Badge>
    );
  }

  // Show following indicator
  if (followStatus.isFollowing) {
    return (
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1 ${className}`}
        title="You're following this user"
      >
        <Users className={`${size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'}`} />
        {size !== 'sm' && 'Following'}
      </Badge>
    );
  }

  // Show follows you indicator
  if (followStatus.isFollowedBy) {
    return (
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1 ${className}`}
        title="This user follows you"
      >
        <Users className={`${size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'}`} />
        {size !== 'sm' && 'Follows you'}
      </Badge>
    );
  }

  return null;
};