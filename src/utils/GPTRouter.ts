/**
 * 🧠 GPT Smart Router
 * Intelligently routes requests to the most appropriate GPT model based on task complexity
 */

export type GPTModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.1-2025-04-14';

export interface GPTTaskConfig {
  model: GPTModel;
  maxTokens?: number;
  temperature?: number;
  fallbackModel?: GPTModel;
}

export interface GPTRoutingInput {
  text?: string;
  taskType: 'food_analysis' | 'workout_generation' | 'coach_message' | 'report_analysis' | 
           'supplement_recommendation' | 'recovery_recommendation' | 'body_scan_analysis' |
           'ui_formatting' | 'quick_confirmation' | 'reminder_message' | 'predictive_suggestion';
  complexity?: 'simple' | 'medium' | 'complex' | 'auto';
  imageData?: string;
}

/**
 * Analyzes input complexity for automatic routing
 */
function analyzeComplexity(text: string): 'simple' | 'medium' | 'complex' {
  if (!text) return 'simple';
  
  const wordCount = text.trim().split(/\s+/).length;
  const punctuationCount = (text.match(/[,;:.!?]/g) || []).length;
  const hasConjunctions = /\b(and|or|with|plus|including|contains)\b/i.test(text);
  const hasQuantifiers = /\b(\d+\s*(cups?|tbsp|tsp|oz|grams?|lbs?|pieces?|slices?|servings?))\b/i.test(text);
  const hasComplexPhrases = /\b(half|quarter|mixed|combination|variety|assorted)\b/i.test(text);
  
  // Simple: Short, single food items
  if (wordCount <= 3 && punctuationCount <= 1 && !hasConjunctions) {
    return 'simple';
  }
  
  // Complex: Long descriptions, multiple items, detailed measurements
  if (wordCount > 8 || punctuationCount > 2 || (hasConjunctions && hasQuantifiers) || hasComplexPhrases) {
    return 'complex';
  }
  
  // Medium: Everything else
  return 'medium';
}

/**
 * Routes GPT model selection based on task type and complexity
 */
export function routeGPTModel(input: GPTRoutingInput): GPTTaskConfig {
  const { taskType, complexity: userComplexity, text } = input;
  
  // Auto-analyze complexity if not provided
  const complexity = userComplexity === 'auto' || !userComplexity 
    ? (text ? analyzeComplexity(text) : 'medium')
    : userComplexity;

  console.log(`🧠 [GPT Router] Task: ${taskType}, Complexity: ${complexity}${text ? `, Text: "${text.slice(0, 50)}..."` : ''}`);

  // Define routing rules
  switch (taskType) {
    // === FOOD ANALYSIS TASKS ===
    case 'food_analysis':
      if (complexity === 'simple') {
        return {
          model: 'gpt-4o-mini',
          maxTokens: 300,
          temperature: 0.3,
          fallbackModel: 'gpt-4o'
        };
      } else {
        return {
          model: 'gpt-4o',
          maxTokens: 800,
          temperature: 0.4,
          fallbackModel: 'gpt-4.1-2025-04-14'
        };
      }

    // === HIGH-COMPLEXITY REASONING TASKS ===
    case 'workout_generation':
    case 'report_analysis':
    case 'body_scan_analysis':
    case 'supplement_recommendation':
    case 'recovery_recommendation':
      return {
        model: 'gpt-4.1-2025-04-14',
        maxTokens: 1500,
        temperature: 0.7
      };

    // === COACH MESSAGING ===
    case 'coach_message':
      if (complexity === 'simple') {
        return {
          model: 'gpt-4o-mini',
          maxTokens: 200,
          temperature: 0.8,
          fallbackModel: 'gpt-4o'
        };
      } else {
        return {
          model: 'gpt-4o',
          maxTokens: 500,
          temperature: 0.8
        };
      }

    // === LIGHTWEIGHT UI TASKS ===
    case 'ui_formatting':
    case 'quick_confirmation':
    case 'reminder_message':
    case 'predictive_suggestion':
      return {
        model: 'gpt-4o-mini',
        maxTokens: 150,
        temperature: 0.5
      };

    default:
      console.warn(`🚨 [GPT Router] Unknown task type: ${taskType}, defaulting to gpt-4o-mini`);
      return {
        model: 'gpt-4o-mini',
        maxTokens: 500,
        temperature: 0.6
      };
  }
}

/**
 * Checks if a response indicates low confidence and should trigger fallback
 */
export function shouldFallback(response: string, originalModel: GPTModel): boolean {
  if (!response || originalModel !== 'gpt-4o-mini') return false;
  
  const lowConfidenceIndicators = [
    'I cannot clearly identify',
    'I\'m not sure',
    'difficult to determine',
    'unclear',
    'generic food item',
    'unable to recognize',
    'please provide more details'
  ];
  
  const hasLowConfidence = lowConfidenceIndicators.some(indicator => 
    response.toLowerCase().includes(indicator.toLowerCase())
  );
  
  if (hasLowConfidence) {
    console.log('🔄 [GPT Router] Low confidence detected, fallback recommended');
  }
  
  return hasLowConfidence;
}

/**
 * Utility function to get model display name for UI
 */
export function getModelDisplayName(model: GPTModel): string {
  switch (model) {
    case 'gpt-4o-mini':
      return 'GPT-4o Mini';
    case 'gpt-4o':
      return 'GPT-4o';
    case 'gpt-4.1-2025-04-14':
      return 'GPT-4 Turbo';
    default:
      return model;
  }
}

/**
 * Estimates cost for a model request (in USD cents, approximate)
 */
export function estimateCost(model: GPTModel, inputTokens: number, outputTokens: number): number {
  const prices = {
    'gpt-4o-mini': { input: 0.000015, output: 0.00006 }, // $0.15/$0.60 per 1M tokens
    'gpt-4o': { input: 0.0025, output: 0.01 }, // $2.50/$10.00 per 1M tokens  
    'gpt-4.1-2025-04-14': { input: 0.01, output: 0.03 } // $10.00/$30.00 per 1M tokens
  };
  
  const price = prices[model];
  return ((inputTokens * price.input) + (outputTokens * price.output)) * 100; // Convert to cents
}