import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { useAdvancedThreatDetection } from '@/hooks/useAdvancedThreatDetection';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';

interface SecurityAuditContextType {
  lastAuditScore: number | null;
  isAuditRunning: boolean;
  runQuickAudit: () => Promise<void>;
  securityMetrics: {
    threatsDetected: number;
    lastThreatTime: Date | null;
    auditCount: number;
  };
}

const SecurityAuditContext = createContext<SecurityAuditContextType | null>(null);

export const useSecurityAuditContext = () => {
  const context = useContext(SecurityAuditContext);
  if (!context) {
    throw new Error('useSecurityAuditContext must be used within SecurityAuditProvider');
  }
  return context;
};

interface SecurityAuditProviderProps {
  children: React.ReactNode;
}

export const SecurityAuditProvider: React.FC<SecurityAuditProviderProps> = ({ children }) => {
  const [lastAuditScore, setLastAuditScore] = useState<number | null>(null);
  const [isAuditRunning, setIsAuditRunning] = useState(false);
  const [securityMetrics, setSecurityMetrics] = useState({
    threatsDetected: 0,
    lastThreatTime: null as Date | null,
    auditCount: 0
  });

  const { performClientSideAudit } = useSecurityAudit();
  const { detectAnomalousActivity } = useAdvancedThreatDetection();

  const runQuickAudit = async () => {
    if (isAuditRunning) return;
    
    setIsAuditRunning(true);
    try {
      const result = await performClientSideAudit();
      setLastAuditScore(result.score);
      setSecurityMetrics(prev => ({
        ...prev,
        auditCount: prev.auditCount + 1
      }));

      // Log audit completion
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
        eventDetails: { 
          auditScore: result.score,
          issuesFound: result.issues.length,
          auditType: 'quick_audit'
        },
        severity: result.score < 70 ? 'high' : 'medium'
      });

      // Show warning if score is low
      if (result.score < 70) {
        toast.warning(`Security audit completed with score: ${result.score}/100`);
      }
    } catch (error) {
      console.error('Quick audit failed:', error);
      toast.error('Security audit failed');
    } finally {
      setIsAuditRunning(false);
    }
  };

  // Run periodic quick audits
  useEffect(() => {
    const interval = setInterval(runQuickAudit, 300000); // Every 5 minutes
    
    // Run initial audit after a short delay
    const timeout = setTimeout(runQuickAudit, 5000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Monitor for threats and update metrics
  useEffect(() => {
    const handleThreatDetection = () => {
      setSecurityMetrics(prev => ({
        ...prev,
        threatsDetected: prev.threatsDetected + 1,
        lastThreatTime: new Date()
      }));
    };

    // Listen for threat detection events
    window.addEventListener('securityThreatDetected', handleThreatDetection);
    
    return () => {
      window.removeEventListener('securityThreatDetected', handleThreatDetection);
    };
  }, []);

  const contextValue = {
    lastAuditScore,
    isAuditRunning,
    runQuickAudit,
    securityMetrics
  };

  return (
    <SecurityAuditContext.Provider value={contextValue}>
      {children}
    </SecurityAuditContext.Provider>
  );
};