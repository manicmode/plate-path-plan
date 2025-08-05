import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { routeGPTModel, shouldFallback, getModelDisplayName, type GPTRoutingInput, type GPTTaskConfig } from '@/utils/GPTRouter';

interface GPTRouterResponse {
  data?: any;
  error?: string;
  modelUsed?: string;
  fallbackUsed?: boolean;
  cost?: number;
}

export function useGPTRouter() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastModelUsed, setLastModelUsed] = useState<string>('');

  const executeGPTTask = async (
    input: GPTRoutingInput,
    edgeFunction: string,
    requestBody?: any
  ): Promise<GPTRouterResponse> => {
    setIsLoading(true);
    
    try {
      const config = routeGPTModel(input);
      console.log(`🧠 [GPT Router Hook] Routing to ${config.model} for ${input.taskType}`);
      
      // Prepare request with model configuration
      const body = {
        ...requestBody,
        ...input,
        gptConfig: config
      };

      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body
      });

      if (error) {
        console.error(`🚨 [GPT Router Hook] Edge function error:`, error);
        return { error: error.message };
      }

      const modelUsed = getModelDisplayName(data?.model_used || config.model);
      setLastModelUsed(modelUsed);

      // Check if fallback was used or should be triggered
      let finalData = data;
      let fallbackUsed = data?.fallback_used || false;

      if (!fallbackUsed && config.fallbackModel && data?.response) {
        const shouldTriggerFallback = shouldFallback(data.response, config.model);
        
        if (shouldTriggerFallback) {
          console.log('🔄 [GPT Router Hook] Triggering fallback to', config.fallbackModel);
          
          const fallbackBody = {
            ...body,
            gptConfig: { ...config, model: config.fallbackModel }
          };

          const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke(edgeFunction, {
            body: fallbackBody
          });

          if (!fallbackError && fallbackData) {
            finalData = { ...fallbackData, fallback_used: true };
            fallbackUsed = true;
            setLastModelUsed(getModelDisplayName(config.fallbackModel));
          }
        }
      }

      return {
        data: finalData,
        modelUsed,
        fallbackUsed
      };

    } catch (error) {
      console.error('🚨 [GPT Router Hook] Execution error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeGPTTask,
    isLoading,
    lastModelUsed,
    routeGPTModel
  };
}