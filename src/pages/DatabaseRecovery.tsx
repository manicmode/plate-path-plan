
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseRecoveryStatus } from '@/components/debug/DatabaseRecoveryStatus';
import { SystemHealthCheck } from '@/components/debug/SystemHealthCheck';
import { MealScoringTestComponent } from '@/components/debug/MealScoringTestComponent';
import { NutritionTargetsTestComponent } from '@/components/debug/NutritionTargetsTestComponent';
import { Shield, Database, Activity } from 'lucide-react';

const DatabaseRecovery = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Recovery Dashboard</h1>
        <p className="text-gray-600">
          Monitor the status of database recovery operations and system health
        </p>
      </div>

      <div className="grid gap-6">
        {/* Recovery Status */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Recovery Status</h2>
          </div>
          <DatabaseRecoveryStatus />
        </section>

        {/* System Health */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold">System Health</h2>
          </div>
          <SystemHealthCheck />
        </section>

        {/* Testing Components */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold">System Tests</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Meal Scoring Test</CardTitle>
              </CardHeader>
              <CardContent>
                <MealScoringTestComponent />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Nutrition Targets Test</CardTitle>
              </CardHeader>
              <CardContent>
                <NutritionTargetsTestComponent />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DatabaseRecovery;
