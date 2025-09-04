import { create } from 'zustand';

type ReminderSchedule = {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  hour: number;
  minute: number;
  days?: number[]; // For weekly (0=Sunday, 1=Monday, etc.)
};

type Reminder = {
  id: string;
  type: 'meal_set' | 'food_item';
  title: string;
  schedule: ReminderSchedule;
  payload: {
    itemIds?: string[];
    names?: string[];
  };
  isActive?: boolean;
  createdAt?: number;
};

type ReminderState = {
  reminders: Record<string, Reminder>;
  isOn: (id: string) => boolean;
  upsertReminder: (reminder: Partial<Reminder> & { id: string }) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
};

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: {},
  
  isOn: (id: string) => {
    const reminder = get().reminders[id];
    return reminder?.isActive ?? false;
  },
  
  upsertReminder: (reminder) => {
    set((state) => ({
      reminders: {
        ...state.reminders,
        [reminder.id]: {
          ...state.reminders[reminder.id],
          ...reminder,
          isActive: true,
          createdAt: reminder.createdAt || Date.now(),
        }
      }
    }));
  },
  
  removeReminder: (id) => {
    set((state) => {
      const newReminders = { ...state.reminders };
      delete newReminders[id];
      return { reminders: newReminders };
    });
  },
  
  toggleReminder: (id) => {
    set((state) => {
      const reminder = state.reminders[id];
      if (!reminder) return state;
      
      return {
        reminders: {
          ...state.reminders,
          [id]: {
            ...reminder,
            isActive: !reminder.isActive
          }
        }
      };
    });
  }
}));