import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserPlus, Check, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FriendUIRelation } from '@/hooks/useFriendStatuses';

interface FriendCTAProps {
  userId: string;
  relation: FriendUIRelation;
  requestId?: string;
  variant?: 'default' | 'compact' | 'icon';
  onSendRequest: (userId: string) => void;
  onAcceptRequest: (requestId: string, userId: string) => void;
  onRejectRequest: (requestId: string, userId: string) => void;
  isPending?: boolean;
  isOnCooldown?: boolean;
  isLoading?: boolean;
}

export const FriendCTA: React.FC<FriendCTAProps> = ({
  userId,
  relation,
  requestId,
  variant = 'default',
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  isPending = false,
  isOnCooldown = false,
  isLoading = false
}) => {
  const isCompact = variant === 'compact' || variant === 'icon';
  const isIconOnly = variant === 'icon';

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div 
        className={cn(
          "animate-pulse bg-muted rounded",
          isIconOnly ? "h-6 w-6" : isCompact ? "h-6 w-16" : "h-8 w-20"
        )}
      />
    );
  }

  // Don't render for self or hidden users
  if (relation === 'self' || relation === 'hidden_by_privacy') {
    return null;
  }

  const handleSendRequest = () => {
    if (!isPending && !isOnCooldown) {
      onSendRequest(userId);
    }
  };

  const handleAccept = () => {
    if (requestId && !isPending) {
      onAcceptRequest(requestId, userId);
    }
  };

  const handleReject = () => {
    if (requestId && !isPending) {
      onRejectRequest(requestId, userId);
    }
  };

  switch (relation) {
    case 'friends':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-900/20 dark:border-green-800 cursor-default",
                  isCompact ? "px-2 py-0.5 text-xs" : "px-3 py-1"
                )}
              >
                <Users className={cn("mr-1", isCompact ? "h-3 w-3" : "h-4 w-4")} />
                {!isIconOnly && "Friends ✓"}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>You're friends</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

    case 'outgoing_pending':
      return (
        <Badge 
          variant="outline" 
          className={cn(
            "text-muted-foreground bg-muted/50",
            isCompact ? "px-2 py-0.5 text-xs" : "px-3 py-1"
          )}
          title="Friend request sent"
        >
          {!isIconOnly && "Requested"}
        </Badge>
      );

    case 'incoming_pending':
      return (
        <div className={cn("flex gap-1", isCompact && "flex-col")}>
          <Button
            size={isCompact ? "sm" : "default"}
            variant="default"
            onClick={handleAccept}
            disabled={isPending}
            className={cn(
              "bg-green-600 hover:bg-green-700 text-white",
              isIconOnly ? "p-1 h-6 w-6" : isCompact ? "px-2 py-1 text-xs h-6" : "px-3"
            )}
            title="Accept friend request"
          >
            <Check className={cn(isIconOnly ? "h-3 w-3" : "h-4 w-4", !isIconOnly && isCompact && "mr-1")} />
            {!isIconOnly && (isCompact ? "Accept" : "Accept")}
          </Button>
          <Button
            size={isCompact ? "sm" : "default"}
            variant="outline"
            onClick={handleReject}
            disabled={isPending}
            className={cn(
              "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300",
              isIconOnly ? "p-1 h-6 w-6" : isCompact ? "px-2 py-1 text-xs h-6" : "px-3"
            )}
            title="Reject friend request"
          >
            <X className={cn(isIconOnly ? "h-3 w-3" : "h-4 w-4", !isIconOnly && isCompact && "mr-1")} />
            {!isIconOnly && (isCompact ? "Reject" : "Reject")}
          </Button>
        </div>
      );

    case 'none':
    default:
      return (
        <Button
          size={isCompact ? "sm" : "default"}
          variant="outline"
          onClick={handleSendRequest}
          disabled={isPending || isOnCooldown}
          className={cn(
            "border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300",
            isIconOnly ? "p-1 h-6 w-6" : isCompact ? "px-2 py-1 text-xs h-6" : "px-3"
          )}
          title="Send friend request"
        >
          <UserPlus className={cn(isIconOnly ? "h-3 w-3" : "h-4 w-4", !isIconOnly && "mr-1")} />
          {!isIconOnly && "Add Friend"}
        </Button>
      );
  }
};