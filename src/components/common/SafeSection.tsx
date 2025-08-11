import { Component, ReactNode } from 'react';

export function EmptyState({ message = 'No data yet' }: { message?: string }) {
  return <div className="text-sm opacity-60 p-3">{message}</div>;
}

class SectionBoundary extends Component<{ fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any) { console.warn('[SafeSection] caught', err); }
  render() {
    if (this.state.hasError) return this.props.fallback ?? <EmptyState />;
    return this.props.children as any;
  }
}

export default function SafeSection({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <SectionBoundary fallback={fallback}>{children}</SectionBoundary>;
}
