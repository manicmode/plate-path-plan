import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth/useAuth';

interface ThreatPattern {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastOccurrence: Date;
  description: string;
}

export const AdvancedThreatCorrelation: React.FC = () => {
  const { user } = useAuth();
  const [threatPatterns, setThreatPatterns] = useState<ThreatPattern[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    const correlateThreatEvents = async () => {
      try {
        setIsMonitoring(true);
        
        // Get security events from the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data: events, error } = await supabase
          .from('security_events')
          .select('*')
          .gte('created_at', oneHourAgo)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Failed to fetch security events:', error);
          return;
        }

        if (!events || events.length === 0) return;

        // Analyze patterns
        const patterns = new Map<string, ThreatPattern>();

        events.forEach(event => {
          const key = event.event_type;
          const existing = patterns.get(key);
          
          if (existing) {
            existing.count++;
            if (new Date(event.created_at) > existing.lastOccurrence) {
              existing.lastOccurrence = new Date(event.created_at);
            }
          } else {
            patterns.set(key, {
              type: key,
              count: 1,
              severity: (event.severity as 'low' | 'medium' | 'high' | 'critical') || 'low',
              lastOccurrence: new Date(event.created_at),
              description: getPatternDescription(key)
            });
          }
        });

        const patternArray = Array.from(patterns.values());
        setThreatPatterns(patternArray);

        // Check for critical patterns
        const criticalPatterns = patternArray.filter(p => 
          (p.severity === 'critical' && p.count >= 1) ||
          (p.severity === 'high' && p.count >= 3) ||
          (p.severity === 'medium' && p.count >= 10)
        );

        if (criticalPatterns.length > 0) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.AUTOMATED_THREAT_DETECTION,
            eventDetails: {
              patterns: criticalPatterns.map(p => ({
                type: p.type,
                count: p.count,
                severity: p.severity
              })),
              correlationTime: new Date().toISOString(),
              totalEvents: events.length
            },
            severity: 'critical',
            userId: user?.id
          });

          // Show alert for admin users only
          if (user && await isAdminUser(user.id)) {
            toast.error(`Critical security patterns detected: ${criticalPatterns.length} threat types`, {
              duration: 10000,
              action: {
                label: 'View Details',
                onClick: () => console.log('Critical patterns:', criticalPatterns)
              }
            });
          }
        }

        // Auto-response to specific threat patterns
        await autoRespondToThreats(patternArray);

      } catch (error) {
        console.warn('Threat correlation error:', error);
      } finally {
        setIsMonitoring(false);
      }
    };

    const autoRespondToThreats = async (patterns: ThreatPattern[]) => {
      for (const pattern of patterns) {
        // High frequency XSS attempts
        if (pattern.type === 'xss_attempt' && pattern.count >= 5) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.AUTOMATED_THREAT_DETECTION,
            eventDetails: {
              action: 'auto_block_xss',
              pattern: pattern.type,
              count: pattern.count
            },
            severity: 'high',
            userId: user?.id
          });
          
          // Could implement IP blocking or rate limiting here
          console.warn(`Auto-response: High frequency XSS attempts detected (${pattern.count})`);
        }

        // Multiple invalid UUID attempts
        if (pattern.type === 'invalid_uuid' && pattern.count >= 10) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.AUTOMATED_THREAT_DETECTION,
            eventDetails: {
              action: 'suspicious_uuid_activity',
              pattern: pattern.type,
              count: pattern.count
            },
            severity: 'medium',
            userId: user?.id
          });
        }

        // CSS injection attempts
        if (pattern.type === 'css_injection_attempt' && pattern.count >= 3) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.AUTOMATED_THREAT_DETECTION,
            eventDetails: {
              action: 'css_injection_protection',
              pattern: pattern.type,
              count: pattern.count
            },
            severity: 'high',
            userId: user?.id
          });
        }
      }
    };

    // Initial correlation
    correlateThreatEvents();

    // Set up periodic correlation (every 5 minutes)
    const interval = setInterval(correlateThreatEvents, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const isAdminUser = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      return !error && data?.role === 'admin';
    } catch {
      return false;
    }
  };

  const getPatternDescription = (eventType: string): string => {
    const descriptions: Record<string, string> = {
      'xss_attempt': 'Cross-Site Scripting attack attempts detected',
      'invalid_uuid': 'Invalid UUID format in requests',
      'css_injection_attempt': 'CSS injection attacks on chart components',
      'suspicious_activity': 'General suspicious user behavior',
      'login_failure': 'Failed authentication attempts',
      'unauthorized_access': 'Attempts to access restricted resources',
      'rate_limit_exceeded': 'API rate limit violations',
      'constraint_violation': 'Database constraint violations',
      'suspicious_paste': 'Dangerous content pasted into forms'
    };

    return descriptions[eventType] || 'Unknown security event pattern';
  };

  return null;
};

export default AdvancedThreatCorrelation;