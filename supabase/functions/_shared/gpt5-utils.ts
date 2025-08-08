/**
 * 🧠 GPT-5 Migration Utilities
 * Centralized utilities for model selection, logging, and API calls
 */

export type GPTModel = 'gpt-5-mini' | 'gpt-5' | 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.1-2025-04-14';

export interface OpenAIRequest {
  model: GPTModel;
  messages: Array<{ role: string; content: any }>;
  max_tokens?: number;
  max_completion_tokens?: number;
  temperature?: number;
  response_format?: { type: string; json_schema?: any };
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GPTCallResult {
  data: any;
  model_used: GPTModel;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  latency_ms: number;
  fallback_used?: boolean;
}

/**
 * Gets the model to use for a specific function
 */
export function getModelForFunction(functionName: string, defaultModel: GPTModel = 'gpt-5'): GPTModel {
  // Check for function-specific override
  const functionOverride = Deno.env.get(`OPENAI_MODEL_${functionName.toUpperCase()}`);
  if (functionOverride) {
    return functionOverride as GPTModel;
  }
  
  // Check for global override
  const globalOverride = Deno.env.get('OPENAI_MODEL');
  if (globalOverride) {
    return globalOverride as GPTModel;
  }
  
  return defaultModel;
}

/**
 * Logs detailed information about model usage (dev only)
 */
export function logModelUsage(
  functionName: string,
  model: GPTModel,
  tokens?: { input: number; output: number; total: number },
  latencyMs?: number,
  fallbackUsed?: boolean
) {
  const isDev = Deno.env.get('DENO_ENV') === 'development';
  if (!isDev) return;

  console.log(`🧠 [${functionName}] Model: ${model}${fallbackUsed ? ' (fallback)' : ''}`);
  if (tokens) {
    console.log(`📊 [${functionName}] Tokens: ${tokens.input} in, ${tokens.output} out, ${tokens.total} total`);
  }
  if (latencyMs) {
    console.log(`⏱️ [${functionName}] Latency: ${latencyMs}ms`);
  }
}

/**
 * Checks if a model is GPT-5
 */
function isGpt5Model(model: string): boolean {
  return model?.startsWith('gpt-5');
}

/**
 * Prepares OpenAI request with model-appropriate token parameter
 */
function prepareOpenAIRequest(request: OpenAIRequest): any {
  const isGpt5 = isGpt5Model(request.model);
  const requestBody: any = {
    model: request.model,
    messages: request.messages,
    response_format: request.response_format
  };

  // GPT-5 models only support default temperature (1.0)
  if (!isGpt5 && request.temperature !== undefined) {
    requestBody.temperature = request.temperature;
  }

  // Use appropriate token parameter based on model
  if (request.max_tokens !== undefined) {
    if (isGpt5) {
      requestBody.max_completion_tokens = request.max_tokens;
    } else {
      requestBody.max_tokens = request.max_tokens;
    }
  }

  return requestBody;
}

/**
 * Makes a centralized OpenAI API call with consistent logging and error handling
 */
export async function callOpenAI(
  functionName: string,
  request: OpenAIRequest,
  fallbackModel?: GPTModel
): Promise<GPTCallResult> {
  const startTime = Date.now();
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const requestBody = prepareOpenAIRequest(request);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${functionName}] OpenAI API error:`, response.status, errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    const tokens = data.usage ? {
      input: data.usage.prompt_tokens,
      output: data.usage.completion_tokens,
      total: data.usage.total_tokens
    } : undefined;

    // Log usage in development
    logModelUsage(functionName, request.model, tokens, latencyMs);

    // Check if we should try fallback for mini models
    const shouldTryFallback = fallbackModel && 
      (request.model === 'gpt-5-mini' || request.model === 'gpt-4o-mini') &&
      isLowConfidenceResponse(content);

    if (shouldTryFallback) {
      console.log(`🔄 [${functionName}] Low confidence detected, trying fallback: ${fallbackModel}`);
      
      const fallbackRequest = { ...request, model: fallbackModel };
      const fallbackResult = await callOpenAI(functionName, fallbackRequest);
      
      return {
        ...fallbackResult,
        fallback_used: true
      };
    }

    return {
      data: parseResponse(content),
      model_used: request.model,
      tokens,
      latency_ms: latencyMs
    };

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error(`❌ [${functionName}] Error after ${latencyMs}ms:`, error);
    throw error;
  }
}

/**
 * Checks if a response indicates low confidence
 */
function isLowConfidenceResponse(content: string): boolean {
  const lowConfidenceIndicators = [
    'I cannot clearly identify',
    'I\'m not sure',
    'difficult to determine',
    'unclear',
    'generic food item',
    'unable to recognize',
    'please provide more details'
  ];
  
  return lowConfidenceIndicators.some(indicator => 
    content.toLowerCase().includes(indicator.toLowerCase())
  );
}

/**
 * Attempts to parse JSON response, falls back to raw text
 */
function parseResponse(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    return { raw_response: content };
  }
}

/**
 * Estimates cost for a model request (in USD cents)
 */
export function estimateCost(model: GPTModel, inputTokens: number, outputTokens: number): number {
  const prices = {
    'gpt-5-mini': { input: 0.00001, output: 0.00004 }, // Estimated
    'gpt-5': { input: 0.002, output: 0.008 }, // Estimated
    'gpt-4o-mini': { input: 0.000015, output: 0.00006 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4.1-2025-04-14': { input: 0.01, output: 0.03 }
  };
  
  const price = prices[model];
  return ((inputTokens * price.input) + (outputTokens * price.output)) * 100;
}