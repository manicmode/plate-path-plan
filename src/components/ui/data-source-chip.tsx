import React from 'react';
import { Badge } from './badge';
import { Database, Globe, Beaker, Sparkles, CheckCircle } from 'lucide-react';
import { sourceBadge } from '@/utils/helpers/sourceBadge';

interface DataSourceChipProps {
  source: string; // Accept any string to handle wider variety of sources
  confidence?: number;
  className?: string;
  brandOverride?: boolean; // optional hygiene override
}

// Normalize source string to handle case variations and aliases
const normalizeSource = (source?: string): string => {
  if (!source) return 'UNKNOWN';
  const s = source.toUpperCase().trim();
  
  // Handle common aliases and variations
  const aliases: Record<string, string> = {
    'OFF': 'OFF',
    'OPENFOODFACTS': 'OFF',
    'OPEN_FOOD_FACTS': 'OFF',
    'FDC': 'FDC',
    'USDA': 'FDC',
    'FOOD_DATA_CENTRAL': 'FDC',
    'EDAMAM': 'EDAMAM',
    'EDAMAMM': 'EDAMAM', // Common typo
    'NUTRITIONIX': 'NUTRITIONIX',
    'CURATED': 'CURATED',
    'GENERIC': 'CURATED',
    'MANUAL': 'CURATED',
    'VOICE': 'CURATED',
    'BARCODE': 'FDC',
    'ENRICHED': 'ESTIMATED',
    'CANONICAL': 'CURATED',
    'LEGACY_TEXT_LOOKUP': 'ESTIMATED',
    'ESTIMATED': 'ESTIMATED'
  };
  
  return aliases[s] || 'UNKNOWN';
};

const SOURCE_CONFIG = {
  FDC: {
    label: 'USDA',
    icon: Database,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description: 'USDA Food Data Central'
  },
  OFF: {
    label: 'OpenFF',
    icon: Globe,
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    description: 'OpenFoodFacts Database'
  },
  EDAMAM: {
    label: 'Edamam',
    icon: Globe,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Edamam Food Database'
  },
  NUTRITIONIX: {
    label: 'Brand',
    icon: CheckCircle,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    description: 'Nutritionix Database'
  },
  CURATED: {
    label: 'Generic',
    icon: CheckCircle,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    description: 'Manually Curated Data'
  },
  ESTIMATED: {
    label: 'Estimated',
    icon: Sparkles,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    description: 'AI-Estimated Nutrition'
  },
  UNKNOWN: {
    label: 'Unknown',
    icon: Database,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    description: 'Unknown Data Source'
  }
} as const;

export function DataSourceChip({ source, confidence, className }: DataSourceChipProps) {
  // Normalize and safely get config
  const normalizedSource = normalizeSource(source);
  const config = SOURCE_CONFIG[normalizedSource as keyof typeof SOURCE_CONFIG] || SOURCE_CONFIG.UNKNOWN;
  
  // Safe fallback for sourceBadge
  let badgeInfo;
  try {
    badgeInfo = sourceBadge(normalizedSource as any);
  } catch (error) {
    console.warn('[DataSourceChip] sourceBadge failed for:', source, error);
    badgeInfo = { label: config.label, source: normalizedSource };
  }
  
  const Icon = config?.icon || Database; // Safe fallback icon
  const isLowConfidence = confidence !== undefined && confidence < 0.7;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge 
        variant="secondary" 
        className={`${config.color} text-xs font-medium`}
        title={config.description}
      >
        <Icon className="w-3 h-3 mr-1" />
        {badgeInfo.label}
      </Badge>
      
      {confidence !== undefined && (
        <Badge 
          variant={isLowConfidence ? "destructive" : "default"} 
          className="text-xs"
          title={`Confidence: ${Math.round(confidence * 100)}%`}
        >
          {Math.round(confidence * 100)}%
        </Badge>
      )}
      
      {isLowConfidence && (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          <Beaker className="w-3 h-3 mr-1" />
          Estimated
        </Badge>
      )}
    </div>
  );
}