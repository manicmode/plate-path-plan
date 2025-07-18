
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { RecipeStorageManager } from '@/lib/recipeStorage';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface CoachErrorRecoveryProps {
  onRecoveryComplete: () => void;
}

export function CoachErrorRecovery({ onRecoveryComplete }: CoachErrorRecoveryProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySteps, setRecoverySteps] = useState<string[]>([]);

  const performRecovery = async () => {
    if (!user) return;
    
    setIsRecovering(true);
    const steps: string[] = [];
    
    try {
      // Step 1: Clear potentially corrupted storage
      steps.push('Clearing corrupted storage...');
      setRecoverySteps([...steps]);
      
      const storageManager = new RecipeStorageManager(user.id, isMobile);
      storageManager.clearAllRecipes();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 2: Clear other related storage
      steps.push('Cleaning related cache...');
      setRecoverySteps([...steps]);
      
      const keysToClean = [
        `notification_preferences_${user.id}`,
        `coach_messages_${user.id}`,
        `behavior_data_${user.id}`
      ];
      
      keysToClean.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to clear ${key}:`, e);
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Test storage health
      steps.push('Testing storage health...');
      setRecoverySteps([...steps]);
      
      const isHealthy = storageManager.checkStorageHealth();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isHealthy) {
        steps.push('✅ Recovery completed successfully!');
        setRecoverySteps([...steps]);
        
        setTimeout(() => {
          toast.success('Coach page recovered successfully!');
          onRecoveryComplete();
        }, 1000);
      } else {
        throw new Error('Storage health check failed');
      }
      
    } catch (error) {
      console.error('Recovery failed:', error);
      steps.push('❌ Recovery failed - please try refreshing the page');
      setRecoverySteps([...steps]);
      toast.error('Recovery failed. Please refresh the page.');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center space-y-4">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-amber-500" />
        </div>
        
        <h2 className="text-xl font-bold">Coach Page Recovery</h2>
        
        <p className="text-muted-foreground text-sm">
          The Coach page encountered a storage issue. This usually happens when saving recipes on mobile devices with limited storage.
        </p>

        {recoverySteps.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3 text-left">
            <h3 className="font-medium text-sm mb-2">Recovery Progress:</h3>
            <div className="space-y-1">
              {recoverySteps.map((step, index) => (
                <div key={index} className="text-xs flex items-center gap-2">
                  {step.includes('✅') ? (
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                  ) : step.includes('❌') ? (
                    <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                  )}
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button 
            onClick={performRecovery}
            disabled={isRecovering}
            className="w-full"
          >
            {isRecovering ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Recovering...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Recovery
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleRefreshPage}
            disabled={isRecovering}
            className="w-full"
          >
            Refresh Page Instead
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mt-4">
          <p><strong>What this does:</strong></p>
          <ul className="text-left mt-1 space-y-1">
            <li>• Clears corrupted recipe storage</li>
            <li>• Frees up storage space</li>
            <li>• Tests storage functionality</li>
            <li>• Restores Coach page access</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
