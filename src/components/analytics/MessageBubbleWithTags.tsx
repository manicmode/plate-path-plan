import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useFriendTagging } from '@/hooks/useFriendTagging';

interface TaggedUser {
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text?: string;
  emoji?: string;
  timestamp: string;
  taggedUsers?: string[];
}

interface MessageBubbleWithTagsProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onTagClick?: (userId: string) => void;
  onJoinChallenge?: (userId: string) => void;
  challengeParticipants?: string[];
}

export const MessageBubbleWithTags = ({
  message,
  isCurrentUser,
  onTagClick,
  onJoinChallenge,
  challengeParticipants = []
}: MessageBubbleWithTagsProps) => {
  const { getFriendById } = useFriendTagging();

  // Parse tagged users from message text
  const parseTaggedUsers = (text: string): TaggedUser[] => {
    if (!text || !message.taggedUsers?.length) return [];

    const tags: TaggedUser[] = [];
    const atRegex = /@(\w+(?:\s+\w+)*)/g;
    let match;

    while ((match = atRegex.exec(text)) !== null) {
      const taggedUserId = message.taggedUsers.find(userId => {
        const friend = getFriendById(userId);
        return friend?.name === match[1];
      });

      if (taggedUserId) {
        tags.push({
          id: taggedUserId,
          name: match[1],
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    return tags;
  };

  // Render message text with clickable tags
  const renderMessageText = () => {
    if (!message.text) return null;

    const tags = parseTaggedUsers(message.text);
    if (!tags.length) return message.text;

    let parts = [];
    let lastIndex = 0;

    // Sort tags by start index
    const sortedTags = [...tags].sort((a, b) => a.startIndex - b.startIndex);

    sortedTags.forEach((tag, index) => {
      // Add text before tag
      if (tag.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {message.text!.slice(lastIndex, tag.startIndex)}
          </span>
        );
      }
      
      // Add clickable tag
      const friend = getFriendById(tag.id);
      const isParticipant = challengeParticipants.includes(tag.id);
      
      parts.push(
        <span key={`tag-${tag.id}`} className="relative inline-block">
          <button
            className="text-primary hover:text-primary/80 font-medium hover:underline"
            onClick={() => onTagClick?.(tag.id)}
          >
            @{tag.name}
          </button>
          {!isParticipant && onJoinChallenge && (
            <Badge 
              variant="secondary" 
              className="ml-1 text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => onJoinChallenge(tag.id)}
            >
              Tap to Join
            </Badge>
          )}
        </span>
      );
      
      lastIndex = tag.endIndex;
    });

    // Add remaining text
    if (lastIndex < message.text.length) {
      parts.push(
        <span key="text-end">
          {message.text.slice(lastIndex)}
        </span>
      );
    }

    return <span>{parts}</span>;
  };

  const timeAgo = formatDistanceToNow(new Date(message.timestamp), { addSuffix: true });

  return (
    <div className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-xs">
          {message.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{message.username}</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        
        <div className={`
          rounded-lg px-3 py-2 max-w-xs break-words
          ${isCurrentUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
          }
        `}>
          {message.emoji ? (
            <span className="text-2xl">{message.emoji}</span>
          ) : (
            <div className="text-sm">
              {renderMessageText()}
            </div>
          )}
        </div>

        {/* Show tagged users info */}
        {message.taggedUsers?.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {message.taggedUsers.map((userId) => {
              const friend = getFriendById(userId);
              const isParticipant = challengeParticipants.includes(userId);
              
              if (!friend) return null;
              
              return (
                <Badge 
                  key={userId}
                  variant={isParticipant ? "default" : "outline"}
                  className="text-xs"
                >
                  {friend.name}
                  {!isParticipant && " (not in challenge)"}
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};