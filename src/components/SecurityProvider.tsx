import React, { createContext, useContext, useEffect } from 'react';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { useSecurityAlerts } from '@/hooks/useSecurityAlerts';

interface SecurityContextType {
  checkActivityRateLimit: (action: string) => Promise<boolean>;
  monitorNavigation: (path: string) => Promise<void>;
  performSecurityCheck: () => Promise<void>;
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
  useSecurityAlerts(); // Initialize security alerts monitoring

  return (
    <SecurityContext.Provider value={securityMonitoring}>
      {children}
    </SecurityContext.Provider>
  );
};