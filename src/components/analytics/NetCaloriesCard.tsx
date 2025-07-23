import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const NetCaloriesCard: React.FC = () => {
  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle>Net Calories</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Net calories tracking coming soon...</p>
      </CardContent>
    </Card>
  );
};