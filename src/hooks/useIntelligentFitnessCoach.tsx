import { useState, useCallback } from 'react';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { useAuth } from '@/contexts/auth';

interface WorkoutPattern {
  consistency: 'excellent' | 'good' | 'inconsistent' | 'poor';
  weeklyFrequency: number;
  averageDuration: number;
  favoriteWorkoutType: string;
  longestStreak: number;
  currentStreak: number;
  missedDays: number;
  improvementAreas: string[];
  strengths: string[];
}

interface CoachResponse {
  message: string;
  type: 'motivation' | 'analysis' | 'challenge' | 'recovery' | 'improvement';
  emoji: string;
}

export const useIntelligentFitnessCoach = () => {
  const { user } = useAuth();
  const { exerciseData, summary } = useRealExerciseData('30d');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeWorkoutPatterns = useCallback((): WorkoutPattern => {
    const totalDays = 30;
    const workoutDays = exerciseData.length;
    const weeklyFrequency = (workoutDays / totalDays) * 7;
    
    // Calculate consistency
    const consistencyScore = weeklyFrequency / 5; // Assuming 5 workouts per week is ideal
    let consistency: WorkoutPattern['consistency'];
    if (consistencyScore >= 0.9) consistency = 'excellent';
    else if (consistencyScore >= 0.7) consistency = 'good';
    else if (consistencyScore >= 0.4) consistency = 'inconsistent';
    else consistency = 'poor';

    // Find workout type distribution
    const workoutTypes: Record<string, number> = {};
    exerciseData.forEach(entry => {
      workoutTypes[entry.activity_type] = (workoutTypes[entry.activity_type] || 0) + 1;
    });
    
    const favoriteWorkoutType = Object.entries(workoutTypes)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'general';

    // Calculate streaks
    const currentStreak = calculateCurrentStreak();
    const longestStreak = calculateLongestStreak();

    // Identify improvement areas
    const improvementAreas = [];
    const strengths = [];

    if (weeklyFrequency < 3) improvementAreas.push('workout frequency');
    if (summary.totalDuration / workoutDays < 30) improvementAreas.push('workout duration');
    if (Object.keys(workoutTypes).length < 2) improvementAreas.push('workout variety');
    
    if (consistency === 'excellent' || consistency === 'good') strengths.push('consistency');
    if (summary.totalDuration / workoutDays >= 45) strengths.push('workout intensity');
    if (Object.keys(workoutTypes).length >= 3) strengths.push('workout variety');

    return {
      consistency,
      weeklyFrequency,
      averageDuration: summary.totalDuration / workoutDays || 0,
      favoriteWorkoutType,
      longestStreak,
      currentStreak,
      missedDays: totalDays - workoutDays,
      improvementAreas,
      strengths
    };
  }, [exerciseData, summary]);

  const calculateCurrentStreak = (): number => {
    if (exerciseData.length === 0) return 0;
    
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasWorkout = exerciseData.some(entry => entry.date === dateStr);
      
      if (hasWorkout) {
        streak++;
      } else if (i === 0) {
        // If no workout today, check yesterday
        continue;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const calculateLongestStreak = (): number => {
    if (exerciseData.length === 0) return 0;
    
    let maxStreak = 0;
    let currentStreak = 0;
    
    const sortedDates = exerciseData
      .map(entry => new Date(entry.date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const daysDiff = Math.floor(
          (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }
    }
    
    return Math.max(maxStreak, currentStreak);
  };

  const generateCoachResponse = useCallback((input: string): CoachResponse => {
    setIsAnalyzing(true);
    
    const patterns = analyzeWorkoutPatterns();
    const lowerInput = input.toLowerCase();
    
    // Detect intent from user input
    if (lowerInput.includes('how am i doing') || lowerInput.includes('progress') || lowerInput.includes('analysis')) {
      return generateProgressAnalysis(patterns);
    }
    
    if (lowerInput.includes('challenge') || lowerInput.includes('new workout') || lowerInput.includes('push me')) {
      return generateChallenge(patterns);
    }
    
    if (lowerInput.includes('motivate') || lowerInput.includes('motivation') || lowerInput.includes('encourage')) {
      return generateMotivation(patterns);
    }
    
    if (lowerInput.includes('rest') || lowerInput.includes('recovery') || lowerInput.includes('tired') || lowerInput.includes('sore')) {
      return generateRecoveryAdvice(patterns);
    }
    
    if (lowerInput.includes('improve') || lowerInput.includes('better') || lowerInput.includes('tips')) {
      return generateImprovementSuggestions(patterns);
    }
    
    // Default response with general analysis
    return generateGeneralResponse(patterns);
  }, [analyzeWorkoutPatterns]);

  const generateProgressAnalysis = (patterns: WorkoutPattern): CoachResponse => {
    const { consistency, weeklyFrequency, currentStreak, strengths, improvementAreas } = patterns;
    
    let message = `🏆 Hey champion! Here's your fitness breakdown:\n\n`;
    
    // Consistency feedback
    if (consistency === 'excellent') {
      message += `💪 CRUSHING IT! Your consistency is absolutely phenomenal! You're working out ${weeklyFrequency.toFixed(1)} times per week - that's elite level dedication!\n\n`;
    } else if (consistency === 'good') {
      message += `🔥 You're doing great! ${weeklyFrequency.toFixed(1)} workouts per week shows solid commitment. You're building real momentum!\n\n`;
    } else if (consistency === 'inconsistent') {
      message += `📈 You're getting started, and that's what matters! ${weeklyFrequency.toFixed(1)} workouts per week is a foundation we can build on. Let's pump those numbers up!\n\n`;
    } else {
      message += `🌱 Every journey starts with a single step! You've taken that step, now let's build momentum together. I believe in you!\n\n`;
    }
    
    // Current streak
    if (currentStreak > 0) {
      message += `🔥 Current streak: ${currentStreak} days! `;
      if (currentStreak >= 7) message += `You're on FIRE! 🚀\n\n`;
      else if (currentStreak >= 3) message += `Building great habits! 💫\n\n`;
      else message += `Keep it rolling! 🎯\n\n`;
    }
    
    // Strengths
    if (strengths.length > 0) {
      message += `✨ Your strengths: ${strengths.join(', ')}\n\n`;
    }
    
    // Improvement areas
    if (improvementAreas.length > 0) {
      message += `🎯 Let's work on: ${improvementAreas.join(', ')}\n\nRemember: Progress over perfection! You've got this! 💪`;
    }
    
    return { message, type: 'analysis', emoji: '📊' };
  };

  const generateChallenge = (patterns: WorkoutPattern): CoachResponse => {
    const challenges = [
      {
        condition: patterns.averageDuration < 30,
        message: "🚀 30-MINUTE CHALLENGE! Let's push your workouts to 30+ minutes for the next week. Your body is ready for more!"
      },
      {
        condition: patterns.weeklyFrequency < 4,
        message: "💥 CONSISTENCY CHALLENGE! Let's hit 4 workouts this week. You've got the potential - now let's unlock it!"
      },
      {
        condition: patterns.favoriteWorkoutType === 'cardio',
        message: "🏋️ STRENGTH CHALLENGE! Time to add some resistance training. Let's build those muscles alongside that amazing cardio base!"
      },
      {
        condition: patterns.favoriteWorkoutType === 'strength',
        message: "🏃 CARDIO BOOST CHALLENGE! Let's add 2 cardio sessions this week to supercharge your endurance!"
      },
      {
        condition: patterns.currentStreak >= 7,
        message: "🔥 BEAST MODE CHALLENGE! You're on fire! Let's push for 2 weeks straight. Elite athletes are made from moments like this!"
      }
    ];
    
    const availableChallenge = challenges.find(c => c.condition);
    const defaultChallenge = "💪 LEVEL UP CHALLENGE! This week, increase your workout intensity by 10%. Add more weight, more reps, or more time. Your future self will thank you!";
    
    return {
      message: availableChallenge?.message || defaultChallenge,
      type: 'challenge',
      emoji: '🚀'
    };
  };

  const generateMotivation = (patterns: WorkoutPattern): CoachResponse => {
    const motivationalMessages = [];
    
    if (patterns.consistency === 'excellent') {
      motivationalMessages.push("🌟 You are UNSTOPPABLE! Your consistency is inspiring. Keep showing up - you're building a legend!");
    } else if (patterns.consistency === 'good') {
      motivationalMessages.push("🔥 You're building something AMAZING! Every workout is adding to your strength, confidence, and power!");
    } else {
      motivationalMessages.push("💫 Every pro was once a beginner! You're planting seeds that will become mighty oak trees. Keep going!");
    }
    
    if (patterns.currentStreak > 0) {
      motivationalMessages.push(`🏆 ${patterns.currentStreak} days strong! You're proving to yourself what you're capable of!`);
    }
    
    const generalMotivation = [
      "💪 Your body can do ANYTHING. It's your mind you need to convince!",
      "🚀 You didn't come this far to only come this far. Let's go FURTHER!",
      "⚡ Champions are made when nobody's watching. You're becoming unstoppable!",
      "🔥 The pain you feel today will be the STRENGTH you feel tomorrow!"
    ];
    
    motivationalMessages.push(generalMotivation[Math.floor(Math.random() * generalMotivation.length)]);
    
    return {
      message: motivationalMessages.join('\n\n'),
      type: 'motivation',
      emoji: '🔥'
    };
  };

  const generateRecoveryAdvice = (patterns: WorkoutPattern): CoachResponse => {
    let message = "🧘 Smart recovery is just as important as crushing workouts! ";
    
    if (patterns.weeklyFrequency > 6) {
      message += "You've been going HARD! Your body needs 1-2 rest days per week to rebuild stronger. Consider active recovery like yoga or light walking today. 🚶‍♀️\n\n";
    } else if (patterns.averageDuration > 60) {
      message += "Those intense sessions are paying off! For optimal recovery: stretch for 10 minutes, stay hydrated, and prioritize 7-9 hours of sleep. 😴\n\n";
    } else {
      message += "Listen to your body - it's telling you something important! 💚\n\n";
    }
    
    message += "Recovery tips:\n";
    message += "• 💧 Hydrate like a champion\n";
    message += "• 🥗 Fuel with protein & nutrients\n";
    message += "• 😴 Sleep is when magic happens\n";
    message += "• 🧘 Gentle stretching or yoga\n\n";
    message += "Tomorrow, you'll come back STRONGER! 💪";
    
    return { message, type: 'recovery', emoji: '🧘' };
  };

  const generateImprovementSuggestions = (patterns: WorkoutPattern): CoachResponse => {
    let message = "🎯 Let's level up your fitness game! Here's your personalized improvement plan:\n\n";
    
    if (patterns.improvementAreas.includes('workout frequency')) {
      message += "📅 FREQUENCY BOOST: Aim for one more workout this week. Start small - even 15 minutes counts!\n\n";
    }
    
    if (patterns.improvementAreas.includes('workout duration')) {
      message += "⏱️ DURATION POWER-UP: Try adding 5-10 minutes to your next workout. Your endurance will skyrocket!\n\n";
    }
    
    if (patterns.improvementAreas.includes('workout variety')) {
      message += "🌈 VARIETY SPICE: Mix it up! If you love cardio, try some strength training. Love lifting? Add some cardio fun!\n\n";
    }
    
    // Weekly schedule suggestion
    if (patterns.weeklyFrequency < 3) {
      message += "📋 SUGGESTED WEEKLY PLAN:\n";
      message += "• Mon: Full body strength (30 min)\n";
      message += "• Wed: Cardio fun (25 min)\n";
      message += "• Fri: Upper body focus (30 min)\n";
      message += "• Sat: Active recovery walk\n\n";
    }
    
    message += "🚀 Remember: Small improvements compound into BIG results! You've got this! 💪";
    
    return { message, type: 'improvement', emoji: '📈' };
  };

  const generateGeneralResponse = (patterns: WorkoutPattern): CoachResponse => {
    const responses = [
      {
        message: `💪 Hey fitness warrior! I see you've been crushing it with ${patterns.favoriteWorkoutType} workouts. Ready to take it to the next level? What's your fitness goal today?`,
        type: 'motivation' as const,
        emoji: '🏋️'
      },
      {
        message: `🌟 Looking at your progress, you're building something incredible! Your consistency is ${patterns.consistency}. What would you like to work on next?`,
        type: 'analysis' as const,
        emoji: '⭐'
      },
      {
        message: `🔥 I'm here to help you become the strongest version of yourself! Whether you need motivation, a new challenge, or recovery advice - just ask!`,
        type: 'motivation' as const,
        emoji: '💫'
      }
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const processUserInput = useCallback((input: string): CoachResponse => {
    try {
      const response = generateCoachResponse(input);
      setIsAnalyzing(false);
      return response;
    } catch (error) {
      setIsAnalyzing(false);
      return {
        message: "💪 I'm here to help you crush your fitness goals! Ask me about your progress, challenges, or motivation!",
        type: 'motivation',
        emoji: '🤖'
      };
    }
  }, [generateCoachResponse]);

  return {
    processUserInput,
    analyzeWorkoutPatterns,
    isAnalyzing
  };
};