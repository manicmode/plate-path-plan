import React from 'react';

export function SafeBoundary({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <ErrorBoundaryImpl fallback={fallback}>{children}</ErrorBoundaryImpl>;
}

class ErrorBoundaryImpl extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode }, 
  { hasError: boolean }
> {
  state = { hasError: false };
  
  static getDerivedStateFromError() { 
    return { hasError: true }; 
  }
  
  componentDidCatch(err: any, info: any) { 
    console.error('SafeBoundary caught', err, info); 
  }
  
  render() { 
    return this.state.hasError ? (this.props.fallback ?? null) : this.props.children; 
  }
}