import React from 'react';
import { isDebug } from '@/utils/debugFlag';

interface State {
  err?: any;
}

export class RouterErrorBoundary extends React.Component<{children: React.ReactNode}, State> {
  state: State = { err: undefined };

  static getDerivedStateFromError(err: any): State {
    return { err };
  }

  componentDidCatch(err: any, info: any) {
    console.error('[BOUNDARY]', err, info);
  }

  render() {
    if (!this.state.err) return this.props.children;
    if (!isDebug()) return this.props.children; // never block prod UI

    return (
      <div style={{
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.85)', 
        color: '#fff', 
        zIndex: 9998, 
        padding: 24,
        fontFamily: 'monospace',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: 0, marginBottom: 16 }}>Something went wrong</h3>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {String(this.state.err)}
          {this.state.err?.stack && '\n\nStack:\n' + this.state.err.stack}
        </pre>
        <button 
          style={{ marginTop: 16, padding: '8px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
      </div>
    );
  }
}