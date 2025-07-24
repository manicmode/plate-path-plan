import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, UserMinus, Loader2, Heart } from 'lucide-react';
import { useFollow } from '@/hooks/useFollow';
import { useAuth } from '@/contexts/auth';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  userId: string;
  username?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  showCounts?: boolean;
  showMutualIndicator?: boolean;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export const FollowButton = ({
  userId,
  username = 'user',
  variant = 'default',
  size = 'default',
  showCounts = false,
  showMutualIndicator = true,
  className = '',
  onFollowChange
}: FollowButtonProps) => {
  const { user } = useAuth();
  const { playFriendAdded } = useSound();
  const { 
    isLoading, 
    getFollowStatus, 
    followUser, 
    unfollowUser 
  } = useFollow();
  
  const [followStatus, setFollowStatus] = useState({
    isFollowing: false,
    isFollowedBy: false,
    followersCount: 0,
    followingCount: 0
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Don't show button for current user
  if (!user || userId === user.id) return null;

  // Load follow status
  useEffect(() => {
    const loadStatus = async () => {
      const status = await getFollowStatus(userId);
      if (status) {
        setFollowStatus(status);
      }
    };

    loadStatus();
  }, [userId, getFollowStatus]);

  const handleToggleFollow = async () => {
    setIsUpdating(true);
    
    let success = false;
    if (followStatus.isFollowing) {
      success = await unfollowUser(userId);
    } else {
      success = await followUser(userId);
    }

    if (success) {
      const newStatus = {
        ...followStatus,
        isFollowing: !followStatus.isFollowing,
        followersCount: followStatus.isFollowing 
          ? followStatus.followersCount - 1 
          : followStatus.followersCount + 1
      };
      setFollowStatus(newStatus);
      onFollowChange?.(newStatus.isFollowing);
      
      // Play friend added sound when following someone
      if (newStatus.isFollowing) {
        playFriendAdded();
      }
    }
    
    setIsUpdating(false);
  };

  const getButtonText = () => {
    if (followStatus.isFollowing) {
      return followStatus.isFollowedBy ? 'Following' : 'Following';
    } else {
      return followStatus.isFollowedBy ? 'Follow Back' : 'Follow';
    }
  };

  const getButtonIcon = () => {
    if (isUpdating) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    if (followStatus.isFollowing) {
      return <UserMinus className="h-4 w-4" />;
    } else {
      return <UserPlus className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant={followStatus.isFollowing ? "outline" : variant}
        size={size}
        onClick={handleToggleFollow}
        disabled={isLoading || isUpdating}
        className={cn(
          "transition-all duration-200",
          followStatus.isFollowing && "hover:border-destructive hover:text-destructive"
        )}
        aria-label={`${getButtonText()} ${username}`}
      >
        {getButtonIcon()}
        {size !== 'sm' && (
          <span className="ml-1">{getButtonText()}</span>
        )}
      </Button>

      {/* Mutual follow indicator */}
      {showMutualIndicator && followStatus.isFollowing && followStatus.isFollowedBy && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Heart className="h-3 w-3 fill-current text-red-500" />
          Mutual
        </Badge>
      )}

      {/* Follow counts */}
      {showCounts && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{followStatus.followersCount} followers</span>
          <span>•</span>
          <span>{followStatus.followingCount} following</span>
        </div>
      )}
    </div>
  );
};