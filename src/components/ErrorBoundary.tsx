
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // Enhanced mobile debugging
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const memoryInfo = (performance as any).memory;
    
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      isMobile,
      memoryUsage: memoryInfo ? {
        used: Math.round(memoryInfo.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memoryInfo.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memoryInfo.jsHeapSizeLimit / 1048576) + ' MB'
      } : 'unavailable',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      localStorage: this.getLocalStorageInfo(),
    });

    // Store error info in state for display
    this.setState({ errorInfo });

    // Try to clear problematic localStorage entries on mobile
    if (isMobile && error.message.includes('localStorage')) {
      try {
        console.log('Attempting to clear localStorage due to mobile error...');
        localStorage.removeItem('notification_preferences');
        localStorage.removeItem('notification_history');
        localStorage.removeItem('behavior_data');
      } catch (e) {
        console.error('Failed to clear localStorage:', e);
      }
    }
  }

  private getLocalStorageInfo() {
    try {
      const keys = Object.keys(localStorage);
      return {
        count: keys.length,
        keys: keys.slice(0, 10), // Only first 10 keys to avoid spam
        size: JSON.stringify(localStorage).length + ' chars'
      };
    } catch (e) {
      return { error: 'Cannot access localStorage' };
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
            <p className="text-muted-foreground">
              {isMobile 
                ? "The app encountered an error on your mobile device. Please try refreshing or clearing your browser cache." 
                : "Please refresh the page to continue"
              }
            </p>
            {this.state.error && (
              <details className="text-left bg-muted p-3 rounded text-sm">
                <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
                <p className="text-xs text-muted-foreground mb-2">
                  {this.state.error.message}
                </p>
                {isMobile && (
                  <p className="text-xs text-muted-foreground">
                    Device: Mobile • Agent: {navigator.userAgent.substring(0, 50)}...
                  </p>
                )}
              </details>
            )}
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 w-full"
              >
                Refresh Page
              </button>
              {isMobile && (
                <button 
                  onClick={() => {
                    try {
                      localStorage.clear();
                      window.location.reload();
                    } catch (e) {
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 w-full text-sm"
                >
                  Clear Cache & Refresh
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
