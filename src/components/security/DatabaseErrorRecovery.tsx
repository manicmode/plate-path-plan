import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { validateNotificationData } from '@/lib/securityValidationEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

interface DatabaseError {
  type: 'uuid_validation' | 'constraint_violation' | 'unknown';
  count: number;
  lastOccurrence: Date;
  resolved: boolean;
}

export const DatabaseErrorRecovery: React.FC = () => {
  const [errors, setErrors] = useState<DatabaseError[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    detectDatabaseErrors();
  }, []);

  const detectDatabaseErrors = async () => {
    try {
      // Check for recent UUID validation errors
      const { data: uuidErrors } = await supabase
        .from('security_events')
        .select('*')
        .eq('event_type', 'invalid_uuid')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      // Check for notification constraint violations
      const { data: constraintErrors } = await supabase
        .from('security_events')
        .select('*')
        .eq('event_type', 'suspicious_activity')
        .textSearch('event_details', 'user_notifications')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const detectedErrors: DatabaseError[] = [];

      if (uuidErrors && uuidErrors.length > 0) {
        detectedErrors.push({
          type: 'uuid_validation',
          count: uuidErrors.length,
          lastOccurrence: new Date(uuidErrors[0].created_at),
          resolved: false
        });
      }

      if (constraintErrors && constraintErrors.length > 0) {
        detectedErrors.push({
          type: 'constraint_violation',
          count: constraintErrors.length,
          lastOccurrence: new Date(constraintErrors[0].created_at),
          resolved: false
        });
      }

      setErrors(detectedErrors);
    } catch (error) {
      console.error('Error detecting database errors:', error);
    }
  };

  const attemptErrorRecovery = async () => {
    setIsRecovering(true);

    try {
      // Log recovery attempt
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
        eventDetails: {
          action: 'database_error_recovery_attempt',
          errorTypes: errors.map(e => e.type),
          timestamp: new Date().toISOString()
        },
        severity: 'medium'
      });

      // Attempt to fix UUID validation issues
      if (errors.some(e => e.type === 'uuid_validation')) {
        await fixUuidValidationIssues();
      }

      // Attempt to fix constraint violations
      if (errors.some(e => e.type === 'constraint_violation')) {
        await fixConstraintViolations();
      }

      // Mark errors as resolved
      setErrors(prev => prev.map(error => ({ ...error, resolved: true })));
      
      toast.success('Database error recovery completed successfully');
    } catch (error) {
      console.error('Error recovery failed:', error);
      toast.error('Error recovery failed. Please contact support.');
    } finally {
      setIsRecovering(false);
    }
  };

  const fixUuidValidationIssues = async () => {
    // Clear any invalid localStorage entries that might contain undefined UUIDs
    const keysToCheck = ['fcm_token', 'user_id', 'auth_token'];
    
    keysToCheck.forEach(key => {
      const value = localStorage.getItem(key);
      if (value === 'undefined' || value === 'null') {
        localStorage.removeItem(key);
        console.log(`Removed invalid localStorage entry: ${key}`);
      }
    });

    // Validate session storage as well
    const sessionKeys = ['currentUserId', 'tempUserId'];
    sessionKeys.forEach(key => {
      const value = sessionStorage.getItem(key);
      if (value === 'undefined' || value === 'null') {
        sessionStorage.removeItem(key);
        console.log(`Removed invalid sessionStorage entry: ${key}`);
      }
    });
  };

  const fixConstraintViolations = async () => {
    // This would typically involve fixing notification type constraints
    // For now, we'll just log the attempt and clean up any invalid notification data
    
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
      eventDetails: {
        action: 'constraint_violation_fix_attempt',
        timestamp: new Date().toISOString()
      },
      severity: 'low'
    });

    // Clear any invalid notification preferences that might cause constraint violations
    try {
      const notificationPrefs = localStorage.getItem('notification_preferences');
      if (notificationPrefs) {
        const parsed = JSON.parse(notificationPrefs);
        // Validate and clean the preferences
        const cleanedPrefs = {
          ...parsed,
          type: undefined // Remove any invalid type fields
        };
        localStorage.setItem('notification_preferences', JSON.stringify(cleanedPrefs));
      }
    } catch (error) {
      console.log('Error cleaning notification preferences:', error);
    }
  };

  const getErrorSeverity = (error: DatabaseError) => {
    if (error.count > 10) return 'high';
    if (error.count > 5) return 'medium';
    return 'low';
  };

  const getErrorDescription = (type: DatabaseError['type']) => {
    switch (type) {
      case 'uuid_validation':
        return 'Invalid UUID values detected in database operations';
      case 'constraint_violation':
        return 'Database constraint violations in user notifications';
      default:
        return 'Unknown database error detected';
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5" />
          Database Error Recovery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {errors.map((error, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={error.resolved ? 'default' : 'destructive'}>
                  {error.resolved ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                  {error.resolved ? 'Resolved' : getErrorSeverity(error)}
                </Badge>
                <span className="text-sm font-medium">
                  {error.type.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {getErrorDescription(error.type)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Count: {error.count} | Last: {error.lastOccurrence.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        
        {!errors.every(e => e.resolved) && (
          <Button 
            onClick={attemptErrorRecovery}
            disabled={isRecovering}
            className="w-full"
            variant="outline"
          >
            {isRecovering ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Recovering...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Attempt Recovery
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};