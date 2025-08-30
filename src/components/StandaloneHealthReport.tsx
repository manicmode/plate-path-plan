/**
 * Standalone Health Report Test Component
 * Used to test V2 Enhanced Health Report in isolation
 */

import React from 'react';
import { renderHealthReport } from '@/lib/health/renderHealthReport';
import type { HealthAnalysisResult } from '@/components/health-check/HealthCheckModal';

// Mock test data for standalone testing
const mockHealthData: HealthAnalysisResult = {
  itemName: 'Test Organic Granola Bar',
  healthScore: 7.2,
  ingredientFlags: [
    {
      ingredient: 'added sugar',
      flag: 'added_sugar',
      severity: 'medium',
      reason: 'Contains added sugars'
    },
    {
      ingredient: 'sodium',
      flag: 'high_sodium',
      severity: 'low',
      reason: 'Moderate sodium content'
    }
  ],
  flags: [
    {
      ingredient: 'added sugar',
      flag: 'added_sugar', 
      severity: 'medium',
      reason: 'Contains added sugars'
    },
    {
      ingredient: 'sodium',
      flag: 'high_sodium',
      severity: 'low',
      reason: 'Moderate sodium content'
    }
  ],
  nutritionData: {
    calories: 150,
    protein: 4,
    fat: 6,
    carbs: 22,
    sugar: 8,
    fiber: 3,
    sodium: 140
  },
  nutritionDataPerServing: {
    energyKcal: 150,
    protein_g: 4,
    fat_g: 6,
    carbs_g: 22,
    sugar_g: 8,
    fiber_g: 3,
    sodium_mg: 140
  },
  ingredientsText: 'Organic oats, organic honey, organic almonds, organic coconut oil, organic cinnamon, sea salt, natural vanilla extract',
  healthProfile: {
    isOrganic: true,
    isGMO: false,
    allergens: ['tree nuts'],
    preservatives: [],
    additives: []
  },
  personalizedWarnings: [],
  suggestions: ['Consider choosing bars with less added sugar', 'Look for options with more fiber'],
  overallRating: 'good'
};

export const StandaloneHealthReport: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(true);

  const handleScanAnother = () => {
    console.log('[STANDALONE] Scan another clicked');
    setIsOpen(false);
    setTimeout(() => setIsOpen(true), 1000); // Reopen for testing
  };

  const handleClose = () => {
    console.log('[STANDALONE] Close clicked');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Standalone Health Report Test</h1>
          <button 
            onClick={() => setIsOpen(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Open V2 Health Report
          </button>
          <p className="text-sm text-muted-foreground">
            This tests V2 Enhanced Health Report with 'standalone' source
          </p>
        </div>
      </div>
    );
  }

  return renderHealthReport({
    result: mockHealthData,
    onScanAnother: handleScanAnother,
    onClose: handleClose,
    analysisData: {
      source: 'standalone', // This triggers V2
      imageUrl: undefined,
      barcode: undefined
    },
    initialIsSaved: false,
    hideCloseButton: false
  });
};