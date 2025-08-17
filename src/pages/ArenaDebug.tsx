import React from 'react';
import { ArenaDebugPanel } from '@/components/debug/ArenaDebugPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ArenaDebug() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Arena Debug Tools</h1>
      
      <div className="space-y-6">
        <ArenaDebugPanel />
        
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <strong>Test the Arena Billboard Pipeline:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Click "+1 Point & Recompute" to award yourself 1 point</li>
                <li>Navigate to Arena Billboard to verify you appear at rank 1</li>
                <li>Test with multiple users to verify ranking works</li>
                <li>Check console for debug information</li>
              </ol>
            </div>
            
            <div>
              <strong>Expected Results:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>User receives 1 point in arena_events table</li>
                <li>Billboard updates to show user with score &gt; 0</li>
                <li>Ranking adjusts based on scores</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}