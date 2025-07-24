import React, { createContext, useContext, useEffect } from 'react';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { useSecurityAlerts } from '@/hooks/useSecurityAlerts';
import { useAdvancedThreatDetection } from '@/hooks/useAdvancedThreatDetection';
import { useCSPViolationReporting } from '@/hooks/useCSPViolationReporting';
import { SecurityAlertsManager } from '@/components/security/SecurityAlertsManager';
import { EnhancedThreatDetection } from '@/components/security/EnhancedThreatDetection';
import { DatabaseErrorRecovery } from '@/components/security/DatabaseErrorRecovery';
import { AutomatedSecurityAlerts } from '@/components/security/AutomatedSecurityAlerts';
import { EnhancedInputValidation } from '@/components/security/EnhancedInputValidation';
import { ChartSecurityEnhancer } from '@/components/security/ChartSecurityEnhancer';
import { SecurityAuditAutomation } from '@/components/security/SecurityAuditAutomation';
import { CriticalSecurityManager } from '@/components/security/CriticalSecurityManager';
import { FormSecurityValidator } from '@/components/security/FormSecurityValidator';
import { AdvancedSecurityMonitor } from '@/components/security/AdvancedSecurityMonitor';
import { DatabaseValidationEnforcer } from '@/components/security/DatabaseValidationEnforcer';
import { AutomatedSecurityCompliance } from '@/components/security/AutomatedSecurityCompliance';

interface SecurityContextType {
  checkActivityRateLimit: (action: string) => Promise<boolean>;
  monitorNavigation: (path: string) => Promise<void>;
  performSecurityCheck: () => Promise<void>;
  detectAnomalousActivity: (activity: string, metadata?: any) => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const securityMonitoring = useSecurityMonitoring();
  const { detectAnomalousActivity } = useAdvancedThreatDetection();
  useSecurityAlerts(); // Initialize security alerts monitoring
  useCSPViolationReporting(); // Initialize CSP violation reporting

  const contextValue = {
    ...securityMonitoring,
    detectAnomalousActivity
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      <SecurityAlertsManager />
      <EnhancedThreatDetection />
      <DatabaseErrorRecovery />
      <AutomatedSecurityAlerts />
      <EnhancedInputValidation />
      <ChartSecurityEnhancer />
      <SecurityAuditAutomation />
      <CriticalSecurityManager />
      <FormSecurityValidator />
      <AdvancedSecurityMonitor />
      <DatabaseValidationEnforcer />
      <AutomatedSecurityCompliance />
      {children}
    </SecurityContext.Provider>
  );
};