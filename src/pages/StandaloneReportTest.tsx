/**
 * Standalone Report Test Page - Dev Only
 * Tests V2 Enhanced Health Report with entry=standalone
 */

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { renderHealthReport } from '@/lib/health/renderHealthReport';
import type { HealthAnalysisResult } from '@/components/health-check/HealthCheckModal';

// Mock test data for QA testing
const createMockData = (): HealthAnalysisResult => ({
  itemName: 'Organic Granola Bar (Test Data)',
  productName: 'Organic Granola Bar (Test Data)',
  healthScore: 6.8,
  ingredientFlags: [
    {
      ingredient: 'sugar',
      flag: 'added_sugar',
      severity: 'medium',
      reason: 'Contains added sugars which may contribute to blood sugar spikes'
    },
    {
      ingredient: 'sodium',
      flag: 'high_sodium',
      severity: 'low',
      reason: 'Moderate sodium content - monitor daily intake'
    },
    {
      ingredient: 'palm oil',
      flag: 'saturated_fat',
      severity: 'low',
      reason: 'Contains palm oil with saturated fats'
    }
  ],
  flags: [
    {
      ingredient: 'sugar',
      flag: 'added_sugar',
      severity: 'medium',
      reason: 'Contains added sugars which may contribute to blood sugar spikes'
    },
    {
      ingredient: 'sodium',
      flag: 'high_sodium',
      severity: 'low',
      reason: 'Moderate sodium content - monitor daily intake'
    },
    {
      ingredient: 'palm oil',
      flag: 'saturated_fat',
      severity: 'low',
      reason: 'Contains palm oil with saturated fats'
    }
  ],
  nutritionData: {
    calories: 180,
    protein: 5,
    fat: 8,
    carbs: 24,
    sugar: 9,
    fiber: 4,
    sodium: 160
  },
  nutritionDataPerServing: {
    energyKcal: 180,
    protein_g: 5,
    fat_g: 8,
    carbs_g: 24,
    sugar_g: 9,
    fiber_g: 4,
    sodium_mg: 160
  },
  ingredientsText: 'Organic rolled oats, organic honey, organic almonds, organic coconut oil, organic brown rice syrup, organic sunflower seeds, organic cinnamon, sea salt, natural vanilla extract, palm oil',
  healthProfile: {
    isOrganic: true,
    isGMO: false,
    allergens: ['tree nuts'],
    preservatives: [],
    additives: ['palm oil']
  },
  personalizedWarnings: [
    'Consider limiting due to added sugars',
    'Monitor sodium intake if on low-salt diet'
  ],
  suggestions: [
    'Look for bars with less than 6g added sugar',
    'Consider bars with more protein (8g+) for better satiety',
    'Choose options with nuts and seeds for healthy fats'
  ],
  overallRating: 'fair'
});

// Minimal data for basic V2 testing
const createMinimalData = (): HealthAnalysisResult => ({
  itemName: 'Simple Test Product',
  healthScore: 7.5,
  ingredientFlags: [
    {
      ingredient: 'test ingredient',
      flag: 'test_flag',
      severity: 'low',
      reason: 'Test reason for QA'
    }
  ],
  nutritionData: {
    calories: 100,
    protein: 3,
    carbs: 15,
    fat: 2
  },
  nutritionDataPerServing: {
    energyKcal: 100,
    protein_g: 3,
    carbs_g: 15,
    fat_g: 2
  },
  healthProfile: {
    isOrganic: false,
    isGMO: false,
    allergens: [],
    preservatives: [],
    additives: []
  },
  personalizedWarnings: [],
  suggestions: ['Test suggestion for V2'],
  overallRating: 'good',
  ingredientsText: 'Test ingredients for V2 validation'
});

export default function StandaloneReportTest() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);

  // Check if mock mode is enabled
  const useMock = searchParams.get('mock') === 'true';
  const testData = useMock ? createMockData() : createMinimalData();

  useEffect(() => {
    // Harden dev route: ensure forceReport=v2 is always set
    const forceReport = searchParams.get('forceReport');
    if (!forceReport) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('forceReport', 'v2');
      setSearchParams(newParams, { replace: true });
      return;
    }

    // Log route mounting with V2 confirmation
    console.log('[STANDALONE][ROUTE] Mounted /standalone-test', { 
      mock: useMock,
      forceReport,
      route: '/standalone-test',
      v2Confirmed: forceReport === 'v2'
    });
    
    // Mark as ready after a brief delay to ensure proper mounting
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, [useMock, searchParams, setSearchParams]);

  const handleScanAnother = () => {
    console.log('[STANDALONE][ACTION] Scan another clicked');
    navigate('/debug');
  };

  const handleClose = () => {
    console.log('[STANDALONE][ACTION] Close clicked');
    navigate('/debug');
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading V2 Test...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Debug Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/debug')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Debug</span>
            </Button>
            
            <div className="flex items-center space-x-2 text-sm">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md font-mono">
                V2 TEST
              </span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md font-mono text-xs">
                Render: V2 ✓
              </span>
              {useMock && (
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-md font-mono text-xs">
                  MOCK DATA
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* V2 Enhanced Health Report */}
      <Suspense fallback={null}>
        {renderHealthReport({
          result: testData,
          onScanAnother: handleScanAnother,
          onClose: handleClose,
          analysisData: {
            source: 'standalone', // This triggers V2
            imageUrl: undefined,
            barcode: undefined
          },
          initialIsSaved: false,
          hideCloseButton: true
        })}
      </Suspense>

      {/* Debug Info Footer */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-muted/95 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1 max-w-xs">
          <div className="font-mono text-muted-foreground">
            🧪 V2 Test Mode
          </div>
          <div className="text-muted-foreground">
            Route: <code>/standalone-test</code>
          </div>
          <div className="text-muted-foreground">
            Entry: <code>standalone</code>
          </div>
          <div className="text-muted-foreground">
            Mock: <code>{useMock ? 'true' : 'false'}</code>
          </div>
        </div>
      </div>
    </div>
  );
}