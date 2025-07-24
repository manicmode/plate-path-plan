import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Database, Shield, Activity } from 'lucide-react';

interface DatabaseErrorPattern {
  type: string;
  count: number;
  lastOccurrence: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixAvailable: boolean;
}

export const AdvancedDatabaseErrorDetection = () => {
  const [errorPatterns, setErrorPatterns] = useState<DatabaseErrorPattern[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const analyzeErrorPatterns = useCallback(async () => {
    try {
      setIsMonitoring(true);
      
      // Query recent security events for database errors
      const { data: securityEvents, error } = await supabase
        .from('security_events')
        .select('*')
        .in('event_type', ['invalid_uuid', 'constraint_violation', 'database_error'])
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch security events:', error);
        return;
      }

      // Analyze error patterns
      const patterns: Record<string, DatabaseErrorPattern> = {};
      
      securityEvents?.forEach(event => {
        const key = event.event_type;
        if (!patterns[key]) {
          patterns[key] = {
            type: key,
            count: 0,
            lastOccurrence: event.created_at,
            severity: 'low',
            autoFixAvailable: key === 'invalid_uuid' || key === 'constraint_violation'
          };
        }
        
        patterns[key].count++;
        if (new Date(event.created_at) > new Date(patterns[key].lastOccurrence)) {
          patterns[key].lastOccurrence = event.created_at;
        }
      });

      // Determine severity based on frequency
      Object.values(patterns).forEach(pattern => {
        if (pattern.count > 50) {
          pattern.severity = 'critical';
        } else if (pattern.count > 20) {
          pattern.severity = 'high';
        } else if (pattern.count > 5) {
          pattern.severity = 'medium';
        }
      });

      setErrorPatterns(Object.values(patterns));
      setLastCheck(new Date());

      // Alert on critical patterns
      const criticalPatterns = Object.values(patterns).filter(p => p.severity === 'critical');
      if (criticalPatterns.length > 0) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.CRITICAL_ERROR,
          eventDetails: {
            action: 'critical_database_error_pattern_detected',
            patterns: criticalPatterns,
            context: 'advanced_database_error_detection'
          },
          severity: 'critical'
        });

        toast.error(`Critical database error pattern detected: ${criticalPatterns[0].type} (${criticalPatterns[0].count} occurrences)`);
      }

    } catch (error) {
      console.error('Error analyzing database patterns:', error);
    } finally {
      setIsMonitoring(false);
    }
  }, []);

  const triggerAutoFix = useCallback(async (pattern: DatabaseErrorPattern) => {
    try {
      let fixApplied = false;
      
      if (pattern.type === 'invalid_uuid') {
        // Clean up invalid UUIDs from localStorage
        const storageKeys = Object.keys(localStorage);
        let cleanedCount = 0;
        
        storageKeys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value === 'undefined' || value === 'null' || value === '') {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        });
        
        if (cleanedCount > 0) {
          fixApplied = true;
          toast.success(`Auto-fixed: Cleaned ${cleanedCount} invalid UUID entries`);
        }
      }
      
      if (pattern.type === 'constraint_violation') {
        // Clean up invalid notification preferences
        const keys = Object.keys(localStorage);
        let cleanedCount = 0;
        
        keys.forEach(key => {
          if (key.includes('notification') || key.includes('preferences')) {
            try {
              const value = localStorage.getItem(key);
              if (value) {
                const parsed = JSON.parse(value);
                if (typeof parsed !== 'object' || parsed === null) {
                  localStorage.removeItem(key);
                  cleanedCount++;
                }
              }
            } catch {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        });
        
        if (cleanedCount > 0) {
          fixApplied = true;
          toast.success(`Auto-fixed: Cleaned ${cleanedCount} invalid notification entries`);
        }
      }
      
      if (fixApplied) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SYSTEM_RECOVERY,
          eventDetails: {
            action: 'database_error_auto_fix_applied',
            patternType: pattern.type,
            context: 'advanced_database_error_detection'
          },
          severity: 'low'
        });
        
        // Re-analyze patterns after fix
        setTimeout(analyzeErrorPatterns, 2000);
      }
      
    } catch (error) {
      console.error('Auto-fix failed:', error);
      toast.error('Auto-fix failed. Manual intervention may be required.');
    }
  }, [analyzeErrorPatterns]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  useEffect(() => {
    // Initial analysis
    analyzeErrorPatterns();
    
    // Set up periodic monitoring (every 5 minutes)
    const monitoringInterval = setInterval(analyzeErrorPatterns, 5 * 60 * 1000);
    
    return () => {
      clearInterval(monitoringInterval);
    };
  }, [analyzeErrorPatterns]);

  if (errorPatterns.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-500/20 bg-orange-50/10">
      <CardHeader className="flex flex-row items-center space-y-0 pb-3">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-orange-500" />
          <CardTitle className="text-lg">Database Error Patterns</CardTitle>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          {isMonitoring && <Activity className="w-4 h-4 text-orange-500 animate-pulse" />}
          <Badge variant="outline" className="text-xs">
            {lastCheck ? `Last check: ${lastCheck.toLocaleTimeString()}` : 'Analyzing...'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription>
          Detected recurring database error patterns that may indicate security or data integrity issues.
        </CardDescription>
        
        {errorPatterns.map((pattern) => (
          <div key={pattern.type} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <div>
                <div className="font-medium">{pattern.type.replace('_', ' ').toUpperCase()}</div>
                <div className="text-sm text-muted-foreground">
                  {pattern.count} occurrences in last 2 hours
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={`${getSeverityColor(pattern.severity)} text-white`}>
                {pattern.severity}
              </Badge>
              {pattern.autoFixAvailable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => triggerAutoFix(pattern)}
                  className="flex items-center space-x-1"
                >
                  <Shield className="w-3 h-3" />
                  <span>Auto-Fix</span>
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};