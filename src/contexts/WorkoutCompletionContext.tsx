import React, { createContext, useContext, useState, useCallback } from 'react';

export interface WorkoutCompletionData {
  workoutId?: string;
  workoutType: 'ai_routine' | 'manual' | 'pre_made';
  durationMinutes: number;
  exercisesCount: number;
  setsCount: number;
  musclesWorked: string[];
  workoutData?: any;
}

interface WorkoutCompletionContextType {
  isModalOpen: boolean;
  workoutData: WorkoutCompletionData | null;
  showCompletionModal: (data: WorkoutCompletionData) => void;
  hideCompletionModal: () => void;
}

// A safe, no-op default that won't crash if provider is absent
const defaultWorkoutCompletionCtx: WorkoutCompletionContextType = {
  isModalOpen: false,
  workoutData: null,
  showCompletionModal: () => console.warn('[WorkoutCompletion] showCompletionModal called without provider'),
  hideCompletionModal: () => console.warn('[WorkoutCompletion] hideCompletionModal called without provider'),
};

const WorkoutCompletionContext = createContext<WorkoutCompletionContextType | null>(null);

export const WorkoutCompletionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workoutData, setWorkoutData] = useState<WorkoutCompletionData | null>(null);

  const showCompletionModal = useCallback((data: WorkoutCompletionData) => {
    setWorkoutData(data);
    setIsModalOpen(true);
  }, []);

  const hideCompletionModal = useCallback(() => {
    setIsModalOpen(false);
    setWorkoutData(null);
  }, []);

  return (
    <WorkoutCompletionContext.Provider value={{
      isModalOpen,
      workoutData,
      showCompletionModal,
      hideCompletionModal
    }}>
      {children}
    </WorkoutCompletionContext.Provider>
  );
};

export const useWorkoutCompletion = (): WorkoutCompletionContextType => {
  const context = useContext(WorkoutCompletionContext);
  return context ?? defaultWorkoutCompletionCtx; // <-- no throw; returns safe defaults
};