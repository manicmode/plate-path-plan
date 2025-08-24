export type ISODate = string; // toISOString format

export interface ExerciseLog {
  id: string;
  userId?: string;
  createdAt: ISODate;
  activity: string;
  durationMin: number;
  distance?: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  sets?: Array<{ reps: number; weight?: number }>;
  notes?: string;
}

export interface ExerciseTemplate extends Omit<ExerciseLog, 'id' | 'createdAt' | 'userId'> {
  id: string;
  name: string;
}

export interface RecoveryLog {
  id: string;
  userId?: string;
  createdAt: ISODate;
  protocol: string; // Sauna, Stretching, etc.
  durationMin?: number;
  intensity?: 'LOW' | 'MED' | 'HIGH';
  notes?: string;
}

export interface RecoveryFavorite extends Omit<RecoveryLog, 'id' | 'createdAt' | 'userId'> {
  id: string;
  name: string;
}

export interface HabitPin {
  id: string;
  name: string;
  unit?: string;
}

export interface HabitLog {
  id: string;
  userId?: string;
  date: ISODate; // Date only, not full timestamp
  name: string;
  value?: number;
  unit?: string;
  notes?: string;
}

// Activity suggestions
export const EXERCISE_ACTIVITIES = [
  'Run', 'Walk', 'Cycle', 'Strength', 'Yoga', 'Row', 'Swim', 'HIIT', 
  'Pilates', 'Boxing', 'Tennis', 'Basketball', 'Soccer', 'Weightlifting'
];

export const RECOVERY_PROTOCOLS = [
  'Stretching', 'Sauna', 'Cold Plunge', 'Mobility', 'Foam Roll', 
  'Breathwork', 'Nap', 'Massage', 'Ice Bath', 'Hot Tub', 'Meditation'
];

export const INTENSITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MED', label: 'Medium' },
  { value: 'HIGH', label: 'High' }
] as const;