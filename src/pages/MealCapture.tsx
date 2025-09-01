import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MealCaptureWizard } from '@/features/meal-capture/MealCaptureWizard';
import { isMealCaptureMode } from '@/features/meal-capture/isMealCaptureMode';

export default function MealCapturePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Log entry to meal capture mode
    if (import.meta.env.VITE_DEBUG_MEAL) {
      console.log('[MEAL][ROUTE][ENTER]', { 
        page: 'meal-capture',
        mode: 'meal-capture',
        rev: 'MEAL_REV=2025-08-31T20:55Z-r3'
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <MealCaptureWizard
        onExit={() => navigate('/scan', { replace: true })}
        onHandOffToConfirm={(prefill) => {
          // For now, just navigate back to scan - inline confirm can be added later
          console.log('Meal capture completed:', prefill);
          navigate('/scan', { replace: true });
        }}
      />
    </div>
  );
}