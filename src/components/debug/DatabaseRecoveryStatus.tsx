
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useDatabaseRecoveryStatus } from '@/hooks/useDatabaseRecoveryStatus';

export const DatabaseRecoveryStatus = () => {
  const { status, loading, error, refreshStatus } = useDatabaseRecoveryStatus();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Checking Database Recovery Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Recovery Status Check Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refreshStatus} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Check
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Database Recovery Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to check recovery status</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const getStatusBadge = (condition: boolean) => {
    return (
      <Badge variant={condition ? "default" : "destructive"}>
        {condition ? "Fixed" : "Issue"}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Database Recovery Status
          <Button
            onClick={refreshStatus}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase 1: Data Cleanup */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Phase 1: Data Cleanup</h3>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.orphanedLogsFixed)}
              <span>Orphaned nutrition logs cleaned</span>
            </div>
            {getStatusBadge(status.orphanedLogsFixed)}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.performanceScoresTable)}
              <span>Performance scores table created</span>
            </div>
            {getStatusBadge(status.performanceScoresTable)}
          </div>
        </div>

        {/* Phase 2: Badge System */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Phase 2: Badge System</h3>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {status.badgesAwarded > 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <span>Badges awarded: {status.badgesAwarded}</span>
            </div>
            <Badge variant={status.badgesAwarded > 0 ? "default" : "secondary"}>
              {status.badgesAwarded > 0 ? "Working" : "No badges yet"}
            </Badge>
          </div>
        </div>

        {/* Phase 3: Rankings */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Phase 3: Rankings</h3>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.yearlyRankingPosition !== null)}
              <span>
                Yearly ranking: {status.yearlyRankingPosition ? `#${status.yearlyRankingPosition}` : 'Not ranked'}
              </span>
            </div>
            {getStatusBadge(status.yearlyRankingPosition !== null)}
          </div>
        </div>

        {/* Data Summary */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Data Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Nutrition logs:</span>
              <span className="ml-2 font-medium">{status.totalNutritionLogs}</span>
            </div>
            <div>
              <span className="text-gray-600">Badges earned:</span>
              <span className="ml-2 font-medium">{status.badgesAwarded}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
