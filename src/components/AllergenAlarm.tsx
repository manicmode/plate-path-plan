
import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AllergenAlarmProps {
  detectedAllergens: string[];
  onDismiss: () => void;
}

const AllergenAlarm = ({ detectedAllergens, onDismiss }: AllergenAlarmProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (detectedAllergens.length > 0) {
      setIsVisible(true);
      
      const playAlarm = async () => {
        try {
          // Play alarm sound with platform checks
          if (typeof Audio !== 'undefined' && typeof window !== 'undefined') {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhAjuY3PCrQhEQXbPn7KJOEAw/muHyvmslBCWT3vK7cyMFl4DB6+6NCAxHmuDt0oUUBYm/8O2eUQ0Kp8nq3Z4QCE2O5/HBdSUGlYHB5+2RRw0OvLrm35IPFAFWl9rxvYYhBF2N3u+2XSkAVpXc8bWFIQRZjdztylsHFVOY2PGxgS0AZY3d7r9iIgJQjOPpzFsFGVqT2+6jQBMNUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3/HBgCcMUoLi8oOQQwUUhK7u2aAQGVWQ3');
            await audio.play();
          }
        } catch (error) {
          // Silently handle audio failures on mobile Safari and other platforms
          console.log('AllergenAlarm: Audio alarm failed to play (expected on mobile Safari):', error);
        }
      };
      
      playAlarm();
    }
  }, [detectedAllergens]);

  if (!isVisible || detectedAllergens.length === 0) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-900/20 shadow-2xl animate-pulse">
          <AlertTriangle className="h-6 w-6 text-red-600 animate-bounce" />
          <AlertTitle className="text-red-800 dark:text-red-200 font-bold text-lg">
            ⚠️ ALLERGEN DETECTED!
          </AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300 mt-2">
            <div className="space-y-2">
              <p className="font-semibold">The following allergens were detected:</p>
              <ul className="list-disc list-inside space-y-1">
                {detectedAllergens.map((allergen, index) => (
                  <li key={index} className="font-medium">
                    {allergen}
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-3 font-medium">
                Please check the ingredients carefully before consuming!
              </p>
            </div>
          </AlertDescription>
          <Button
            onClick={handleDismiss}
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
            variant="destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      </div>
    </div>
  );
};

export default AllergenAlarm;
