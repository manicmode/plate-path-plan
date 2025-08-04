import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingDown } from 'lucide-react';
import { WeakMuscleGroups } from '@/hooks/useBodyScanResults';

interface BodyScanSummaryProps {
  weakMuscleGroups: WeakMuscleGroups | null;
}

export function BodyScanSummary({ weakMuscleGroups }: BodyScanSummaryProps) {
  if (!weakMuscleGroups || weakMuscleGroups.groups.length === 0) {
    return null;
  }

  return (
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
  );
}