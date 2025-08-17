import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, UserPlus, Users } from 'lucide-react';
import { useFriendRequests, type FriendRequest } from '@/hooks/useFriendRequests';
import { useFriendActions } from '@/hooks/useFriendActions';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

function RequestSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b last:border-b-0">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

function RequestItem({ 
  request, 
  type, 
  onAccept, 
  onReject, 
  onCancel, 
  isPending 
}: {
  request: FriendRequest;
  type: 'incoming' | 'outgoing';
  onAccept?: (requestId: string, userId: string) => void;
  onReject?: (requestId: string, userId: string) => void;
  onCancel?: (requestId: string, userId: string) => void;
  isPending: boolean;
}) {
  const profile = type === 'incoming' ? request.user_profile : request.friend_profile;
  const targetUserId = type === 'incoming' ? request.user_id : request.friend_id;
  
  const displayName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : 'Unknown User';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex items-center gap-3 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <Avatar className="w-12 h-12">
        <AvatarImage src={profile?.avatar_url} alt={displayName} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">
          {displayName}
        </h3>
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
        </p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        {type === 'incoming' && (
          <>
            <Button
              size="sm"
              onClick={() => onAccept?.(request.id, targetUserId)}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject?.(request.id, targetUserId)}
              disabled={isPending}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </>
        )}
        
        {type === 'outgoing' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel?.(request.id, targetUserId)}
            disabled={isPending}
            className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ type }: { type: 'incoming' | 'outgoing' }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        {type === 'incoming' ? (
          <UserPlus className="h-8 w-8 text-muted-foreground" />
        ) : (
          <Users className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        No {type} requests
      </h3>
      <p className="text-muted-foreground max-w-sm mx-auto">
        {type === 'incoming' 
          ? "You don't have any pending friend requests right now."
          : "You haven't sent any friend requests that are still pending."
        }
      </p>
    </div>
  );
}

export default function Friends() {
  const [activeTab, setActiveTab] = useState('incoming');
  const { incomingRequests, outgoingRequests, loading, error, refresh } = useFriendRequests();
  const { acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, isPending } = useFriendActions({
    onStatusUpdate: () => {
      // Refresh the requests list when status updates
      refresh();
    }
  });

  const handleAccept = async (requestId: string, userId: string) => {
    await acceptFriendRequest(requestId, userId);
  };

  const handleReject = async (requestId: string, userId: string) => {
    await rejectFriendRequest(requestId, userId);
  };

  const handleCancel = async (requestId: string, userId: string) => {
    await cancelFriendRequest(requestId, userId);
  };

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Friend Requests</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Friend Requests</h1>
      
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incoming" className="relative">
              Incoming
              {incomingRequests.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                  {incomingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="relative">
              Outgoing
              {outgoingRequests.length > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                  {outgoingRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <CardContent className="p-0">
            <TabsContent value="incoming" className="mt-0">
              {loading ? (
                <div className="divide-y">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <RequestSkeleton key={i} />
                  ))}
                </div>
              ) : incomingRequests.length > 0 ? (
                <div className="divide-y">
                  {incomingRequests.map((request) => (
                    <RequestItem
                      key={request.id}
                      request={request}
                      type="incoming"
                      onAccept={handleAccept}
                      onReject={handleReject}
                      isPending={isPending(request.user_id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState type="incoming" />
              )}
            </TabsContent>
            
            <TabsContent value="outgoing" className="mt-0">
              {loading ? (
                <div className="divide-y">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <RequestSkeleton key={i} />
                  ))}
                </div>
              ) : outgoingRequests.length > 0 ? (
                <div className="divide-y">
                  {outgoingRequests.map((request) => (
                    <RequestItem
                      key={request.id}
                      request={request}
                      type="outgoing"
                      onCancel={handleCancel}
                      isPending={isPending(request.friend_id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState type="outgoing" />
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}