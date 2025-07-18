import { useNutrition } from '@/contexts/NutritionContext';

/**
 * Hook for AI Coach to inject dynamic CTA messages into the ticker
 * 
 * Example usage:
 * const { sendCoachMessage } = useCoachCta();
 * 
 * // After user logs healthy meal
 * sendCoachMessage("✅ Great choice on that quinoa bowl! Keep it up!");
 * 
 * // After analyzing poor food choice
 * sendCoachMessage("⚠️ Don't worry about the slip-up. Let's do better at dinner.");
 * 
 * // For hydration reminders
 * sendCoachMessage("💧 You're behind on water today. Let's grab a glass now.");
 */
export const useCoachCta = () => {
  const { addCoachCta, coachCtaQueue, currentCoachCta, clearCoachCta } = useNutrition();

  const sendCoachMessage = (message: string) => {
    addCoachCta(message);
  };

  const clearCurrentMessage = () => {
    clearCoachCta();
  };

  const getQueueInfo = () => ({
    queueLength: coachCtaQueue.length,
    currentMessage: currentCoachCta,
    hasActiveMessage: !!currentCoachCta
  });

  return {
    sendCoachMessage,
    clearCurrentMessage,
    getQueueInfo
  };
};