import { useSmartTiming } from '@/contexts/SmartTimingContext';

export const useLogCompletion = () => {
  const { registerLogCompletion } = useSmartTiming();

  const handleNutritionLogCompletion = () => {
    registerLogCompletion('nutrition');
  };

  const handleHydrationLogCompletion = () => {
    registerLogCompletion('hydration');
  };

  const handleSupplementLogCompletion = () => {
    registerLogCompletion('supplement');
  };

  return {
    handleNutritionLogCompletion,
    handleHydrationLogCompletion,
    handleSupplementLogCompletion,
  };
};