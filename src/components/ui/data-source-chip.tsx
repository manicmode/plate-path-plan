import React from 'react';
import { Badge } from './badge';
import { Database, Globe, Beaker, Sparkles, CheckCircle } from 'lucide-react';

interface DataSourceChipProps {
  source: "FDC" | "EDAMAM" | "NUTRITIONIX" | "CURATED" | "ESTIMATED";
  confidence?: number;
  className?: string;
}

const SOURCE_CONFIG = {
  FDC: {
    label: 'USDA',
    icon: Database,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description: 'USDA Food Data Central'
  },
  EDAMAM: {
    label: 'Edamam',
    icon: Globe,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Edamam Food Database'
  },
  NUTRITIONIX: {
    label: 'Nutritionix',
    icon: CheckCircle,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    description: 'Nutritionix Database'
  },
  CURATED: {
    label: 'Curated',
    icon: CheckCircle,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    description: 'Manually Curated Data'
  },
  ESTIMATED: {
    label: 'Estimated',
    icon: Sparkles,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    description: 'AI-Estimated Nutrition'
  }
};

export function DataSourceChip({ source, confidence, className }: DataSourceChipProps) {
  const config = SOURCE_CONFIG[source];
  const Icon = config.icon;
  
  const isLowConfidence = confidence !== undefined && confidence < 0.7;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge 
        variant="secondary" 
        className={`${config.color} text-xs font-medium`}
        title={config.description}
      >
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
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