import { create } from 'zustand';

interface UiState {
  // Manual Entry Modal
  manualEntryOpen: boolean;
  openManualEntry: () => void;
  closeManualEntry: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  // Manual Entry Modal
  manualEntryOpen: false,
  openManualEntry: () => set({ manualEntryOpen: true }),
  closeManualEntry: () => set({ manualEntryOpen: false }),
}));