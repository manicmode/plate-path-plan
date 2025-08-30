/**
 * Personalized Suggestions Engine
 * Generates actionable, user-specific recommendations based on report + user profile
 */

import type { HealthAnalysisResult } from '@/components/health-check/HealthCheckModal';

export interface UserProfile {
  goals?: string[];
  restrictions?: string[];
  preferences?: string[];
  dailyTargets?: {
    calories?: number;
    protein?: number;
    sugar?: number;
    sodium?: number;
    fiber?: number;
  };
}

export interface SuggestionContext {
  report: HealthAnalysisResult;
  user?: UserProfile;
  portionGrams?: number;
}

export interface Suggestion {
  type: 'swap' | 'portion' | 'combo' | 'nudge';
  text: string;
  priority: number;
  facts?: string[];
}

/**
 * Build personalized suggestions using rules + LLM template
 */
export async function buildSuggestions(context: SuggestionContext): Promise<Suggestion[]> {
  const { report, user, portionGrams } = context;
  
  // Extract key facts about the product
  const facts = computeProductFacts(report, portionGrams);
  
  // Rule-based suggestions
  const ruleSuggestions = generateRuleBased(facts, user, report);
  
  // Enhanced suggestions using LLM for complex cases
  const enhancedSuggestions = await generateEnhanced(facts, user, report, portionGrams);
  
  // Combine and prioritize
  const allSuggestions = [...ruleSuggestions, ...enhancedSuggestions]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3); // Max 3 suggestions
  
  return allSuggestions;
}

/**
 * Compute key facts about the product for decision making
 */
function computeProductFacts(report: HealthAnalysisResult, portionGrams?: number): Record<string, any> {
  const nutrition = report.nutritionData || {};
  const flags = report.flags || report.ingredientFlags || [];
  
  // Convert to per-portion if specified
  const factor = portionGrams ? portionGrams / 100 : 1;
  
  const sugarPer = (nutrition.sugar || 0) * factor;
  const sodiumPer = (nutrition.sodium || 0) * factor;
  const fiberPer = (nutrition.fiber || 0) * factor;
  const proteinPer = (nutrition.protein || 0) * factor;
  const caloriesPer = (nutrition.calories || 0) * factor;
  
  // Thresholds (WHO/FDA guidelines)
  const dailySugarLimit = 50; // grams
  const dailySodiumLimit = 2300; // mg
  const dailyFiberTarget = 25; // grams
  
  return {
    // Nutrition flags
    sugarHigh: sugarPer > 15,
    sugarVeryHigh: sugarPer > 25,
    sodiumHigh: sodiumPer > 600,
    sodiumVeryHigh: sodiumPer > 1000,
    proteinLow: proteinPer < 3,
    fiberLow: fiberPer < 2,
    calorieHigh: caloriesPer > 300,
    
    // Daily % calculations
    sugarDailyPct: (sugarPer / dailySugarLimit) * 100,
    sodiumDailyPct: (sodiumPer / dailySodiumLimit) * 100,
    fiberDailyPct: (fiberPer / dailyFiberTarget) * 100,
    
    // Ingredient concerns
    ultraProcessed: flags.some(f => {
      const key = f.flag || f.ingredient || '';
      return ['artificial_colors', 'high_fructose_corn_syrup', 'nitrites'].some(term => key.toLowerCase().includes(term));
    }),
    hasArtificialSweeteners: flags.some(f => {
      const key = f.flag || f.ingredient || '';
      return key.toLowerCase().includes('aspartame') || key.toLowerCase().includes('sweetener');
    }),
    hasArtificialColors: flags.some(f => {
      const key = f.flag || f.ingredient || '';
      return key.toLowerCase().includes('artificial') && key.toLowerCase().includes('color');
    }),
    
    // Raw values for reference
    sugar: sugarPer,
    sodium: sodiumPer,
    fiber: fiberPer,
    protein: proteinPer,
    calories: caloriesPer,
    healthScore: report.healthScore || 0,
    flagCount: flags.length,
  };
}

/**
 * Generate rule-based suggestions
 */
function generateRuleBased(facts: any, user?: UserProfile, report?: HealthAnalysisResult): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // High sugar warnings with portion advice
  if (facts.sugarVeryHigh) {
    suggestions.push({
      type: 'portion',
      text: `Contains ${Math.round(facts.sugar)}g sugar${facts.sugar > 20 ? ' per portion' : ''}. Try a smaller serving or save for special occasions.`,
      priority: 90,
      facts: ['very_high_sugar']
    });
  } else if (facts.sugarHigh && facts.sugarDailyPct > 30) {
    suggestions.push({
      type: 'portion',
      text: `This provides ${Math.round(facts.sugarDailyPct)}% of daily sugar. Consider pairing with protein to slow absorption.`,
      priority: 80,
      facts: ['high_sugar_daily_pct']
    });
  }
  
  // Sodium warnings
  if (facts.sodiumVeryHigh) {
    suggestions.push({
      type: 'swap',
      text: `Very high sodium (${Math.round(facts.sodium)}mg). Look for low-sodium alternatives or rinse if possible.`,
      priority: 85,
      facts: ['very_high_sodium']
    });
  } else if (facts.sodiumHigh) {
    suggestions.push({
      type: 'nudge',
      text: `High sodium content. Balance with potassium-rich foods like bananas or leafy greens today.`,
      priority: 70,
      facts: ['high_sodium_balance']
    });
  }
  
  // Positive fiber content
  if (facts.fiber > 5) {
    suggestions.push({
      type: 'nudge',
      text: `Great fiber content (${Math.round(facts.fiber)}g)! This supports digestive health and satiety.`,
      priority: 60,
      facts: ['high_fiber_positive']
    });
  }
  
  // Ultra-processed concerns
  if (facts.ultraProcessed && facts.healthScore < 6) {
    suggestions.push({
      type: 'swap',
      text: `Contains multiple processed additives. Try whole food alternatives when possible.`,
      priority: 75,
      facts: ['ultra_processed']
    });
  }
  
  // User-specific restrictions
  if (user?.restrictions?.includes('artificial_sweeteners') && facts.hasArtificialSweeteners) {
    suggestions.push({
      type: 'swap',
      text: `Contains artificial sweeteners (avoid per your preferences). Look for naturally sweetened options.`,
      priority: 95,
      facts: ['user_restriction_sweeteners']
    });
  }
  
  return suggestions;
}

/**
 * Generate enhanced suggestions using LLM-style template
 */
async function generateEnhanced(facts: any, user?: UserProfile, report?: HealthAnalysisResult, portionGrams?: number): Promise<Suggestion[]> {
  // For now, use deterministic template-based approach
  // Can be replaced with actual LLM call later
  
  const suggestions: Suggestion[] = [];
  
  // Smart swaps based on category + issues
  if (facts.healthScore < 5 && facts.flagCount >= 2) {
    const category = inferCategory(report?.itemName || '');
    const swapSuggestion = generateSwapSuggestion(category, facts);
    if (swapSuggestion) {
      suggestions.push(swapSuggestion);
    }
  }
  
  // Combination suggestions (food pairing)
  if (facts.sugarHigh && !facts.proteinLow) {
    suggestions.push({
      type: 'combo',
      text: `Pair with nuts or yogurt to slow sugar absorption and increase satiety.`,
      priority: 65,
      facts: ['sugar_protein_pairing']
    });
  }
  
  // Goal-specific nudges
  if (user?.goals?.includes('weight_loss') && facts.calorieHigh) {
    suggestions.push({
      type: 'portion',
      text: `High calorie density (${Math.round(facts.calories)} cal). Consider half portion or save for post-workout.`,
      priority: 70,
      facts: ['weight_loss_calories']
    });
  }
  
  return suggestions;
}

/**
 * Infer product category from name
 */
function inferCategory(productName: string): string {
  const name = productName.toLowerCase();
  
  if (name.includes('bar') || name.includes('granola')) return 'bars';
  if (name.includes('candy') || name.includes('gum')) return 'candy';
  if (name.includes('drink') || name.includes('soda')) return 'beverages';
  if (name.includes('chip') || name.includes('crisp')) return 'snacks';
  if (name.includes('yogurt') || name.includes('milk')) return 'dairy';
  
  return 'general';
}

/**
 * Generate category-specific swap suggestions
 */
function generateSwapSuggestion(category: string, facts: any): Suggestion | null {
  const swaps: Record<string, string> = {
    bars: facts.sugarHigh ? 
      'Try nuts, seeds, or homemade oat bars with dates instead of processed bars.' :
      'Look for bars with whole grains and minimal ingredients.',
    
    candy: 'Consider fruit, dark chocolate (70%+), or naturally sweet dates as alternatives.',
    
    beverages: facts.sugarHigh ? 
      'Try sparkling water with fresh fruit, herbal tea, or diluted 100% juice.' :
      'Look for unsweetened versions or make your own infusions.',
    
    snacks: 'Consider air-popped popcorn, veggie chips, or roasted chickpeas for healthier crunch.',
    
    dairy: facts.sugarHigh ? 
      'Try plain yogurt with fresh berries or unsweetened plant milk.' :
      'Look for organic or grass-fed options with minimal processing.',
    
    general: 'Look for options with fewer ingredients and recognizable whole foods.'
  };
  
  const swapText = swaps[category];
  if (!swapText) return null;
  
  return {
    type: 'swap',
    text: swapText,
    priority: 75,
    facts: [`category_swap_${category}`]
  };
}

/**
 * Cache suggestions to avoid recomputation
 */
const suggestionCache = new Map<string, { suggestions: Suggestion[]; expiry: number }>();

export async function getCachedSuggestions(context: SuggestionContext): Promise<Suggestion[]> {
  const cacheKey = `${context.report.itemName}_${context.user?.goals?.join(',')}_${context.portionGrams}_${new Date().toDateString()}`;
  
  const cached = suggestionCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.suggestions;
  }
  
  const suggestions = await buildSuggestions(context);
  
  // Cache for 24 hours
  suggestionCache.set(cacheKey, {
    suggestions,
    expiry: Date.now() + 24 * 60 * 60 * 1000
  });
  
  return suggestions;
}