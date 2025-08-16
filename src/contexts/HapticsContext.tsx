import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setHapticsEnabled } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';

type HapticsContextType = { 
  enabled: boolean; 
  setEnabled: (v: boolean) => void; 
};

const HapticsContext = createContext<HapticsContextType | null>(null);

export function HapticsProvider({ children }: { children: React.ReactNode }) {
  const defaultOn = Capacitor.isNativePlatform() || /Android|iPhone|iPad/i.test(navigator.userAgent);
  
  const [enabled, setEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('haptics_enabled');
    return saved === null ? defaultOn : saved === 'true';
  });

  useEffect(() => { 
    setHapticsEnabled(enabled); 
    localStorage.setItem('haptics_enabled', String(enabled)); 
  }, [enabled]);

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled]);
  
  return (
    <HapticsContext.Provider value={value}>
      {children}
    </HapticsContext.Provider>
  );
}

export const useHapticsPref = () => {
  const ctx = useContext(HapticsContext);
  if (!ctx) throw new Error('HapticsProvider missing');
  return ctx;
};