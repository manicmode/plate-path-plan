/**
 * Photo E2E Debug Route
 * Dry-run testing for Photo Flow V2 pipeline stages
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { 
  normalizeOcrResponse, 
  computeScore, 
  computeFlags, 
  toServingNutrition,
  determinePortionPrecedence,
  parsePortionToGrams 
} from '@/lib/health/photoFlowV2Utils';

interface StageResult {
  stage: string;
  timestamp: number;
  duration?: number;
  data: any;
  success: boolean;
  logs: string[];
}

export default function PhotoE2E() {
  const [results, setResults] = useState<StageResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const mockOcrResponse = {
    ok: true,
    summary: {
      text_joined: "NUTRITION FACTS\nServing Size 1 cup (240ml)\nServings Per Container 2\nCalories 150\nTotal Fat 3g\nSaturated Fat 1g\nSodium 170mg\nTotal Carbs 28g\nSugars 24g\nProtein 8g\nIngredients: Milk, Sugar, Cocoa, Natural Vanilla Flavor, Carrageenan",
      words: 45
    },
    labels: ["nutrition label", "dairy product"],
    imageUrl: "https://example.com/test-image.jpg"
  };

  const mockNutritionPer100g = {
    energyKcal: 63,
    protein_g: 3.3,
    carbs_g: 11.7,
    sugar_g: 10,
    fat_g: 1.3,
    fiber_g: 0,
    sodium_mg: 71
  };

  const runE2ETest = async () => {
    setIsRunning(true);
    setResults([]);
    
    const stageResults: StageResult[] = [];
    
    // Stage 1: Feature Flag Check
    console.log('[PHOTO][E2E][START] Running dry-run test');
    const stage1Start = Date.now();
    const v2Enabled = isFeatureEnabled('photo_flow_v2');
    stageResults.push({
      stage: 'feature_flags',
      timestamp: stage1Start,
      duration: Date.now() - stage1Start,
      data: { photo_flow_v2: v2Enabled },
      success: true,
      logs: [`[PHOTO][FLAGS] V2=${v2Enabled}`]
    });

    // Stage 2: OCR Response Normalization
    console.log('[PHOTO][E2E][NORMALIZE] Processing mock OCR response');
    const stage2Start = Date.now();
    const normalized = normalizeOcrResponse(mockOcrResponse);
    stageResults.push({
      stage: 'ocr_normalization',
      timestamp: stage2Start,
      duration: Date.now() - stage2Start,
      data: normalized,
      success: true,
      logs: [
        `[PHOTO][NORMALIZE] text_length=${normalized.text.length}`,
        `[PHOTO][NORMALIZE] labels_count=${normalized.labels.length}`,
        `[PHOTO][NORMALIZE] portion=${normalized.portion || 'none'}`,
        `[PHOTO][NORMALIZE] servings=${normalized.servings || 'none'}`
      ]
    });

    // Stage 3: Portion Precedence
    console.log('[PHOTO][E2E][PORTION] Determining portion precedence');
    const stage3Start = Date.now();
    const portionResult = determinePortionPrecedence(
      normalized.portion,
      null, // user preference
      "1 cup (240ml)", // stated serving
      "250ml" // estimate
    );
    const portionGrams = parsePortionToGrams(portionResult.portion);
    stageResults.push({
      stage: 'portion_precedence',
      timestamp: stage3Start,
      duration: Date.now() - stage3Start,
      data: { ...portionResult, grams: portionGrams },
      success: true,
      logs: [
        `[PHOTO][PORTION] chosen=${portionResult.portion}`,
        `[PHOTO][PORTION] source=${portionResult.source}`,
        `[PHOTO][PORTION] grams=${portionGrams}`
      ]
    });

    // Stage 4: Nutrition Scaling
    console.log('[PHOTO][E2E][NUTRITION] Scaling nutrition to serving');
    const stage4Start = Date.now();
    const servingNutrition = toServingNutrition(mockNutritionPer100g, portionGrams);
    stageResults.push({
      stage: 'nutrition_scaling',
      timestamp: stage4Start,
      duration: Date.now() - stage4Start,
      data: { per100g: mockNutritionPer100g, perServing: servingNutrition, servingG: portionGrams },
      success: true,
      logs: [
        `[PHOTO][NUTRITION] scaling_factor=${portionGrams/100}`,
        `[PHOTO][NUTRITION] calories=${servingNutrition.calories}`,
        `[PHOTO][NUTRITION] protein=${servingNutrition.protein}g`,
        `[PHOTO][NUTRITION] sugar=${servingNutrition.sugar}g`
      ]
    });

    // Stage 5: Flag Computation
    console.log('[PHOTO][E2E][FLAGS] Computing health flags');
    const stage5Start = Date.now();
    const ingredientsText = "Milk, Sugar, Cocoa, Natural Vanilla Flavor, Carrageenan";
    const flags = computeFlags(ingredientsText, ["Carrageenan"]);
    stageResults.push({
      stage: 'flag_computation',
      timestamp: stage5Start,
      duration: Date.now() - stage5Start,
      data: { flags, ingredientsText },
      success: true,
      logs: [
        `[PHOTO][FLAGS] ingredients_length=${ingredientsText.length}`,
        `[PHOTO][FLAGS] flag_count=${flags.length}`,
        ...flags.map(f => `[PHOTO][FLAGS] ${f.key}:${f.severity}`)
      ]
    });

    // Stage 6: Score Computation  
    console.log('[PHOTO][E2E][SCORE] Computing health score');
    const stage6Start = Date.now();
    const healthScore = computeScore(servingNutrition, flags, ingredientsText);
    stageResults.push({
      stage: 'score_computation',
      timestamp: stage6Start,
      duration: Date.now() - stage6Start,
      data: { 
        score: healthScore, 
        inputs: { nutrition: servingNutrition, flags: flags.length, ingredients: ingredientsText.length }
      },
      success: true,
      logs: [
        `[PHOTO][SCORE] final_score=${healthScore}`,
        `[PHOTO][SCORE] flag_penalty=${flags.length * 8}`, // medium flags
        `[PHOTO][SCORE] sugar_penalty=${servingNutrition.sugar > 5 ? (servingNutrition.sugar - 5) * 1.5 : 0}`
      ]
    });

    // Stage 7: Final Assembly
    console.log('[PHOTO][E2E][ASSEMBLY] Assembling final payload');
    const stage7Start = Date.now();
    const finalPayload = {
      productName: "Mock Chocolate Milk",
      healthScore: healthScore / 10, // Convert to 0-10 scale
      nutritionData: servingNutrition,
      flags,
      portion: `${portionGrams}g · ${portionResult.source}`,
      imageUrl: normalized.imageUrl,
      source: 'photo_flow_v2'
    };
    stageResults.push({
      stage: 'final_assembly',
      timestamp: stage7Start,
      duration: Date.now() - stage7Start,
      data: finalPayload,
      success: true,
      logs: [
        `[PHOTO][ASSEMBLY] complete`,
        `[PHOTO][ASSEMBLY] score_0_10=${finalPayload.healthScore}`,
        `[PHOTO][ASSEMBLY] portion_display=${finalPayload.portion}`
      ]
    });

    console.log('[PHOTO][E2E][COMPLETE] All stages completed');
    setResults(stageResults);
    setIsRunning(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Photo Flow V2 - E2E Debug</h1>
        <p className="text-muted-foreground">
          Dry-run testing of the complete Photo Flow V2 pipeline with mock data
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button 
          onClick={runE2ETest} 
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isRunning ? 'Running...' : 'Run E2E Test'}
        </Button>
        
        <Button 
          onClick={clearResults}
          variant="outline"
          disabled={results.length === 0}
        >
          Clear Results
        </Button>

        <Badge variant={isFeatureEnabled('photo_flow_v2') ? 'default' : 'secondary'}>
          V2: {isFeatureEnabled('photo_flow_v2') ? 'ON' : 'OFF'}
        </Badge>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Pipeline Results</h2>
          
          {results.map((result, index) => (
            <Card key={index} className={result.success ? 'border-green-200' : 'border-red-200'}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg capitalize">
                    {result.stage.replace(/_/g, ' ')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'Success' : 'Failed'}
                    </Badge>
                    {result.duration && (
                      <Badge variant="outline">
                        {result.duration}ms
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Logs */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Debug Logs:</h4>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 font-mono text-sm">
                    {result.logs.map((log, logIndex) => (
                      <div key={logIndex} className="text-green-600 dark:text-green-400">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data */}
                <div>
                  <h4 className="font-medium mb-2">Stage Data:</h4>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded p-3">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}