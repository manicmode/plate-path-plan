import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  challengeId: string;
  userId: string;
  username: string;
  avatar?: string;
  text?: string;
  emoji?: string;
  timestamp: string;
  taggedUsers?: string[];
  reactions?: { [emoji: string]: string[] }; // emoji -> array of userIds
}

export interface ChallengeChat {
  challengeId: string;
  messages: ChatMessage[];
  pinnedMessage?: {
    text: string;
    author: string;
    timestamp: string;
  };
  isMuted: boolean;
}

interface ChatContextType {
  chats: { [challengeId: string]: ChallengeChat };
  sendMessage: (challengeId: string, text?: string, emoji?: string, taggedUsers?: string[]) => void;
  addReaction: (challengeId: string, messageId: string, emoji: string) => void;
  removeReaction: (challengeId: string, messageId: string, emoji: string) => void;
  toggleMute: (challengeId: string) => void;
  canSendEmoji: (challengeId: string) => boolean;
  getLastEmojiTime: (challengeId: string) => number;
  loadMessages: (challengeId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

const EMOJI_COOLDOWN_MS = 10000; // 10 seconds
const MAX_MESSAGE_LENGTH = 140;

// Mock data for demonstration
const mockChats: { [challengeId: string]: ChallengeChat } = {
  '1': {
    challengeId: '1',
    isMuted: false,
    pinnedMessage: {
      text: 'Welcome to the 7-Day No Sugar Challenge! Let\'s support each other! 🍯✨',
      author: 'AI Coach',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    messages: [
      {
        id: 'msg1',
        challengeId: '1',
        userId: 'user-1',
        username: 'Maya 🌟',
        avatar: '🌟',
        text: 'Day 2 and feeling strong! Who else is crushing it?',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        reactions: { '🔥': ['user-2', 'user-3'], '💪': ['user-3'] }
      },
      {
        id: 'msg2',
        challengeId: '1',
        userId: 'user-2',
        username: 'Alex 🦄',
        avatar: '🦄',
        emoji: '🔥',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg3',
        challengeId: '1',
        userId: 'user-3',
        username: 'Sam 🔥',
        avatar: '🔥',
        text: 'Had a close call with cookies but stayed strong! 💪',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        reactions: { '👏': ['user-1', 'user-2'], '🎉': ['user-1'] }
      },
    ]
  },
  'micro-1': {
    challengeId: 'micro-1',
    isMuted: false,
    messages: [
      {
        id: 'msg4',
        challengeId: 'micro-1',
        userId: 'user-2',
        username: 'Alex 🦄',
        avatar: '🦄',
        text: 'Just finished glass #2! 💧',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        reactions: { '💪': ['user-3'], '🎯': ['user-4'] }
      },
      {
        id: 'msg5',
        challengeId: 'micro-1',
        userId: 'user-4',
        username: 'Jordan 🚀',
        avatar: '🚀',
        emoji: '🎉',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ]
  }
};

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [chats, setChats] = useState<{ [challengeId: string]: ChallengeChat }>({});
  const [lastEmojiTimes, setLastEmojiTimes] = useState<{ [challengeId: string]: number }>({});
  const { user } = useAuth();
  const { toast } = useToast();

  const canSendEmoji = (challengeId: string): boolean => {
    const lastTime = lastEmojiTimes[challengeId] || 0;
    return Date.now() - lastTime >= EMOJI_COOLDOWN_MS;
  };

  const getLastEmojiTime = (challengeId: string): number => {
    return lastEmojiTimes[challengeId] || 0;
  };

  // Load messages from Supabase
  const loadMessages = useCallback(async (challengeId: string) => {
    try {
      const { data, error } = await supabase
        .from('challenge_messages')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const formattedMessages: ChatMessage[] = data?.map(msg => ({
        id: msg.id,
        challengeId: msg.challenge_id,
        userId: msg.user_id,
        username: msg.username,
        text: msg.text,
        emoji: msg.emoji,
        timestamp: msg.timestamp,
        taggedUsers: msg.tagged_users || [],
        reactions: {}
      })) || [];

      setChats(prev => ({
        ...prev,
        [challengeId]: {
          challengeId,
          messages: formattedMessages,
          isMuted: prev[challengeId]?.isMuted || false,
          pinnedMessage: prev[challengeId]?.pinnedMessage
        }
      }));

    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  // Send message with tagging support
  const sendMessage = useCallback(async (challengeId: string, text?: string, emoji?: string, taggedUsers?: string[]) => {
    if (!user || (!text?.trim() && !emoji)) return;

    // Check emoji cooldown
    if (emoji && !canSendEmoji(challengeId)) {
      toast({
        title: "Please wait",
        description: "You can send emoji reactions every 10 seconds",
        variant: "destructive"
      });
      return;
    }

    // Check message length
    if (text && text.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Messages must be under ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive"
      });
      return;
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      challengeId,
      userId: user.id,
      username: user.name || user.email || 'Anonymous',
      text: text?.trim(),
      emoji,
      timestamp: new Date().toISOString(),
      taggedUsers: taggedUsers || [],
      reactions: {}
    };

    try {
      // Store in Supabase
      const { error } = await supabase
        .from('challenge_messages')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          username: message.username,
          text: message.text,
          emoji: message.emoji,
          tagged_users: taggedUsers || [],
          timestamp: message.timestamp
        });

      if (error) throw error;

      // Update local state
      setChats(prev => {
        const existingChat = prev[challengeId] || { challengeId, messages: [], isMuted: false };
        return {
          ...prev,
          [challengeId]: {
            ...existingChat,
            messages: [...existingChat.messages, message]
          }
        };
      });

      // Update emoji cooldown
      if (emoji) {
        setLastEmojiTimes(prev => ({
          ...prev,
          [challengeId]: Date.now()
        }));
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    }
  }, [user, toast, canSendEmoji]);

  const addReaction = (challengeId: string, messageId: string, emoji: string) => {
    setChats(prev => {
      const chat = prev[challengeId];
      if (!chat) return prev;

      const updatedMessages = chat.messages.map(message => {
        if (message.id === messageId) {
          const reactions = message.reactions || {};
          const userIds = reactions[emoji] || [];
          
          // Don't add if user already reacted with this emoji
          if (userIds.includes('current-user-id')) {
            return message;
          }

          return {
            ...message,
            reactions: {
              ...reactions,
              [emoji]: [...userIds, 'current-user-id']
            }
          };
        }
        return message;
      });

      return {
        ...prev,
        [challengeId]: {
          ...chat,
          messages: updatedMessages
        }
      };
    });
  };

  const removeReaction = (challengeId: string, messageId: string, emoji: string) => {
    setChats(prev => {
      const chat = prev[challengeId];
      if (!chat) return prev;

      const updatedMessages = chat.messages.map(message => {
        if (message.id === messageId) {
          const reactions = message.reactions || {};
          const userIds = reactions[emoji] || [];
          const filteredUserIds = userIds.filter(id => id !== 'current-user-id');

          return {
            ...message,
            reactions: {
              ...reactions,
              [emoji]: filteredUserIds.length > 0 ? filteredUserIds : undefined
            }
          };
        }
        return message;
      });

      return {
        ...prev,
        [challengeId]: {
          ...chat,
          messages: updatedMessages
        }
      };
    });
  };

  const toggleMute = (challengeId: string) => {
    setChats(prev => {
      const chat = prev[challengeId];
      if (!chat) return prev;

      return {
        ...prev,
        [challengeId]: {
          ...chat,
          isMuted: !chat.isMuted
        }
      };
    });
  };

  const value: ChatContextType = {
    chats,
    sendMessage,
    addReaction,
    removeReaction,
    toggleMute,
    canSendEmoji,
    getLastEmojiTime,
    loadMessages,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};