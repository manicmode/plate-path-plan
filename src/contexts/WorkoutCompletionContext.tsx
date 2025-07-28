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

const WorkoutCompletionContext = createContext<WorkoutCompletionContextType | undefined>(undefined);

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

export const useWorkoutCompletion = () => {
  const context = useContext(WorkoutCompletionContext);
  if (context === undefined) {
    throw new Error('useWorkoutCompletion must be used within a WorkoutCompletionProvider');
  }
  return context;
};