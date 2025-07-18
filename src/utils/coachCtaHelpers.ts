/**
 * Helper functions for AI Coach to generate contextual CTA messages
 * These can be called from the AI coach chat system or food analysis
 */

export interface FoodAnalysisResult {
  isHealthy: boolean;
  calories: number;
  qualityScore: number;
  mainConcerns: string[];
}

export interface UserProgress {
  caloriesPercent: number;
  proteinPercent: number;
  hydrationPercent: number;
  supplementsCount: number;
}

/**
 * Generate CTA messages based on food analysis
 */
export const generateFoodAnalysisCta = (food: string, analysis: FoodAnalysisResult): string | null => {
  if (analysis.isHealthy && analysis.qualityScore >= 8) {
    return `✅ Excellent choice with ${food}! You're crushing your nutrition goals!`;
  }
  
  if (analysis.isHealthy && analysis.qualityScore >= 6) {
    return `👍 Good choice on ${food}! Your body will thank you for that nutrition.`;
  }
  
  if (!analysis.isHealthy && analysis.mainConcerns.includes('high_sugar')) {
    return `🍯 That ${food} has quite a bit of sugar. Balance it out with protein at your next meal!`;
  }
  
  if (!analysis.isHealthy && analysis.mainConcerns.includes('processed')) {
    return `⚠️ Processed foods happen! Let's aim for something fresh and whole at dinner.`;
  }
  
  if (analysis.calories > 800) {
    return `🔥 That's a substantial meal! Maybe a lighter option next time to stay on track.`;
  }
  
  return null;
};

/**
 * Generate CTA messages based on daily progress
 */
export const generateProgressCta = (progress: UserProgress): string | null => {
  // Hydration reminders
  if (progress.hydrationPercent < 30) {
    return `💧 You're way behind on water today! Let's grab a big glass right now.`;
  }
  
  if (progress.hydrationPercent < 60) {
    return `🚰 Hydration check: You're at ${Math.round(progress.hydrationPercent)}%. Time for some H2O!`;
  }
  
  // Protein goals
  if (progress.proteinPercent > 90) {
    return `💪 Protein goal almost complete! You're at ${Math.round(progress.proteinPercent)}% - fantastic!`;
  }
  
  if (progress.proteinPercent < 40 && progress.caloriesPercent > 60) {
    return `🥩 You're getting calories but missing protein. Add some lean protein to your next meal!`;
  }
  
  // Calorie management
  if (progress.caloriesPercent > 120) {
    return `📊 You're above your calorie target. Consider lighter options for the rest of the day.`;
  }
  
  if (progress.caloriesPercent < 20 && new Date().getHours() > 14) {
    return `🍽️ You've barely eaten today! Your body needs fuel - let's get a proper meal.`;
  }
  
  // Supplements
  if (progress.supplementsCount === 0 && new Date().getHours() > 10) {
    return `💊 Don't forget your supplements today! Your body needs those nutrients.`;
  }
  
  return null;
};

/**
 * Generate time-based CTA messages
 */
export const generateTimeBasedCta = (): string | null => {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  
  // Morning motivation
  if (hour >= 6 && hour <= 9) {
    return `🌅 Good morning! Start strong with a nutritious breakfast and plenty of water.`;
  }
  
  // Afternoon energy dip
  if (hour >= 14 && hour <= 16) {
    return `😴 Afternoon energy dip? Skip the sugar crash - try a healthy snack instead!`;
  }
  
  // Evening wrap-up
  if (hour >= 19 && hour <= 21) {
    return `🌙 Evening check-in: How did your nutrition goals go today? Tomorrow is a fresh start!`;
  }
  
  // Weekend motivation
  if ((day === 0 || day === 6) && hour >= 10 && hour <= 12) {
    return `🎉 Weekend wellness warrior! Don't let the weekend derail your progress.`;
  }
  
  return null;
};

/**
 * Generate milestone celebration CTAs
 */
export const generateMilestoneCta = (streak: number, totalMeals: number): string | null => {
  if (streak === 7) {
    return `🔥 7-day logging streak! You're building amazing habits - keep it up!`;
  }
  
  if (streak === 14) {
    return `💎 Two weeks strong! Your consistency is paying off - you should feel proud!`;
  }
  
  if (streak === 30) {
    return `🏆 30-DAY STREAK! You're absolutely crushing it! This is life-changing momentum!`;
  }
  
  if (totalMeals === 50) {
    return `📈 50 meals logged! You're getting serious about your health journey!`;
  }
  
  if (totalMeals === 100) {
    return `🎯 100 meals tracked! Your dedication to health is truly inspiring!`;
  }
  
  return null;
};