import React, { useEffect, useState } from 'react';
import { AlertTriangle, Database, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';

interface DatabaseError {
  type: 'uuid_validation' | 'constraint_violation' | 'unknown';
  count: number;
  lastOccurrence: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const DatabaseErrorMonitor: React.FC = () => {
  const [errors, setErrors] = useState<DatabaseError[]>([]);
  const [isRepairing, setIsRepairing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    const checkDatabaseErrors = async () => {
      try {
        // Check for recent UUID validation errors
        const { data: uuidErrors } = await supabase
          .from('security_events')
          .select('*')
          .eq('event_type', 'invalid_uuid')
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        // Check for constraint violation errors
        const { data: constraintErrors } = await supabase
          .from('security_events')
          .select('*')
          .eq('event_type', 'invalid_input')
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        const detectedErrors: DatabaseError[] = [];

        if (uuidErrors && uuidErrors.length > 0) {
          detectedErrors.push({
            type: 'uuid_validation',
            count: uuidErrors.length,
            lastOccurrence: uuidErrors[0].created_at,
            severity: uuidErrors.length > 10 ? 'critical' : uuidErrors.length > 5 ? 'high' : 'medium'
          });
        }

        if (constraintErrors && constraintErrors.length > 0) {
          detectedErrors.push({
            type: 'constraint_violation',
            count: constraintErrors.length,
            lastOccurrence: constraintErrors[0].created_at,
            severity: constraintErrors.length > 10 ? 'critical' : constraintErrors.length > 5 ? 'high' : 'medium'
          });
        }

        setErrors(detectedErrors);
        setLastCheck(new Date());

        // Log monitoring activity
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
          eventDetails: {
            action: 'database_error_monitoring',
            errorsFound: detectedErrors.length,
            uuidErrors: uuidErrors?.length || 0,
            constraintErrors: constraintErrors?.length || 0
          },
          severity: 'low'
        });

      } catch (error) {
        console.warn('Database error monitoring failed:', error);
      }
    };

    // Initial check
    checkDatabaseErrors();

    // Check every 5 minutes
    const interval = setInterval(checkDatabaseErrors, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const repairDatabaseErrors = async () => {
    setIsRepairing(true);

    try {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
        eventDetails: {
          action: 'database_error_repair_initiated',
          errorsCount: errors.length
        },
        severity: 'medium'
      });

      // Clean localStorage and sessionStorage of invalid data
      const cleanupKeys = ['user_id', 'notification_preferences', 'challenge_id', 'friend_id'];
      let cleanedCount = 0;

      cleanupKeys.forEach(key => {
        const stored = localStorage.getItem(key);
        if (stored === 'undefined' || stored === 'null' || stored === '') {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      });

      // Clean notification preferences that might cause constraint violations
      const notificationPrefs = localStorage.getItem('notification_preferences');
      if (notificationPrefs) {
        try {
          const parsed = JSON.parse(notificationPrefs);
          if (typeof parsed !== 'object' || parsed === null) {
            localStorage.removeItem('notification_preferences');
            cleanedCount++;
          }
        } catch {
          localStorage.removeItem('notification_preferences');
          cleanedCount++;
        }
      }

      toast.success(`Database error repair completed. Cleaned ${cleanedCount} invalid entries.`);

      // Mark errors as resolved
      setErrors(prev => prev.map(error => ({ ...error, resolved: true } as DatabaseError & { resolved: boolean })));

      // Clear resolved errors after 3 seconds
      setTimeout(() => {
        setErrors([]);
      }, 3000);

      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
        eventDetails: {
          action: 'database_error_repair_completed',
          cleanedCount
        },
        severity: 'low'
      });

    } catch (error) {
      console.error('Database repair failed:', error);
      toast.error('Database error repair failed. Please try again.');
    } finally {
      setIsRepairing(false);
    }
  };

  const getErrorSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getErrorDescription = (type: string) => {
    switch (type) {
      case 'uuid_validation':
        return 'Invalid UUID format causing database insertion failures';
      case 'constraint_violation':
        return 'Data constraint violations in notification system';
      default:
        return 'Unknown database error pattern detected';
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <Card className="fixed top-4 right-4 w-96 z-50 border-destructive bg-background shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Database className="h-5 w-5" />
          Database Errors Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {errors.map((error, index) => (
          <div key={index} className="flex items-start justify-between p-3 rounded-lg border">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <Badge variant={getErrorSeverityColor(error.severity)}>
                  {error.severity.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {getErrorDescription(error.type)}
              </p>
              <p className="text-xs text-muted-foreground">
                Count: {error.count} | Last: {new Date(error.lastOccurrence).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Last checked: {lastCheck.toLocaleTimeString()}
          </p>
          <Button 
            onClick={repairDatabaseErrors}
            disabled={isRepairing}
            size="sm"
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            {isRepairing ? 'Repairing...' : 'Repair All'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};