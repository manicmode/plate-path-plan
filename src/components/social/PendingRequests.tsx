import React from 'react';
import { Check, X, Clock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useFriendSearch } from '@/hooks/useFriendSearch';

export const PendingRequests = () => {
  const { 
    pendingRequests, 
    isLoadingRequests, 
    acceptFriendRequest, 
    rejectFriendRequest 
  } = useFriendSearch();

  const incomingRequests = pendingRequests.filter(req => req.direction === 'incoming');
  const outgoingRequests = pendingRequests.filter(req => req.direction === 'outgoing');

  if (isLoadingRequests) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            Pending Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending friend requests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5" />
          Pending Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Incoming Requests */}
        {incomingRequests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">Incoming Requests</h4>
              <Badge variant="secondary" className="text-xs">
                {incomingRequests.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {incomingRequests.map((request) => (
                <div 
                  key={request.request_id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {request.requester_name?.charAt(0) || '👤'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {request.requester_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {request.requester_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acceptFriendRequest(request.request_id)}
                      className="h-8 w-8 p-0 border-green-200 hover:bg-green-50 hover:border-green-300"
                    >
                      <Check className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectFriendRequest(request.request_id)}
                      className="h-8 w-8 p-0 border-red-200 hover:bg-red-50 hover:border-red-300"
                    >
                      <X className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing Requests */}
        {outgoingRequests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">Outgoing Requests</h4>
              <Badge variant="outline" className="text-xs">
                {outgoingRequests.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {outgoingRequests.map((request) => (
                <div 
                  key={request.request_id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {request.requested_name?.charAt(0) || '👤'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {request.requested_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {request.requested_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};