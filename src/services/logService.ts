import { ExerciseLog, ExerciseTemplate, RecoveryLog, RecoveryFavorite, HabitLog, HabitPin } from '@/types/logging';
import { store } from '@/lib/storage';

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

// Enhanced local storage implementation with versioning
class LocalStorageLogService implements LogService {
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  // Exercise methods
  async logExercise(payload: ExerciseLog): Promise<void> {
    store.upsertToFront('exercise.recent', this.userId, payload, 50);
  }

  async listRecentExercise(limit: number = 10): Promise<ExerciseLog[]> {
    const recent = store.get<ExerciseLog[]>('exercise.recent', [], this.userId);
    return recent.slice(0, limit);
  }

  async saveExerciseTemplate(template: ExerciseTemplate): Promise<void> {
    store.updateOrAdd('exercise.templates', this.userId, template);
  }

  async listExerciseTemplates(): Promise<ExerciseTemplate[]> {
    return store.get<ExerciseTemplate[]>('exercise.templates', [], this.userId);
  }

  async deleteExerciseTemplate(id: string): Promise<void> {
    store.removeById('exercise.templates', this.userId, id);
  }

  // Recovery methods
  async logRecovery(payload: RecoveryLog): Promise<void> {
    store.upsertToFront('recovery.recent', this.userId, payload, 50);
  }

  async listRecentRecovery(limit: number = 10): Promise<RecoveryLog[]> {
    const recent = store.get<RecoveryLog[]>('recovery.recent', [], this.userId);
    return recent.slice(0, limit);
  }

  async saveRecoveryFavorite(favorite: RecoveryFavorite): Promise<void> {
    store.updateOrAdd('recovery.favorites', this.userId, favorite);
  }

  async listRecoveryFavorites(): Promise<RecoveryFavorite[]> {
    return store.get<RecoveryFavorite[]>('recovery.favorites', [], this.userId);
  }

  async deleteRecoveryFavorite(id: string): Promise<void> {
    store.removeById('recovery.favorites', this.userId, id);
  }

  // Habit methods
  async logHabit(payload: HabitLog): Promise<void> {
    const logs = store.get<HabitLog[]>('habits.logs', [], this.userId);
    
    // Remove existing log for same habit on same date
    const filtered = logs.filter(log => 
      !(log.name === payload.name && log.date === payload.date)
    );
    
    filtered.push(payload);
    store.set('habits.logs', this.userId, filtered);
  }

  async listHabitLogs(date: string): Promise<HabitLog[]> {
    const logs = store.get<HabitLog[]>('habits.logs', [], this.userId);
    return logs.filter(log => log.date === date);
  }

  async listPinnedHabits(): Promise<HabitPin[]> {
    return store.get<HabitPin[]>('habits.pinned', [], this.userId);
  }

  async savePinnedHabit(habit: HabitPin): Promise<void> {
    store.updateOrAdd('habits.pinned', this.userId, habit);
  }

  async deletePinnedHabit(id: string): Promise<void> {
    store.removeById('habits.pinned', this.userId, id);
  }

  async reorderPinnedHabits(habits: HabitPin[]): Promise<void> {
    store.set('habits.pinned', this.userId, habits);
  }
}

// Create service instance
export function createLogService(userId?: string): LogService {
  // Check environment variable USE_SERVER_LOGS for server implementation
  const useServer = import.meta.env.VITE_USE_SERVER_LOGS === 'true';
  
  if (useServer) {
    // TODO: Implement server-based service
    console.warn('Server-based logging requested but not yet implemented, falling back to localStorage');
  }
  
  return new LocalStorageLogService(userId);
}

// Default export for convenience
export const logService = createLogService();
