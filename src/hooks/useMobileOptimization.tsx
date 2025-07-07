
import { useState, useEffect } from 'react';

interface MobileOptimizationOptions {
  enableLazyLoading?: boolean;
  memoryThreshold?: number;
  storageQuotaCheck?: boolean;
}

export const useMobileOptimization = (options: MobileOptimizationOptions = {}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLowMemory, setIsLowMemory] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [connectionSpeed, setConnectionSpeed] = useState<string>('unknown');

  useEffect(() => {
    const checkMobileEnvironment = () => {
      // Detect mobile device
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);

      // Check memory constraints
      const memoryInfo = (performance as any).memory;
      if (memoryInfo) {
        const usedMemoryMB = memoryInfo.usedJSHeapSize / 1048576;
        const totalMemoryMB = memoryInfo.totalJSHeapSize / 1048576;
        const memoryUsageRatio = usedMemoryMB / totalMemoryMB;
        
        setIsLowMemory(memoryUsageRatio > (options.memoryThreshold || 0.8));
        
        console.log('Memory status:', {
          used: Math.round(usedMemoryMB) + ' MB',
          total: Math.round(totalMemoryMB) + ' MB',
          ratio: Math.round(memoryUsageRatio * 100) + '%',
          isLowMemory: memoryUsageRatio > (options.memoryThreshold || 0.8)
        });
      }

      // Check storage availability
      if (options.storageQuotaCheck) {
        try {
          localStorage.setItem('__storage_test__', 'test');
          localStorage.removeItem('__storage_test__');
          setStorageAvailable(true);
        } catch (error) {
          console.warn('Storage not available:', error);
          setStorageAvailable(false);
        }
      }

      // Check connection speed
      const connection = (navigator as any).connection;
      if (connection) {
        setConnectionSpeed(connection.effectiveType || 'unknown');
        console.log('Connection info:', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        });
      }
    };

    checkMobileEnvironment();

    // Re-check on visibility change (when app comes back to foreground)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkMobileEnvironment();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [options.memoryThreshold, options.storageQuotaCheck]);

  const optimizeForMobile = (data: any[]) => {
    if (!isMobile) return data;
    
    // Limit data for mobile devices
    if (isLowMemory) {
      return data.slice(0, 10); // Limit to 10 items on low memory
    }
    
    return data.slice(0, 50); // Limit to 50 items on mobile
  };

  const shouldLazyLoad = () => {
    return options.enableLazyLoading && (isMobile || isLowMemory);
  };

  return {
    isMobile,
    isLowMemory,
    storageAvailable,
    connectionSpeed,
    optimizeForMobile,
    shouldLazyLoad
  };
};
