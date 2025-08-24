import { ExerciseLog, ExerciseTemplate, RecoveryLog, RecoveryFavorite, HabitLog, HabitPin } from '@/types/logging';

// Interface for future server integration
export interface LogService {
  // Exercise methods
  logExercise(payload: ExerciseLog): Promise<void>;
  listRecentExercise(limit: number): Promise<ExerciseLog[]>;
  saveExerciseTemplate(template: ExerciseTemplate): Promise<void>;
  listExerciseTemplates(): Promise<ExerciseTemplate[]>;
  deleteExerciseTemplate(id: string): Promise<void>;
  
  // Recovery methods
  logRecovery(payload: RecoveryLog): Promise<void>;
  listRecentRecovery(limit: number): Promise<RecoveryLog[]>;
  saveRecoveryFavorite(favorite: RecoveryFavorite): Promise<void>;
  listRecoveryFavorites(): Promise<RecoveryFavorite[]>;
  deleteRecoveryFavorite(id: string): Promise<void>;
  
  // Habit methods
  logHabit(payload: HabitLog): Promise<void>;
  listHabitLogs(date: string): Promise<HabitLog[]>;
  listPinnedHabits(): Promise<HabitPin[]>;
  savePinnedHabit(habit: HabitPin): Promise<void>;
  deletePinnedHabit(id: string): Promise<void>;
  reorderPinnedHabits(habits: HabitPin[]): Promise<void>;
}

// Local storage implementation
class LocalStorageLogService implements LogService {
  private userId: string;

  constructor(userId?: string) {
    this.userId = userId || 'anonymous';
  }

  private getStorageKey(type: string): string {
    return `${type}:${this.userId}`;
  }

  private getFromStorage<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw new Error('Failed to save data');
    }
  }

  // Exercise methods
  async logExercise(payload: ExerciseLog): Promise<void> {
    const key = this.getStorageKey('exercise.recent');
    const recent = this.getFromStorage<ExerciseLog>(key);
    recent.unshift(payload);
    // Keep only last 50 entries
    const trimmed = recent.slice(0, 50);
    this.saveToStorage(key, trimmed);
  }

  async listRecentExercise(limit: number = 10): Promise<ExerciseLog[]> {
    const key = this.getStorageKey('exercise.recent');
    const recent = this.getFromStorage<ExerciseLog>(key);
    return recent.slice(0, limit);
  }

  async saveExerciseTemplate(template: ExerciseTemplate): Promise<void> {
    const key = this.getStorageKey('exercise.templates');
    const templates = this.getFromStorage<ExerciseTemplate>(key);
    const existingIndex = templates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }
    
    this.saveToStorage(key, templates);
  }

  async listExerciseTemplates(): Promise<ExerciseTemplate[]> {
    const key = this.getStorageKey('exercise.templates');
    return this.getFromStorage<ExerciseTemplate>(key);
  }

  async deleteExerciseTemplate(id: string): Promise<void> {
    const key = this.getStorageKey('exercise.templates');
    const templates = this.getFromStorage<ExerciseTemplate>(key);
    const filtered = templates.filter(t => t.id !== id);
    this.saveToStorage(key, filtered);
  }

  // Recovery methods
  async logRecovery(payload: RecoveryLog): Promise<void> {
    const key = this.getStorageKey('recovery.recent');
    const recent = this.getFromStorage<RecoveryLog>(key);
    recent.unshift(payload);
    const trimmed = recent.slice(0, 50);
    this.saveToStorage(key, trimmed);
  }

  async listRecentRecovery(limit: number = 10): Promise<RecoveryLog[]> {
    const key = this.getStorageKey('recovery.recent');
    const recent = this.getFromStorage<RecoveryLog>(key);
    return recent.slice(0, limit);
  }

  async saveRecoveryFavorite(favorite: RecoveryFavorite): Promise<void> {
    const key = this.getStorageKey('recovery.favorites');
    const favorites = this.getFromStorage<RecoveryFavorite>(key);
    const existingIndex = favorites.findIndex(f => f.id === favorite.id);
    
    if (existingIndex >= 0) {
      favorites[existingIndex] = favorite;
    } else {
      favorites.push(favorite);
    }
    
    this.saveToStorage(key, favorites);
  }

  async listRecoveryFavorites(): Promise<RecoveryFavorite[]> {
    const key = this.getStorageKey('recovery.favorites');
    return this.getFromStorage<RecoveryFavorite>(key);
  }

  async deleteRecoveryFavorite(id: string): Promise<void> {
    const key = this.getStorageKey('recovery.favorites');
    const favorites = this.getFromStorage<RecoveryFavorite>(key);
    const filtered = favorites.filter(f => f.id !== id);
    this.saveToStorage(key, filtered);
  }

  // Habit methods
  async logHabit(payload: HabitLog): Promise<void> {
    const key = this.getStorageKey('habits.logs');
    const logs = this.getFromStorage<HabitLog>(key);
    
    // Remove existing log for same habit on same date
    const filtered = logs.filter(log => 
      !(log.name === payload.name && log.date === payload.date)
    );
    
    filtered.push(payload);
    this.saveToStorage(key, filtered);
  }

  async listHabitLogs(date: string): Promise<HabitLog[]> {
    const key = this.getStorageKey('habits.logs');
    const logs = this.getFromStorage<HabitLog>(key);
    return logs.filter(log => log.date === date);
  }

  async listPinnedHabits(): Promise<HabitPin[]> {
    const key = this.getStorageKey('habits.pinned');
    return this.getFromStorage<HabitPin>(key);
  }

  async savePinnedHabit(habit: HabitPin): Promise<void> {
    const key = this.getStorageKey('habits.pinned');
    const habits = this.getFromStorage<HabitPin>(key);
    const existingIndex = habits.findIndex(h => h.id === habit.id);
    
    if (existingIndex >= 0) {
      habits[existingIndex] = habit;
    } else {
      habits.push(habit);
    }
    
    this.saveToStorage(key, habits);
  }

  async deletePinnedHabit(id: string): Promise<void> {
    const key = this.getStorageKey('habits.pinned');
    const habits = this.getFromStorage<HabitPin>(key);
    const filtered = habits.filter(h => h.id !== id);
    this.saveToStorage(key, filtered);
  }

  async reorderPinnedHabits(habits: HabitPin[]): Promise<void> {
    const key = this.getStorageKey('habits.pinned');
    this.saveToStorage(key, habits);
  }
}

// Create service instance
export function createLogService(userId?: string): LogService {
  // TODO: Check environment variable USE_SERVER_LOGS for server implementation
  const useServer = process.env.USE_SERVER_LOGS === 'true';
  
  if (useServer) {
    // TODO: Implement server-based service
    throw new Error('Server-based logging not yet implemented');
  }
  
  return new LocalStorageLogService(userId);
}

// Default export for convenience
export const logService = createLogService();
