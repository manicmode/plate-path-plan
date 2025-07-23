import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const DailyNutritionSummary: React.FC = () => {
  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle>Daily Nutrition Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Nutrition summary coming soon...</p>
      </CardContent>
    </Card>
  );
};