import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Users, Trash2, RefreshCw, AlertTriangle, CheckCircle, Award } from 'lucide-react';
import { toast } from 'sonner';

interface CleanupResult {
  deletedUsers: number;
  deletedProfiles: number;
  errors: string[];
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [isBatchEvaluating, setIsBatchEvaluating] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);
  
  // Simple admin check - in a real app, you'd have proper role-based access
  const isAdmin = user?.email?.includes('admin') || user?.email?.includes('test');

  const runBatchMealEvaluation = async () => {
    setIsBatchEvaluating(true);
    setBatchResult(null);
    
    try {
      console.log('🔄 Starting batch meal quality evaluation...');
      
      const { data, error } = await supabase.functions.invoke('batch-evaluate-meals', {
        body: { limit: 1000, offset: 0 }
      });

      if (error) {
        console.error('Batch evaluation error:', error);
        toast.error('Failed to start batch evaluation: ' + error.message);
        return;
      }

      console.log('Batch evaluation result:', data);
      setBatchResult(data);
      
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Batch evaluation failed');
      }
      
    } catch (error: any) {
      console.error('Batch evaluation error:', error);
      toast.error('Failed to start batch evaluation: ' + error.message);
    } finally {
      setIsBatchEvaluating(false);
    }
  };

  const runManualCleanup = async () => {
    setIsLoading(true);
    setCleanupResult(null);
    
    try {
      console.log('🧹 Starting manual cleanup...');
      
      const { data, error } = await supabase.functions.invoke('cleanup-unverified-accounts', {
        body: { manual: true }
      });

      if (error) {
        console.error('Cleanup error:', error);
        toast.error('Failed to run cleanup: ' + error.message);
        return;
      }

      console.log('Cleanup result:', data);
      setCleanupResult(data.result);
      
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Cleanup failed');
      }
      
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast.error('Failed to run cleanup: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-semibold">Access Restricted</h3>
            <p className="text-muted-foreground">
              This admin dashboard is only available to authorized users.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center space-x-2">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Badge variant="destructive">Admin Only</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cleanup Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5" />
              <span>Account Cleanup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will permanently delete all unverified accounts older than 24 hours and their associated data.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={runManualCleanup} 
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Cleanup...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Run Manual Cleanup
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              <p>• Automatic cleanup runs daily at 2:00 AM UTC</p>
              <p>• Manual cleanup can be run anytime</p>
              <p>• Only affects accounts with unconfirmed emails</p>
            </div>
          </CardContent>
        </Card>

        {/* Cleanup Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Last Cleanup Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cleanupResult ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {cleanupResult.deletedUsers}
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      Users Deleted
                    </div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {cleanupResult.deletedProfiles}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      Profiles Cleaned
                    </div>
                  </div>
                </div>
                
                {cleanupResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">Errors occurred during cleanup:</div>
                      <ul className="mt-2 list-disc list-inside text-sm">
                        {cleanupResult.errors.slice(0, 3).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {cleanupResult.errors.length > 3 && (
                          <li>...and {cleanupResult.errors.length - 3} more</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-6">
                No cleanup has been run yet during this session.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meal Quality Batch Evaluation */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Batch Evaluation Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Meal Quality Batch Evaluation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will evaluate meal quality for all nutrition logs that don't have quality scores yet. Processes up to 1000 records at a time.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={runBatchMealEvaluation} 
              disabled={isBatchEvaluating}
              variant="default"
              className="w-full"
            >
              {isBatchEvaluating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing Meals...
                </>
              ) : (
                <>
                  <Award className="h-4 w-4 mr-2" />
                  Start Batch Evaluation
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              <p>• Evaluates nutrient density, processing level, flagged ingredients</p>
              <p>• Considers user health conditions for personalized scoring</p>
              <p>• Runs in background to avoid timeouts</p>
            </div>
          </CardContent>
        </Card>

        {/* Batch Evaluation Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Batch Evaluation Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {batchResult ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {batchResult.total_logs || 0}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">
                      Total Logs
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {batchResult.estimated_batches || 0}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Estimated Batches
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p><strong>Status:</strong> {batchResult.success ? 'Started successfully' : 'Failed to start'}</p>
                    <p className="mt-1">{batchResult.message}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-6">
                No batch evaluation has been run yet during this session.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Database Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Verification Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert text-sm">
            <h4>Email Confirmation Enforcement:</h4>
            <ul>
              <li>✅ Users must confirm email before accessing the app</li>
              <li>✅ Login attempts with unconfirmed emails are blocked</li>
              <li>✅ Clear messaging guides users to email confirmation</li>
              <li>✅ Frontend email validation prevents fake addresses</li>
            </ul>
            
            <h4>Automated Cleanup:</h4>
            <ul>
              <li>✅ Daily cleanup at 2:00 AM UTC removes unverified accounts older than 24 hours</li>
              <li>✅ Removes user profiles, nutrition logs, and all related data</li>
              <li>✅ Keeps database clean and prevents spam accounts</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;