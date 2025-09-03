// Client-side debug environment setup
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';

export const ClientDebugEnv: React.FC = () => {
  const [debugEnabled, setDebugEnabled] = React.useState(() => {
    return localStorage.getItem('VITE_DEBUG_CLIENT') === 'true';
  });

  useEffect(() => {
    // Set the environment variable for the current session
    if (debugEnabled) {
      (window as any).VITE_DEBUG_CLIENT = 'true';
      localStorage.setItem('VITE_DEBUG_CLIENT', 'true');
    } else {
      (window as any).VITE_DEBUG_CLIENT = 'false';
      localStorage.setItem('VITE_DEBUG_CLIENT', 'false');
    }
  }, [debugEnabled]);

  const toggleDebug = () => {
    setDebugEnabled(!debugEnabled);
  };

  const clearLogs = () => {
    console.clear();
    console.log('[DEBUG] Console cleared');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Debug Environment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="debug-toggle" className="text-sm font-medium">
            Client Debug Logging
          </label>
          <Toggle
            id="debug-toggle"
            pressed={debugEnabled}
            onPressedChange={toggleDebug}
          >
            {debugEnabled ? 'ON' : 'OFF'}
          </Toggle>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <div>DEBUG_CLIENT: {debugEnabled ? 'true' : 'false'}</div>
          <div>DEV Mode: {import.meta.env.DEV ? 'true' : 'false'}</div>
        </div>

        <div className="flex gap-2">
          <Button onClick={clearLogs} variant="outline" size="sm">
            Clear Console
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
          >
            Reload App
          </Button>
        </div>

        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          <strong>Note:</strong> Changes take effect immediately. Reload the app to see debug logs from the start.
        </div>
      </CardContent>
    </Card>
  );
};