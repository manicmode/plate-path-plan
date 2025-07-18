import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ChatMessage {
  id: string;
  challengeId: string;
  userId: string;
  username: string;
  avatar: string;
  text?: string;
  emoji?: string;
  timestamp: string;
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
  sendMessage: (challengeId: string, text: string, emoji?: string) => void;
  addReaction: (challengeId: string, messageId: string, emoji: string) => void;
  removeReaction: (challengeId: string, messageId: string, emoji: string) => void;
  toggleMute: (challengeId: string) => void;
  canSendEmoji: (challengeId: string) => boolean;
  getLastEmojiTime: (challengeId: string) => number;
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
  const [chats, setChats] = useState<{ [challengeId: string]: ChallengeChat }>(mockChats);
  const [lastEmojiTimes, setLastEmojiTimes] = useState<{ [challengeId: string]: number }>({});

  const canSendEmoji = (challengeId: string): boolean => {
    const lastTime = lastEmojiTimes[challengeId] || 0;
    return Date.now() - lastTime >= EMOJI_COOLDOWN_MS;
  };

  const getLastEmojiTime = (challengeId: string): number => {
    return lastEmojiTimes[challengeId] || 0;
  };

  const sendMessage = (challengeId: string, text: string, emoji?: string) => {
    // Check emoji cooldown
    if (emoji && !canSendEmoji(challengeId)) {
      return;
    }

    // Check message length
    if (text && text.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      challengeId,
      userId: 'current-user-id',
      username: 'Maya 🌟',
      avatar: '🌟',
      text: text || undefined,
      emoji: emoji || undefined,
      timestamp: new Date().toISOString(),
      reactions: {}
    };

    setChats(prev => {
      const updatedChat = prev[challengeId] || { challengeId, messages: [], isMuted: false };
      return {
        ...prev,
        [challengeId]: {
          ...updatedChat,
          messages: [...updatedChat.messages, newMessage]
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
  };

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
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};