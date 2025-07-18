import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ProgressAvatar } from '@/components/analytics/ui/ProgressAvatar';
import { 
  Users, 
  UserPlus, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Crown,
  Medal,
  Award,
  Contact,
  Share2,
  MessageCircle,
  Phone,
  Mail,
  Search,
  Download,
  CheckCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Friend {
  id: number;
  nickname: string;
  avatar: string;
  rank: number;
  trend: 'up' | 'down';
  score: number;
  streak: number;
  weeklyProgress: number;
  isOnline: boolean;
  lastSeen: string;
}

interface FriendsArenaProps {
  friends: Friend[];
}

export const FriendsArena: React.FC<FriendsArenaProps> = ({ friends }) => {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [encouragedFriends, setEncouragedFriends] = useState<Set<number>>(new Set());
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const { toast } = useToast();

  const encourageFriend = (friendId: number, friendName: string) => {
    if (encouragedFriends.has(friendId)) return;
    
    setEncouragedFriends(prev => new Set([...prev, friendId]));
    toast({
      title: "Encouragement Sent! 🔥",
      description: `Your motivation has been sent to ${friendName}`,
    });
    
    // Reset after 30 seconds
    setTimeout(() => {
      setEncouragedFriends(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }, 30000);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2: return <Medal className="h-4 w-4 text-gray-400" />;
      case 3: return <Award className="h-4 w-4 text-amber-600" />;
      default: return null;
    }
  };

  const getRankColor = (rank: number) => {
    if (rank <= 3) return 'text-primary font-bold';
    if (rank <= 5) return 'text-secondary font-semibold';
    return 'text-muted-foreground';
  };

  const requestContacts = async () => {
    setIsLoadingContacts(true);
    try {
      // Simulate contact access (in real app, this would use native APIs)
      setTimeout(() => {
        const mockContacts = [
          { id: 1, name: "Sarah Johnson", phone: "+1234567890", email: "sarah@example.com", hasApp: true },
          { id: 2, name: "Mike Chen", phone: "+1234567891", email: "mike@example.com", hasApp: false },
          { id: 3, name: "Emma Davis", phone: "+1234567892", email: "emma@example.com", hasApp: true },
          { id: 4, name: "Alex Wilson", phone: "+1234567893", email: "alex@example.com", hasApp: false },
        ];
        setContacts(mockContacts);
        setIsLoadingContacts(false);
        toast({
          title: "Contacts Loaded! 📱",
          description: `Found ${mockContacts.length} contacts`,
        });
      }, 2000);
    } catch (error) {
      setIsLoadingContacts(false);
      toast({
        title: "Access Denied",
        description: "Unable to access contacts. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const inviteContact = (contact: any) => {
    toast({
      title: "Invitation Sent! 📤",
      description: `Invited ${contact.name} to join the challenge`,
    });
  };

  return (
    <Card className="overflow-hidden border-2 border-blue-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600" />
            Friends in the Arena
            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {friends.length} Active
            </Badge>
          </div>
          <div className="flex gap-2">
            <Dialog open={showContactsDialog} onOpenChange={setShowContactsDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Contact className="h-4 w-4" />
                  Sync Contacts
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Contact className="h-5 w-5" />
                    Sync Your Contacts
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Find friends who are already using the app and invite others to join the challenge!
                  </p>
                  
                  <Button 
                    onClick={requestContacts} 
                    disabled={isLoadingContacts}
                    className="w-full flex items-center gap-2"
                  >
                    {isLoadingContacts ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Accessing Contacts...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Access Contacts
                      </>
                    )}
                  </Button>

                  {contacts.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search contacts..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {contacts
                            .filter(contact => 
                              contact.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((contact) => (
                              <div key={contact.id} className="flex items-center justify-between p-2 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {contact.name.split(' ').map((n: string) => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-sm">{contact.name}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      {contact.hasApp ? (
                                        <>
                                          <CheckCircle className="h-3 w-3 text-green-500" />
                                          Has App
                                        </>
                                      ) : (
                                        <>
                                          <UserPlus className="h-3 w-3 text-blue-500" />
                                          Invite
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant={contact.hasApp ? "outline" : "default"}
                                  onClick={() => inviteContact(contact)}
                                  className="text-xs"
                                >
                                  {contact.hasApp ? "Add Friend" : "Invite"}
                                </Button>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Friends
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Invite Friends to the Arena
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="flex items-center gap-2 h-16 flex-col">
                      <Share2 className="h-5 w-5" />
                      <span className="text-xs">Share Link</span>
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2 h-16 flex-col">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-xs">Text Invite</span>
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2 h-16 flex-col">
                      <Mail className="h-5 w-5" />
                      <span className="text-xs">Email</span>
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2 h-16 flex-col">
                      <Contact className="h-5 w-5" />
                      <span className="text-xs">Contacts</span>
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Invitation Message Preview:</h4>
                    <p className="text-sm text-muted-foreground italic">
                      "Hey! I'm crushing my health goals in this awesome nutrition challenge. 
                      Want to join me and see who can build the healthiest habits? 🏆💪"
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="flex gap-4 p-6 min-w-max">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex-shrink-0 w-64 p-4 rounded-xl border-2 border-muted bg-background hover:border-primary/40 transition-all duration-300 hover:shadow-lg"
              >
                {/* Online Status & Rank */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getRankIcon(friend.rank)}
                    <Badge variant="outline" className={cn("text-xs", getRankColor(friend.rank))}>
                      #{friend.rank}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      friend.isOnline ? "bg-green-500" : "bg-gray-400"
                    )} />
                    <span className="text-xs text-muted-foreground">
                      {friend.isOnline ? "Online" : friend.lastSeen}
                    </span>
                  </div>
                </div>

                {/* Avatar with Progress */}
                <div className="flex justify-center mb-3">
                  <ProgressAvatar 
                    avatar={friend.avatar}
                    nickname={friend.nickname}
                    weeklyProgress={friend.weeklyProgress}
                    dailyStreak={friend.streak}
                    weeklyStreak={Math.floor(friend.streak / 7)}
                    size="md"
                    showStats={false}
                  />
                </div>

                {/* Friend Info */}
                <div className="text-center mb-3">
                  <h4 className="font-semibold text-sm mb-1">{friend.nickname}</h4>
                  <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span>{friend.streak} streak</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {friend.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span>{friend.score} pts</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Weekly Progress</span>
                    <span className="font-medium">{friend.weeklyProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${friend.weeklyProgress}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={() => encourageFriend(friend.id, friend.nickname)}
                    disabled={encouragedFriends.has(friend.id)}
                    className={cn(
                      "w-full text-sm transition-all duration-300",
                      encouragedFriends.has(friend.id) 
                        ? "bg-green-500 hover:bg-green-600 text-white" 
                        : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    )}
                    size="sm"
                  >
                    {encouragedFriends.has(friend.id) ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Encouraged!
                      </>
                    ) : (
                      <>
                        🔥 Encourage
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Message
                  </Button>
                </div>
              </div>
            ))}

            {/* Add Friends Card */}
            <div className="flex-shrink-0 w-64 p-4 rounded-xl border-2 border-dashed border-muted bg-muted/20 hover:border-primary/40 transition-all duration-300 flex flex-col items-center justify-center min-h-[280px]">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <UserPlus className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Invite More Friends</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    The more friends you have, the more motivation you'll get!
                  </p>
                </div>
                <Button 
                  onClick={() => setShowInviteDialog(true)}
                  className="w-full"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friends
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};