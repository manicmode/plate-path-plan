import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Trash2, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { RecipeStorage } from '@/lib/recipeStorage';

interface CoachErrorRecoveryProps {
  userId?: string;
  onRecoveryComplete?: () => void;
  error?: Error | null;
}

export const CoachErrorRecovery = ({ userId, onRecoveryComplete, error }: CoachErrorRecoveryProps) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<string>('');

  const checkStorageQuota = async (): Promise<{ used: number; quota: number; available: number }> => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const used = estimate.usage || 0;
      return {
        used,
        quota,
        available: quota - used
      };
    }
    return { used: 0, quota: 0, available: 0 };
  };

  const runDiagnostics = async () => {
    setIsRecovering(true);
    setRecoveryStep('Running diagnostics...');
    
    try {
      // Check storage availability
      const storageAvailable = typeof Storage !== 'undefined';
      
      // Check storage quota
      const { used, quota, available } = await checkStorageQuota();
      const quotaPercentage = quota > 0 ? (used / quota) * 100 : 0;
      
      // Check recipe storage
      let recipeCount = 0;
      if (userId) {
        const recipes = RecipeStorage.loadRecipes(userId);
        recipeCount = recipes.length;
      }
      
      setRecoveryStep('Diagnostics complete');
      
      const diagnostics = {
        storageAvailable,
        quotaUsed: quotaPercentage,
        availableSpace: available,
        recipeCount,
        errorMessage: error?.message || 'Unknown error'
      };
      
      toast.success('Diagnostics completed');
      console.log('Storage Diagnostics:', diagnostics);
      
      return diagnostics;
    } catch (err) {
      console.error('Diagnostics failed:', err);
      toast.error('Diagnostics failed');
      return null;
    } finally {
      setIsRecovering(false);
      setRecoveryStep('');
    }
  };

  const clearStorage = async () => {
    if (!userId) {
      toast.error('Cannot clear storage: No user ID');
      return;
    }

    setIsRecovering(true);
    setRecoveryStep('Clearing storage...');
    
    try {
      // Clear recipes
      RecipeStorage.clearAllRecipes(userId);
      
      // Clear other coach-related data
      localStorage.removeItem(`coach_messages_${userId}`);
      localStorage.removeItem(`coach_preferences_${userId}`);
      
      setRecoveryStep('Storage cleared');
      toast.success('Storage cleared successfully');
      
      if (onRecoveryComplete) {
        onRecoveryComplete();
      }
    } catch (err) {
      console.error('Storage clearing failed:', err);
      toast.error('Failed to clear storage');
    } finally {
      setIsRecovering(false);
      setRecoveryStep('');
    }
  };

  const optimizeStorage = async () => {
    if (!userId) {
      toast.error('Cannot optimize: No user ID');
      return;
    }

    setIsRecovering(true);
    setRecoveryStep('Optimizing storage...');
    
    try {
      const recipes = RecipeStorage.loadRecipes(userId);
      const optimizedRecipes = RecipeStorage.optimizeForMobile(recipes, 25);
      
      if (RecipeStorage.saveRecipes(userId, optimizedRecipes)) {
        const saved = recipes.length - optimizedRecipes.length;
        setRecoveryStep('Storage optimized');
        toast.success(`Optimized storage - removed ${saved} old recipes`);
        
        if (onRecoveryComplete) {
          onRecoveryComplete();
        }
      } else {
        throw new Error('Failed to save optimized recipes');
      }
    } catch (err) {
      console.error('Storage optimization failed:', err);
      toast.error('Failed to optimize storage');
    } finally {
      setIsRecovering(false);
      setRecoveryStep('');
    }
  };

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span>Coach Error Recovery</span>
        </CardTitle>
        <CardDescription>
          The AI Coach encountered an error. Use the tools below to diagnose and fix the issue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error.message}
            </AlertDescription>
          </Alert>
        )}

        {recoveryStep && (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              {recoveryStep}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          <Button
            onClick={runDiagnostics}
            disabled={isRecovering}
            variant="outline"
            className="w-full justify-start"
          >
            <Info className="h-4 w-4 mr-2" />
            Run Storage Diagnostics
          </Button>

          <Button
            onClick={optimizeStorage}
            disabled={isRecovering || !userId}
            variant="outline"
            className="w-full justify-start"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Optimize Storage
          </Button>

          <Button
            onClick={clearStorage}
            disabled={isRecovering || !userId}
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Data
          </Button>

          <Button
            onClick={refreshPage}
            disabled={isRecovering}
            variant="default"
            className="w-full justify-start"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};