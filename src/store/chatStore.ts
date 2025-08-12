import { create } from 'zustand';

interface ChatStore {
  selectedChatroomId: string | null;
  activeTab: string | null;
  selectChatroom: (chatroomId: string) => void;
  clearSelection: () => void;
  setActiveTab: (tab: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  selectedChatroomId: null,
  activeTab: null,
  selectChatroom: (chatroomId) => {
    console.log('[ChatStore] Selecting chatroom:', chatroomId);
    set({ selectedChatroomId: chatroomId });
  },
  clearSelection: () => set({ selectedChatroomId: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
