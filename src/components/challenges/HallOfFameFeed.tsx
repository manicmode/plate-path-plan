import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export const HallOfFameFeed: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Hall of Fame</h2>
      </div>

      {/* Stub Content */}
      <div className="text-center py-12">
        <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Hall of Fame</h3>
        <p className="text-muted-foreground">
          Challenge champions will be displayed here soon!
        </p>
      </div>
    </div>
  );
};