import React from 'react';

export function SafeBoundary({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <ErrorBoundaryImpl fallback={fallback}>{children}</ErrorBoundaryImpl>;
}

class ErrorBoundaryImpl extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode }, 
  { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo }
> {
  state = { hasError: false, error: undefined, errorInfo: undefined };
  
  static getDerivedStateFromError(error: Error) { 
    return { hasError: true, error }; 
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) { 
    console.error('[supp-edu] SafeBoundary caught error', error, info);
    this.setState({ error, errorInfo: info });
  }
  
  render() { 
    const isDev = !!((import.meta as any)?.env?.DEV);
    if (this.state.hasError) {
      if (isDev) {
        // DEV-ONLY diagnostic view (tiny, inside the existing card box)
        return (
          <div role="alert" className="text-xs p-3 bg-red-50 border border-red-200 rounded">
            <div className="font-semibold mb-1">Supplement Education Error</div>
            <pre className="whitespace-pre-wrap text-red-600">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            {this.state.errorInfo?.componentStack && (
              <details className="mt-2">
                <summary className="cursor-pointer">Stack</summary>
                <pre className="whitespace-pre-wrap text-xs">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        );
      }
      // Production: keep your current fallback
      return this.props.fallback ?? null;
    }
    return this.props.children; 
  }
}