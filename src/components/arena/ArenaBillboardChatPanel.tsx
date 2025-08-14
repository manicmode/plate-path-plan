import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
}

interface ArenaBillboardChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ArenaBillboardChatPanel({ isOpen, onClose }: ArenaBillboardChatPanelProps) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };
    checkAuth();
  }, []);

  // Load initial data when panel opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadInitialData();
      
      // Telemetry
      if (process.env.NODE_ENV !== 'production') {
        console.info('arena_billboard_opened');
      }
    }
  }, [isOpen, isAuthenticated]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load latest announcement
      const { data: announcementData, error: announcementError } = await supabase.rpc('my_rank20_latest_announcement');
      if (announcementError) {
        console.error('Error loading announcement:', announcementError);
      } else {
        setAnnouncement(announcementData?.[0] || null);
      }

      // Load initial chat messages
      const { data: chatData, error: chatError } = await supabase.rpc('my_rank20_chat_list', { _limit: 50 });
      if (chatError) {
        console.error('Error loading chat:', chatError);
      } else {
        const reversedMessages = (chatData || []).reverse();
        setChatMessages(reversedMessages);
        setHasMore((chatData || []).length === 50);
        
        // Scroll to bottom after initial load
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!hasMore || chatMessages.length === 0) return;

    try {
      const oldestMessage = chatMessages[0];
      const { data: olderData, error } = await supabase.rpc('my_rank20_chat_list', {
        _limit: 50,
        _before: oldestMessage.created_at
      });

      if (error) {
        console.error('Error loading older messages:', error);
        return;
      }

      const reversedOlder = (olderData || []).reverse();
      setChatMessages(prev => [...reversedOlder, ...prev]);
      setHasMore((olderData || []).length === 50);
    } catch (error) {
      console.error('Error loading older messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase.rpc('my_rank20_chat_post', { _body: newMessage.trim() });
      
      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      // Telemetry
      if (process.env.NODE_ENV !== 'production') {
        console.info('arena_chat_message_sent', { length: newMessage.trim().length });
      }

      // Clear input
      setNewMessage('');
      
      // Reload recent messages to show the new one
      const { data: recentData } = await supabase.rpc('my_rank20_chat_list', { _limit: 10 });
      if (recentData) {
        const reversedRecent = recentData.reverse();
        setChatMessages(prev => {
          // Merge and deduplicate
          const combined = [...prev];
          reversedRecent.forEach(msg => {
            if (!combined.find(existing => existing.id === msg.id)) {
              combined.push(msg);
            }
          });
          return combined;
        });
        
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Billboard & Chat
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Sign in to participate in the Billboard & Chat.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Billboard & Chat
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Announcement Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-4 w-4" />
                Latest Announcement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ) : announcement ? (
                <div>
                  {announcement.title && (
                    <h4 className="font-medium mb-2">{announcement.title}</h4>
                  )}
                  <p className="text-sm text-muted-foreground mb-2">{announcement.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No announcements yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Chat Section */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Group Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Messages */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
                <div className="space-y-3">
                  {hasMore && chatMessages.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={loadOlderMessages}
                      className="w-full"
                    >
                      Load older messages
                    </Button>
                  )}
                  
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded w-1/4 mb-1"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-8">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            User {message.user_id.slice(-6)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{message.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Send Message */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || isSending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}