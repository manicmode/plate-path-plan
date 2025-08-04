import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingDown, AlertTriangle } from 'lucide-react';
import { WeakMuscleGroups } from '@/hooks/useBodyScanResults';

interface SkipAdaptations {
  hasAdaptations: boolean;
  summary: string;
}

interface BodyScanSummaryProps {
  weakMuscleGroups: WeakMuscleGroups | null;
  skipAdaptations?: SkipAdaptations | null;
}

export function BodyScanSummary({ weakMuscleGroups, skipAdaptations }: BodyScanSummaryProps) {
  // Don't show if no data available
  if (!weakMuscleGroups && !skipAdaptations?.hasAdaptations) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Body Scan Summary */}
      {weakMuscleGroups && weakMuscleGroups.groups.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    🧠 This routine emphasizes:
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {weakMuscleGroups.groups.map((group) => (
                    <Badge 
                      key={group}
                      variant="secondary" 
                      className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                    >
                      <TrendingDown className="mr-1 h-3 w-3" />
                      {group}
                      <span className="ml-1 text-xs opacity-75">
                        ({Math.round(weakMuscleGroups.scores[group])})
                      </span>
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Based on your Body Scan results, we've increased focus on these muscle groups to help balance your development.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skip Adaptation Summary */}
      {skipAdaptations?.hasAdaptations && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    ⚠️ Adapted this plan based on your skipped sets last week
                  </h3>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {skipAdaptations.summary}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}