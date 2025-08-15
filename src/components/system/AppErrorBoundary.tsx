import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: any) { console.error('AppErrorBoundary', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h1>Something went wrong</h1>
          <p>We hit a hiccup. Try reloading in a moment.</p>
        </div>
      );
    }
    return this.props.children;
  }
}