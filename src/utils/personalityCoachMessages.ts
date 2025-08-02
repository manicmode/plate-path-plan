import { supabase } from '@/integrations/supabase/client';

// Coach personality types
export type CoachType = 'exercise' | 'nutrition' | 'recovery';
export type VoiceProfile = 'gritty_hype' | 'confident_gentle' | 'calm_serene';

// Message categories for different use cases
export type MessageCategory = 
  | 'push_notification' 
  | 'in_app_nudge' 
  | 'smart_banner' 
  | 'chat_auto_response'
  | 'motivation'
  | 'praise'
  | 'reminder';

interface PersonalityMessageRequest {
  coachType: CoachType;
  messageType?: MessageCategory;
  context?: Record<string, any>;
  customPrompt?: string;
}

interface PersonalityMessageResponse {
  message: string;
  voiceProfile: VoiceProfile;
  coachType: CoachType;
  category?: string;
  isAIGenerated?: boolean;
}

/**
 * 🎭 Personality Coach Messages Utility
 * 
 * This utility provides personality-aligned messages for all three coaches:
 * - Exercise Coach: Loud, energetic, gritty (gritty_hype)
 * - Nutrition Coach: Calm, wise, supportive (confident_gentle)
 * - Recovery Coach: Gentle, poetic, serene (calm_serene)
 */
export class PersonalityCoachMessages {
  
  /**
   * Get a personality-aligned message for a coach
   */
  static async getMessage(request: PersonalityMessageRequest): Promise<PersonalityMessageResponse | null> {
    try {
      const { data, error } = await supabase.functions.invoke('personality-coach-messages', {
        body: request
      });

      if (error) {
        console.error('Error getting personality message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get personality message:', error);
      return null;
    }
  }

  /**
   * Get a templated message (pre-written, fast response)
   */
  static async getTemplatedMessage(
    coachType: CoachType, 
    messageCategory: MessageCategory,
    context: Record<string, any> = {}
  ): Promise<PersonalityMessageResponse | null> {
    return this.getMessage({
      coachType,
      messageType: messageCategory,
      context
    });
  }

  /**
   * Generate a custom AI message with personality
   */
  static async generateCustomMessage(
    coachType: CoachType,
    prompt: string,
    context: Record<string, any> = {}
  ): Promise<PersonalityMessageResponse | null> {
    return this.getMessage({
      coachType,
      customPrompt: prompt,
      context
    });
  }

  /**
   * 🎭 Coach Personality Nudge Templates
   * Get personality-specific nudge messages for notifications and in-app use
   */

  // 💪 Exercise Coach Nudges
  static async getExerciseNudge(type: 'missed_workout' | 'consistency_praise' | 'challenge_reminder', context = {}) {
    return this.getTemplatedMessage('exercise', 'push_notification', { ...context, nudgeType: type });
  }

  // 🥦 Nutrition Coach Nudges  
  static async getNutritionNudge(type: 'meal_reminder' | 'consistency_praise' | 'hydration_nudge', context = {}) {
    return this.getTemplatedMessage('nutrition', 'push_notification', { ...context, nudgeType: type });
  }

  // 🌙 Recovery Coach Nudges
  static async getRecoveryNudge(type: 'sleep_reminder' | 'stress_relief' | 'recovery_praise', context = {}) {
    return this.getTemplatedMessage('recovery', 'push_notification', { ...context, nudgeType: type });
  }

  /**
   * 🎭 Coach Personality In-App Messages
   * Get messages for smart banners and in-app notifications
   */
  static async getInAppMessage(coachType: CoachType, subType: string, context = {}) {
    return this.getTemplatedMessage(coachType, 'in_app_nudge', { ...context, subType });
  }

  /**
   * 🎭 Coach Personality Auto-Chat Messages
   * Generate contextual chat messages that coaches send automatically
   */
  static async getAutoChatMessage(coachType: CoachType, situation: string, userContext = {}) {
    const prompts = {
      exercise: {
        milestone_reached: "Congratulate the user on reaching a fitness milestone. Be energetic and celebratory!",
        plateau_detected: "Help the user break through a training plateau. Be motivational and solution-focused!",
        consistency_praise: "Praise the user for their workout consistency. Be proud and encouraging!",
        comeback_motivation: "Welcome the user back after a break. Be understanding but motivational!"
      },
      nutrition: {
        goal_achieved: "Acknowledge the user reaching their nutrition goal. Be gentle and proud.",
        balance_suggestion: "Suggest better nutritional balance based on their recent meals. Be wise and supportive.",
        mindful_reminder: "Remind the user about mindful eating practices. Be gentle and educational.",
        hydration_check: "Check in about the user's hydration. Be caring and nurturing."
      },
      recovery: {
        stress_detected: "Help the user manage detected stress levels. Be calming and supportive.",
        sleep_encouragement: "Encourage better sleep habits. Be soothing and wise.",
        emotional_support: "Provide emotional support for a difficult day. Be gentle and understanding.",
        mindfulness_invite: "Invite the user to practice mindfulness. Be peaceful and inviting."
      }
    };

    const prompt = prompts[coachType]?.[situation as keyof typeof prompts[typeof coachType]] || 
                  `Provide supportive ${coachType} guidance for: ${situation}`;

    return this.generateCustomMessage(coachType, prompt, userContext);
  }

  /**
   * 🎭 Voice Profile Helper
   * Get the voice profile for a coach type
   */
  static getVoiceProfile(coachType: CoachType): VoiceProfile {
    const mapping: Record<CoachType, VoiceProfile> = {
      exercise: 'gritty_hype',
      nutrition: 'confident_gentle', 
      recovery: 'calm_serene'
    };
    return mapping[coachType];
  }

  /**
   * 🎭 Personality Description Helper
   * Get personality description for a coach
   */
  static getPersonalityDescription(coachType: CoachType): string {
    const descriptions: Record<CoachType, string> = {
      exercise: "Loud, fun, gritty, motivational",
      nutrition: "Calm, wise, supportive",
      recovery: "Gentle, poetic, emotionally supportive"
    };
    return descriptions[coachType];
  }
}

// 🎭 Coach Personality Nudge Helper Functions
// These are convenience functions for common nudge scenarios

/**
 * Send personality-aligned push notification
 */
export async function sendPersonalityPushNotification(
  coachType: CoachType,
  notificationType: string,
  context: Record<string, any> = {}
): Promise<{ title: string; body: string; voiceProfile: VoiceProfile } | null> {
  const response = await PersonalityCoachMessages.getTemplatedMessage(
    coachType, 
    'push_notification', 
    { ...context, notificationType }
  );

  if (!response) return null;

  // Extract title and body from message (assuming format "Title | Body" or just body)
  const messageParts = response.message.split(' | ');
  const title = messageParts.length > 1 ? messageParts[0] : `Your ${coachType} coach`;
  const body = messageParts.length > 1 ? messageParts[1] : response.message;

  return {
    title,
    body,
    voiceProfile: response.voiceProfile
  };
}

/**
 * Get personality-aligned smart banner message
 */
export async function getPersonalityBannerMessage(
  coachType: CoachType,
  bannerType: string,
  context: Record<string, any> = {}
): Promise<PersonalityMessageResponse | null> {
  return PersonalityCoachMessages.getTemplatedMessage(
    coachType, 
    'smart_banner', 
    { ...context, bannerType }
  );
}

/**
 * Generate contextual coach auto-response
 */
export async function generateCoachAutoResponse(
  coachType: CoachType,
  userAction: string,
  userProgress: Record<string, any> = {}
): Promise<PersonalityMessageResponse | null> {
  return PersonalityCoachMessages.getAutoChatMessage(coachType, userAction, userProgress);
}