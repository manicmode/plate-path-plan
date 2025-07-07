
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Brain } from 'lucide-react';
import { SectionHeader } from '@/components/analytics/ui/SectionHeader';

export const SmartInsightsSection = () => {
  return (
    <div>
      <SectionHeader icon={Brain} title="Smart Insights" subtitle="Personalized recommendations" />
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-l-4 border-green-500 shadow-sm">
              <div className="text-sm text-green-700 dark:text-green-300 font-semibold">🎯 Excellent Progress!</div>
              <div className="text-gray-900 dark:text-gray-100 text-sm mt-1">You hit your protein target 5 days in a row. Amazing consistency!</div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-l-4 border-yellow-500 shadow-sm">
              <div className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold">💡 Optimization Tip</div>
              <div className="text-gray-900 dark:text-gray-100 text-sm mt-1">Consider lowering sugar intake — 3 days this week exceeded 50g.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
