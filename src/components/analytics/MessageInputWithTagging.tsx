import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile } from 'lucide-react';
import { FriendSelector } from './FriendSelector';
import { useFriendTagging } from '@/hooks/useFriendTagging';

interface Friend {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface TaggedUser {
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

interface MessageInputWithTaggingProps {
  value: string;
  onChange: (value: string, taggedUsers?: TaggedUser[]) => void;
  onSend: (message: string, taggedUsers?: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  showEmojiReactions?: boolean;
  onEmojiClick?: (emoji: string) => void;
  className?: string;
  useSmartRecommendations?: boolean;
  excludeUserIds?: string[];
}

export const MessageInputWithTagging = ({
  value,
  onChange,
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  showEmojiReactions = true,
  onEmojiClick,
  className = "",
  useSmartRecommendations = true,
  excludeUserIds = []
}: MessageInputWithTaggingProps) => {
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ top: 0, left: 0 });
  const [currentAtQuery, setCurrentAtQuery] = useState('');
  const [atStartIndex, setAtStartIndex] = useState(-1);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { getFriendById } = useFriendTagging();

  const quickEmojis = ['🔥', '💪', '😅', '😂', '👏', '❤️'];

  // Handle @ symbol detection and friend selector
  const handleInputChange = (newValue: string) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    
    // Find @ symbol before cursor
    let atIndex = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (newValue[i] === '@') {
        atIndex = i;
        break;
      }
      if (newValue[i] === ' ') {
        break;
      }
    }

    if (atIndex !== -1) {
      // Extract query after @
      const query = newValue.slice(atIndex + 1, cursorPosition);
      setCurrentAtQuery(query);
      setAtStartIndex(atIndex);
      
      // Position selector near cursor
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setSelectorPosition({
          top: rect.top,
          left: rect.left + (atIndex * 8) // Approximate character width
        });
        setShowFriendSelector(true);
      }
    } else {
      setShowFriendSelector(false);
      setCurrentAtQuery('');
      setAtStartIndex(-1);
    }

    onChange(newValue, taggedUsers);
  };

  // Handle friend selection
  const handleSelectFriend = (friend: Friend) => {
    if (atStartIndex === -1) return;

    const beforeAt = value.slice(0, atStartIndex);
    const afterQuery = value.slice(atStartIndex + currentAtQuery.length + 1);
    const friendTag = `@${friend.name}`;
    const newValue = beforeAt + friendTag + afterQuery;

    // Update tagged users
    const newTaggedUser: TaggedUser = {
      id: friend.id,
      name: friend.name,
      startIndex: atStartIndex,
      endIndex: atStartIndex + friendTag.length
    };

    // Remove any overlapping tags and add new one
    const updatedTaggedUsers = taggedUsers
      .filter(tag => tag.endIndex <= atStartIndex || tag.startIndex >= atStartIndex + friendTag.length)
      .concat([newTaggedUser]);

    setTaggedUsers(updatedTaggedUsers);
    onChange(newValue, updatedTaggedUsers);
    setShowFriendSelector(false);

    // Focus back to input and position cursor after tag
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = atStartIndex + friendTag.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle sending message
  const handleSend = () => {
    if (!value.trim()) return;
    
    const userIds = taggedUsers.map(tag => tag.id);
    onSend(value, userIds);
    setTaggedUsers([]);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSend();
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render message with highlighted tags
  const renderMessagePreview = () => {
    if (!taggedUsers.length || !value) return null;

    let parts = [];
    let lastIndex = 0;

    // Sort tags by start index
    const sortedTags = [...taggedUsers].sort((a, b) => a.startIndex - b.startIndex);

    sortedTags.forEach((tag) => {
      // Add text before tag
      if (tag.startIndex > lastIndex) {
        parts.push(value.slice(lastIndex, tag.startIndex));
      }
      
      // Add highlighted tag
      parts.push(
        <span key={tag.id} className="bg-primary/20 text-primary px-1 rounded">
          {value.slice(tag.startIndex, tag.endIndex)}
        </span>
      );
      
      lastIndex = tag.endIndex;
    });

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(value.slice(lastIndex));
    }

    return (
      <div className="text-xs text-muted-foreground p-2 border-t">
        Preview: {parts}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-x-0 z-40 bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-t border-white/10"
      style={{ bottom: '88px' }}
    >
      <div className="mx-auto max-w-screen-sm px-4 py-2">
        <div className="flex gap-2 p-3 border-t">
          {showEmojiReactions && (
            <div className="flex gap-1">
              {quickEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onEmojiClick?.(emoji)}
                  disabled={disabled}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          )}
          
          <form className="flex-1 relative" onSubmit={handleFormSubmit}>
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              className="pr-10"
            />
            
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              disabled={disabled || !value.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {taggedUsers.length > 0 && renderMessagePreview()}

        <FriendSelector
          isOpen={showFriendSelector}
          onClose={() => setShowFriendSelector(false)}
          onSelectFriend={handleSelectFriend}
          searchQuery={currentAtQuery}
          position={selectorPosition}
          useSmartRecommendations={useSmartRecommendations}
          maxResults={5}
          excludeUserIds={excludeUserIds}
        />
      </div>
    </div>
  );
};