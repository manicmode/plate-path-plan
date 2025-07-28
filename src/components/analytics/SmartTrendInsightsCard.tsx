import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';

interface TrendData {
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

interface SmartTrendInsightsCardProps {
  trends: TrendData[];
  insights: string[];
}

export const SmartTrendInsightsCard = ({ trends, insights }: SmartTrendInsightsCardProps) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="w-full shadow-lg bg-card dark:!border-2 dark:!border-indigo-500/60 dark:bg-gradient-to-r dark:from-indigo-500/30 dark:to-blue-500/30">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          📈 Smart Trend Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-2">
          {/* Trend Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trends.map((trend, index) => (
              <div key={index} className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{trend.metric}</span>
                  {getTrendIcon(trend.trend)}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">{trend.value}</span>
                  <span className="text-xs text-muted-foreground">{trend.unit}</span>
                </div>
                <div className={`text-xs mt-1 ${getTrendColor(trend.trend)}`}>
                  {trend.change > 0 ? '+' : ''}{trend.change}% vs last month
                </div>
              </div>
            ))}
          </div>

          {/* AI Insights */}
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              AI Insights
            </h4>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border-l-4 border-primary">
                  <p className="text-sm text-foreground">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};