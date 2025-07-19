
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: string;
}

export const SystemHealthCheck = () => {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const runHealthChecks = async () => {
    setLoading(true);
    const results: HealthCheck[] = [];

    // Check 1: Authentication
    if (user) {
      results.push({
        name: 'Authentication',
        status: 'healthy',
        message: 'User authenticated',
        details: `User ID: ${user.id}`
      });
    } else {
      results.push({
        name: 'Authentication',
        status: 'error',
        message: 'No authenticated user'
      });
    }

    if (user) {
      // Check 2: User Profile
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        
        if (profile) {
          results.push({
            name: 'User Profile',
            status: 'healthy',
            message: 'Profile loaded successfully',
            details: `Name: ${profile.first_name || 'Not set'} ${profile.last_name || ''}`
          });
        } else {
          results.push({
            name: 'User Profile',
            status: 'warning',
            message: 'Profile not found'
          });
        }
      } catch (error) {
        results.push({
          name: 'User Profile',
          status: 'error',
          message: 'Profile check failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Check 3: Nutrition Logs
      try {
        const { count, error: logsError } = await supabase
          .from('nutrition_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (logsError) throw logsError;

        results.push({
          name: 'Nutrition Logs',
          status: 'healthy',
          message: `${count || 0} nutrition logs found`,
          details: count && count > 0 ? 'Data logging working' : 'No logs yet'
        });
      } catch (error) {
        results.push({
          name: 'Nutrition Logs',
          status: 'error',
          message: 'Could not check nutrition logs',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Check 4: Badges System
      try {
        const { data: badges, error: badgesError } = await supabase
          .from('user_badges')
          .select('badge:badges(*)')
          .eq('user_id', user.id);

        if (badgesError) throw badgesError;

        results.push({
          name: 'Badge System',
          status: badges && badges.length > 0 ? 'healthy' : 'warning',
          message: `${badges?.length || 0} badges earned`,
          details: badges && badges.length > 0 ? 'Badge system working' : 'No badges earned yet'
        });
      } catch (error) {
        results.push({
          name: 'Badge System',
          status: 'error',
          message: 'Badge system check failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Check 5: Rankings
      try {
        const { data: ranking, error: rankingError } = await supabase
          .from('yearly_score_preview')
          .select('*')
          .eq('user_id', user.id)
          .eq('year', new Date().getFullYear())
          .maybeSingle();

        if (rankingError) throw rankingError;

        results.push({
          name: 'Rankings System',
          status: ranking ? 'healthy' : 'warning',
          message: ranking ? `Ranked #${ranking.rank_position}` : 'Not ranked',
          details: ranking ? `Score: ${ranking.yearly_score}` : 'No ranking data'
        });
      } catch (error) {
        results.push({
          name: 'Rankings System',
          status: 'error',
          message: 'Rankings check failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Check 6: Database Tables
    try {
      const { error: performanceError } = await supabase
        .from('daily_performance_scores')
        .select('id')
        .limit(1);

      results.push({
        name: 'Performance Scores Table',
        status: performanceError ? 'error' : 'healthy',
        message: performanceError ? 'Table not accessible' : 'Table accessible',
        details: performanceError ? performanceError.message : 'New table created successfully'
      });
    } catch (error) {
      results.push({
        name: 'Performance Scores Table',
        status: 'error',
        message: 'Table check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setChecks(results);
    setLoading(false);
  };

  useEffect(() => {
    runHealthChecks();
  }, [user]);

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  const healthyCount = checks.filter(c => c.status === 'healthy').length;
  const totalChecks = checks.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          System Health Check
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {healthyCount}/{totalChecks} healthy
            </span>
            <Button
              onClick={runHealthChecks}
              variant="outline"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Running health checks...
          </div>
        ) : (
          <div className="space-y-3">
            {checks.map((check, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{check.name}</h4>
                    <p className="text-sm text-gray-600">{check.message}</p>
                    {check.details && (
                      <p className="text-xs text-gray-500 mt-1">{check.details}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(check.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
