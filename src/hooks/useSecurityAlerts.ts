import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { useAuth } from '@/contexts/auth';

interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  event_type: string;
  created_at: string;
  event_details?: Record<string, any>;
}

export const useSecurityAlerts = () => {
  const { user } = useAuth();

  // Monitor for critical security events in real-time
  const startRealTimeMonitoring = useCallback(() => {
    if (!user) return;

    const subscription = supabase
      .channel('security_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events',
          filter: `severity=eq.critical`
        },
        (payload) => {
          const event = payload.new as SecurityAlert;
          
          // Show critical alerts to admin users
          if (user.email?.includes('admin') || user.user_metadata?.role === 'admin') {
            toast.error(`Critical Security Alert: ${event.event_type}`, {
              description: `Time: ${new Date(event.created_at).toLocaleString()}`,
              duration: 10000
            });
          }
          
          // Log that we've processed this alert
          logSecurityEvent({
            eventType: 'security_alert_processed',
            eventDetails: { 
              alertId: event.id,
              alertType: event.event_type 
            },
            severity: 'low',
            userId: user.id
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Check for recent high-priority events on mount
  const checkRecentAlerts = useCallback(async () => {
    if (!user) return;

    try {
      const { data: recentAlerts, error } = await supabase
        .from('security_events')
        .select('*')
        .in('severity', ['critical', 'high'])
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (recentAlerts && recentAlerts.length > 0) {
        // Only show to admin users
        if (user.email?.includes('admin') || user.user_metadata?.role === 'admin') {
          toast.warning(`${recentAlerts.length} security event(s) in the last hour`, {
            description: 'Check the security dashboard for details',
            duration: 5000
          });
        }
      }
    } catch (error) {
      console.warn('Failed to check recent security alerts:', error);
    }
  }, [user]);

  // Detect suspicious client-side activity
  const monitorClientSideThreats = useCallback(() => {
    // Monitor for rapid consecutive requests (potential automation)
    let requestCount = 0;
    let requestTimer: NodeJS.Timeout;

    const trackRequest = () => {
      requestCount++;
      
      if (requestCount === 1) {
        requestTimer = setTimeout(() => {
          requestCount = 0;
        }, 60000); // Reset after 1 minute
      }
      
      if (requestCount > 100) { // 100 requests per minute threshold
        logSecurityEvent({
          eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          eventDetails: { 
            threat: 'excessive_client_requests',
            requestCount,
            userAgent: navigator.userAgent
          },
          severity: 'high',
          userId: user?.id
        });
        
        toast.warning('Unusual activity detected. Please refresh the page.');
        requestCount = 0; // Reset to prevent spam
      }
    };

    // Override fetch to monitor requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      trackRequest();
      return originalFetch.apply(this, args);
    };

    // Monitor for suspicious DOM manipulation
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for suspicious script injection
              if (element.tagName === 'SCRIPT' || 
                  element.innerHTML?.includes('<script') ||
                  element.innerHTML?.includes('javascript:')) {
                
                logSecurityEvent({
                  eventType: SECURITY_EVENTS.XSS_ATTEMPT,
                  eventDetails: { 
                    threat: 'dom_script_injection',
                    nodeName: element.tagName,
                    innerHTML: element.innerHTML?.slice(0, 200)
                  },
                  severity: 'critical',
                  userId: user?.id
                });
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });

    return () => {
      clearTimeout(requestTimer);
      window.fetch = originalFetch;
      observer.disconnect();
    };
  }, [user?.id]);

  useEffect(() => {
    const unsubscribeRealTime = startRealTimeMonitoring();
    checkRecentAlerts();
    const unsubscribeClientMonitoring = monitorClientSideThreats();

    return () => {
      unsubscribeRealTime?.();
      unsubscribeClientMonitoring?.();
    };
  }, [startRealTimeMonitoring, checkRecentAlerts, monitorClientSideThreats]);

  return {
    checkRecentAlerts,
    startRealTimeMonitoring
  };
};