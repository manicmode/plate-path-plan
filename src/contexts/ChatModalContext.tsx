
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatModalContextType {
  isChatModalOpen: boolean;
  setIsChatModalOpen: (open: boolean) => void;
}

const ChatModalContext = createContext<ChatModalContextType | undefined>(undefined);

export const ChatModalProvider = ({ children }: { children: ReactNode }) => {
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  return (
    <ChatModalContext.Provider value={{ isChatModalOpen, setIsChatModalOpen }}>
      {children}
    </ChatModalContext.Provider>
  );
};

export const useChatModal = () => {
  const context = useContext(ChatModalContext);
  if (context === undefined) {
    throw new Error('useChatModal must be used within a ChatModalProvider');
  }
  return context;
};
