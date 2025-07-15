
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SavingScreen } from '@/components/SavingScreen';
import { toast } from 'sonner';

interface OnboardingCompleteProps {
  onComplete: () => void;
  isSubmitting: boolean;
  formData?: {
    age: string;
    gender: string;
    weight: string;
    mainHealthGoal: string;
    activityLevel: string;
  };
}

export const OnboardingComplete = ({ onComplete, isSubmitting, formData }: OnboardingCompleteProps) => {
  const isMobile = useIsMobile();
  const [isProcessing, setIsProcessing] = useState(false);

  if (isSubmitting) {
    return <SavingScreen />;
  }

  return (
    <div className="text-center py-8">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
      </div>
      
      <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-4`}>
        Awesome! You're all set ✨
      </h1>
      
      <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-base' : 'text-lg'} mb-8 max-w-md mx-auto`}>
        Your AI Coach is now more personalized. You can always update this info in your profile anytime.
      </p>
      
      <Button
        onClick={async () => {
          // Prevent multiple clicks
          if (isProcessing || isSubmitting) {
            console.log('[DEBUG] OnboardingComplete: Already processing, ignoring click');
            return;
          }

          console.log('[DEBUG] OnboardingComplete: Let\'s go button clicked');
          
          // Set loading state immediately
          setIsProcessing(true);
          
          try {
            // Basic validation for required fields
            if (formData) {
              const requiredFields = [
                { field: 'age', name: 'Age' },
                { field: 'gender', name: 'Gender' },
                { field: 'weight', name: 'Weight' },
                { field: 'mainHealthGoal', name: 'Health Goal' },
                { field: 'activityLevel', name: 'Activity Level' }
              ];
              
              const missingFields = requiredFields.filter(
                ({ field }) => !formData[field as keyof typeof formData] || formData[field as keyof typeof formData] === ''
              );
              
              if (missingFields.length > 0) {
                const fieldNames = missingFields.map(({ name }) => name).join(', ');
                toast.error(`Please complete all required fields: ${fieldNames}`);
                console.log('[DEBUG] OnboardingComplete: Validation failed - missing fields:', missingFields);
                setIsProcessing(false);
                return;
              }
              
              // Additional validation
              if (formData.age && (parseInt(formData.age) < 13 || parseInt(formData.age) > 120)) {
                toast.error('Please enter a valid age between 13 and 120');
                setIsProcessing(false);
                return;
              }
              
              if (formData.weight && (parseFloat(formData.weight) <= 0 || parseFloat(formData.weight) > 1000)) {
                toast.error('Please enter a valid weight');
                setIsProcessing(false);
                return;
              }
            }
            
            // Call onComplete - note: we don't reset isProcessing here as the parent will handle the navigation
            onComplete();
          } catch (error) {
            console.error('[DEBUG] OnboardingComplete: Error during completion:', error);
            setIsProcessing(false);
            toast.error('Something went wrong. Please try again.');
          }
        }}
        disabled={isSubmitting || isProcessing}
        className={`w-full gradient-primary ${isMobile ? 'h-12' : 'h-14'} text-lg font-semibold`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          "Let's go!"
        )}
      </Button>
    </div>
  );
};
