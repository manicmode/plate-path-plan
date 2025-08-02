import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ContactIcon, Users, MessageSquare, UserPlus, Loader2, Shield } from 'lucide-react';
import { useContactSync } from '@/hooks/useContactSync';

export const ContactSync = () => {
  const [showFriends, setShowFriends] = useState(false);
  const {
    isLoading,
    hasPermission,
    friends,
    nonFriends,
    requestContactPermission,
    syncContacts,
    inviteContact
  } = useContactSync();

  const handleSyncContacts = async () => {
    if (hasPermission === null) {
      const granted = await requestContactPermission();
      if (granted) {
        await syncContacts();
        setShowFriends(true);
      }
    } else if (hasPermission) {
      await syncContacts();
      setShowFriends(true);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Find Friends
        </CardTitle>
        <CardDescription>
          Discover which of your contacts are already using VOYAGE
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showFriends && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Your contacts are securely hashed before upload
            </div>
            
            <Button 
              onClick={handleSyncContacts}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Contacts...
                </>
              ) : (
                <>
                  <ContactIcon className="mr-2 h-4 w-4" />
                  Sync Contacts
                </>
              )}
            </Button>
          </>
        )}

        {showFriends && (
          <div className="space-y-6">
            {/* Friends Section */}
            {friends.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">Friends on VOYAGE</h3>
                  <Badge variant="secondary">{friends.length}</Badge>
                </div>
                
                <div className="space-y-2">
                  {friends.map((friend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {friend.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{friend.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {friend.email || friend.phone}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add Friend
                        </Button>
                        <Button size="sm">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Challenge
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {friends.length > 0 && nonFriends.length > 0 && <Separator />}

            {/* Non-Friends Section */}
            {nonFriends.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">Invite to VOYAGE</h3>
                  <Badge variant="outline">{nonFriends.length}</Badge>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nonFriends.slice(0, 10).map((contact, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {contact.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {contact.emails?.[0] || contact.phoneNumbers?.[0] || 'No contact info'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => inviteContact(contact)}
                      >
                        Invite
                      </Button>
                    </div>
                  ))}
                  {nonFriends.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      And {nonFriends.length - 10} more contacts...
                    </p>
                  )}
                </div>
              </div>
            )}

            {friends.length === 0 && nonFriends.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No contacts found or none of your contacts use VOYAGE yet.</p>
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={handleSyncContacts}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                'Refresh Contacts'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};