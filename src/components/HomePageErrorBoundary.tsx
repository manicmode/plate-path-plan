import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class HomePageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 HOME PAGE ERROR:', error);
    console.error('🚨 HOME PAGE ERROR STACK:', error?.stack);
    console.error('🚨 HOME PAGE ERROR INFO:', errorInfo);
    
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex items-start gap-3">
              <div className="text-destructive text-2xl">🚨</div>
              <div className="flex-1 space-y-3">
                <h2 className="text-xl font-bold text-destructive">Home Page Render Error</h2>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Error Details:</p>
                  <div className="bg-muted p-3 rounded text-sm font-mono break-words">
                    {this.state.error?.message || 'Unknown error occurred while rendering the Home page'}
                  </div>
                  {this.state.error?.stack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 bg-muted p-2 rounded text-xs whitespace-pre-wrap break-words">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                        Component Stack
                      </summary>
                      <pre className="mt-2 bg-muted p-2 rounded text-xs whitespace-pre-wrap break-words">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    Reload Page
                  </button>
                  <button 
                    onClick={() => window.location.href = '/'} 
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                  >
                    Go to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default HomePageErrorBoundary;