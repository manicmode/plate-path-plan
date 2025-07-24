import React, { createContext, useContext, useEffect } from 'react';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { useSecurityAlerts } from '@/hooks/useSecurityAlerts';
import { useAdvancedThreatDetection } from '@/hooks/useAdvancedThreatDetection';
import { useCSPViolationReporting } from '@/hooks/useCSPViolationReporting';

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
      {children}
    </SecurityContext.Provider>
  );
};