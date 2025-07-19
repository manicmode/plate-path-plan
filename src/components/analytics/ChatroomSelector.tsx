
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageCircle, Users, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Chatroom {
  id: string;
  name: string;
  type: 'public' | 'private';
  participantCount: number;
  unreadCount?: number;
}

interface ChatroomSelectorProps {
  chatrooms: Chatroom[];
  activeChatroomId?: string;
  onSelectChatroom: (chatroomId: string) => void;
}

export const ChatroomSelector = ({ 
  chatrooms, 
  activeChatroomId, 
  onSelectChatroom 
}: ChatroomSelectorProps) => {
  const [open, setOpen] = useState(false);

  const activeChatroom = chatrooms.find(room => room.id === activeChatroomId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline" 
          size="default"
          className="h-10 px-4 gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 font-medium"
        >
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {activeChatroom ? activeChatroom.name.slice(0, 20) + '...' : 'Select Chatroom'}
          </span>
          <ChevronDown className="h-4 w-4 text-primary" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Challenge Chatrooms</h4>
          </div>
          
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {chatrooms.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active challenge chatrooms</p>
                  <p className="text-xs">Join a challenge to access chat!</p>
                </div>
              ) : (
                chatrooms.map((room) => (
                  <div
                    key={room.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                      activeChatroomId === room.id 
                        ? "border-primary bg-primary/5" 
                        : "border-muted"
                    )}
                    onClick={() => {
                      onSelectChatroom(room.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm truncate">{room.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={room.type === 'private' ? 'secondary' : 'outline'} 
                            className="text-xs h-4"
                          >
                            {room.type === 'private' ? 'Private' : 'Public'}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {room.participantCount}
                          </div>
                        </div>
                      </div>
                      {room.unreadCount && room.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs h-5 w-5 p-0 flex items-center justify-center">
                          {room.unreadCount > 99 ? '99+' : room.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
