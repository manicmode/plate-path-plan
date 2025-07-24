import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DatabaseErrorPattern {
  type: string;
  count: number;
  lastOccurrence: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixAvailable: boolean;
}

export const AdvancedDatabaseErrorDetection: React.FC = () => {
  const [errorPatterns, setErrorPatterns] = useState<DatabaseErrorPattern[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');

  const analyzeErrorPatterns = useCallback(async () => {
    try {
      setIsMonitoring(true);
      
      // Fetch recent security events that indicate database errors
      const { data: events, error } = await supabase
        .from('security_events')
        .select('*')
        .in('event_type', ['invalid_uuid', 'constraint_violation', 'database_error'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching security events:', error);
        return;
      }

      // Analyze patterns
      const patterns: { [key: string]: DatabaseErrorPattern } = {};
      
      events?.forEach(event => {
        const key = event.event_type;
        if (!patterns[key]) {
          patterns[key] = {
            type: key,
            count: 0,
            lastOccurrence: event.created_at,
            severity: 'low',
            autoFixAvailable: ['invalid_uuid', 'constraint_violation'].includes(key)
          };
        }
        patterns[key].count++;
        
        // Determine severity based on frequency
        if (patterns[key].count > 50) patterns[key].severity = 'critical';
        else if (patterns[key].count > 20) patterns[key].severity = 'high';
        else if (patterns[key].count > 10) patterns[key].severity = 'medium';
      });

      const patternArray = Object.values(patterns).filter(p => p.count > 0);
      setErrorPatterns(patternArray);
      setLastCheck(new Date().toLocaleTimeString());
      
      // Log critical patterns
      const criticalPatterns = patternArray.filter(p => p.severity === 'critical');
      if (criticalPatterns.length > 0) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.CRITICAL_ERROR,
          eventDetails: {
            context: 'database_error_pattern_analysis',
            criticalPatterns: criticalPatterns.map(p => ({ type: p.type, count: p.count }))
          },
          severity: 'critical'
        });
        
        toast.error(`Critical database error patterns detected: ${criticalPatterns.length} types`);
      }
    } catch (error) {
      console.warn('Error analyzing database patterns:', error);
    } finally {
      setIsMonitoring(false);
    }
  }, []);

  const triggerAutoFix = useCallback(async (pattern: DatabaseErrorPattern) => {
    try {
      toast.info(`Attempting to auto-fix ${pattern.type} issues...`);
      
      switch (pattern.type) {
        case 'invalid_uuid':
          // Clean up invalid UUID values from storage
          let cleanedUuids = 0;
          
          // Clean localStorage
          Object.keys(localStorage).forEach(key => {
            const value = localStorage.getItem(key);
            if (key.includes('id') && (value === 'undefined' || value === 'null' || value === '')) {
              localStorage.removeItem(key);
              cleanedUuids++;
            }
          });
          
          // Clean sessionStorage
          Object.keys(sessionStorage).forEach(key => {
            const value = sessionStorage.getItem(key);
            if (key.includes('id') && (value === 'undefined' || value === 'null' || value === '')) {
              sessionStorage.removeItem(key);
              cleanedUuids++;
            }
          });
          
          toast.success(`Cleaned ${cleanedUuids} invalid UUID entries`);
          break;
          
        case 'constraint_violation':
          // Clean up invalid notification preferences
          let cleanedNotifications = 0;
          
          Object.keys(localStorage).forEach(key => {
            if (key.includes('notification') || key.includes('preferences')) {
              const value = localStorage.getItem(key);
              if (value) {
                try {
                  const data = JSON.parse(value);
                  // Basic validation - remove if structure is invalid
                  if (!data || typeof data !== 'object' || !data.type) {
                    localStorage.removeItem(key);
                    cleanedNotifications++;
                  }
                } catch {
                  localStorage.removeItem(key);
                  cleanedNotifications++;
                }
              }
            }
          });
          
          toast.success(`Cleaned ${cleanedNotifications} invalid notification entries`);
          break;
      }
      
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SYSTEM_RECOVERY,
        eventDetails: {
          context: 'auto_fix_database_errors',
          fixedPattern: pattern.type,
          severity: pattern.severity
        },
        severity: 'low'
      });
      
      // Re-analyze after fix
      setTimeout(analyzeErrorPatterns, 2000);
      
    } catch (error) {
      toast.error(`Auto-fix failed for ${pattern.type}`);
      console.warn('Auto-fix error:', error);
    }
  }, [analyzeErrorPatterns]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      default: return 'secondary';
    }
  };

  useEffect(() => {
    // Initial analysis
    analyzeErrorPatterns();
    
    // Periodic analysis every 10 minutes
    const interval = setInterval(analyzeErrorPatterns, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [analyzeErrorPatterns]);

  if (errorPatterns.length === 0) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 border-destructive">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          Database Error Patterns Detected
          <Badge variant="destructive">{errorPatterns.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {errorPatterns.map((pattern, index) => (
          <div key={index} className="flex items-center justify-between p-2 border rounded">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{pattern.type}</span>
                <Badge variant={getSeverityColor(pattern.severity)}>{pattern.severity}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {pattern.count} occurrences
              </div>
            </div>
            {pattern.autoFixAvailable && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => triggerAutoFix(pattern)}
                className="ml-2"
              >
                Auto-Fix
              </Button>
            )}
          </div>
        ))}
        
        <div className="text-xs text-muted-foreground pt-2 border-t">
          {isMonitoring ? 'Monitoring...' : `Last check: ${lastCheck}`}
        </div>
      </CardContent>
    </Card>
  );
};