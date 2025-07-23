import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Activity } from 'lucide-react';

export const StepsCard: React.FC = () => {
  return (
    <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-95 glass-card border-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <Activity className="w-4 h-4 text-green-500" />
            </div>
            <span className="text-sm font-medium">Steps</span>
          </div>
          <Plus className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold">0</p>
        <p className="text-xs text-muted-foreground">steps today</p>
      </CardContent>
    </Card>
  );
};