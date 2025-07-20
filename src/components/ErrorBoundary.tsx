
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // Enhanced mobile debugging
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const memoryInfo = (performance as any).memory;
    
    console.error('Enhanced error details:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      isMobile,
      isIOS,
      isSafari,
      memoryUsage: memoryInfo ? {
        used: Math.round(memoryInfo.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memoryInfo.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memoryInfo.jsHeapSizeLimit / 1048576) + ' MB'
      } : 'unavailable',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      localStorage: this.getLocalStorageInfo(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      connection: this.getConnectionInfo()
    });

    // Store error info in state for display
    this.setState({ errorInfo });

    // Enhanced mobile error recovery
    if (isMobile) {
      this.handleMobileErrorRecovery(error);
    }
  }

  private handleMobileErrorRecovery(error: Error) {
    console.log('Attempting mobile error recovery...');
    
    // Clear problematic localStorage entries
    if (error.message.includes('localStorage') || error.message.includes('quota')) {
      try {
        const keysToTry = [
          'notification_preferences',
          'notification_history', 
          'behavior_data',
          'saved_recipes'
        ];
        
        keysToTry.forEach(key => {
          try {
            localStorage.removeItem(key);
            console.log(`Cleared localStorage key: ${key}`);
          } catch (e) {
            console.warn(`Failed to clear ${key}:`, e);
          }
        });
      } catch (e) {
        console.error('Failed to clear localStorage during recovery:', e);
      }
    }

    // Force garbage collection if available
    if ((window as any).gc) {
      try {
        (window as any).gc();
        console.log('Manual garbage collection triggered');
      } catch (e) {
        console.warn('Manual GC failed:', e);
      }
    }
  }

  private getLocalStorageInfo() {
    try {
      const keys = Object.keys(localStorage);
      const totalSize = JSON.stringify(localStorage).length;
      return {
        count: keys.length,
        keys: keys.slice(0, 10),
        totalSize: totalSize + ' chars',
        available: true
      };
    } catch (e) {
      return { 
        error: 'Cannot access localStorage',
        available: false,
        reason: e instanceof Error ? e.message : 'Unknown error'
      };
    }
  }

  private getConnectionInfo() {
    try {
      const connection = (navigator as any).connection;
      if (connection) {
        return {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        };
      }
      return { available: false };
    } catch (e) {
      return { error: 'Connection info unavailable' };
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(`Retry attempt ${this.state.retryCount + 1}/${this.maxRetries}`);
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      console.log('Max retries reached, forcing page reload');
      window.location.reload();
    }
  };

  private handleClearAndReload = () => {
    try {
      // Clear all local storage
      localStorage.clear();
      
      // Clear session storage
      sessionStorage.clear();
      
      // Clear any cached data
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }

      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (e) {
      console.error('Failed to clear data:', e);
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const canRetry = this.state.retryCount < this.maxRetries;
      
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md w-full">
            <div className="text-6xl mb-4">🚨</div>
            <h2 className="text-2xl font-bold text-foreground">App Loading Error</h2>
            <p className="text-muted-foreground">
              {isMobile 
                ? "The app encountered an error on your mobile device. This might be due to storage limits or memory constraints." 
                : "The app encountered an unexpected error."
              }
            </p>
            
            {this.state.error && (
              <details className="text-left bg-muted p-3 rounded text-sm mb-4">
                <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
                <p className="text-xs text-muted-foreground mb-2 break-words">
                  {this.state.error.message}
                </p>
                {isMobile && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Device: Mobile</p>
                    <p>Retries: {this.state.retryCount}/{this.maxRetries}</p>
                    <p>Memory: {this.getLocalStorageInfo().available ? 'Available' : 'Limited'}</p>
                  </div>
                )}
              </details>
            )}

            <div className="space-y-2">
              {canRetry && (
                <button 
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 w-full"
                >
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </button>
              )}
              
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 w-full"
              >
                Refresh Page
              </button>
              
              {isMobile && (
                <button 
                  onClick={this.handleClearAndReload}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 w-full text-sm"
                >
                  Clear All Data & Restart
                </button>
              )}
            </div>

            {isMobile && (
              <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded">
                <p className="font-medium mb-1">Mobile Troubleshooting:</p>
                <ul className="text-left space-y-1">
                  <li>• Try closing other browser tabs</li>
                  <li>• Clear your browser cache</li>
                  <li>• Restart your browser</li>
                  <li>• Try using a different browser</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
