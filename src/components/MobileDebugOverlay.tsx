import React from 'react';
import { useAuth } from '@/contexts/auth';

export const MobileDebugOverlay: React.FC = () => {
  try {
    const auth = useAuth();
    
    const debugData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      auth: {
        session: auth?.session ? {
          user_id: auth.session.user?.id,
          email: auth.session.user?.email,
          email_confirmed_at: auth.session.user?.email_confirmed_at,
          access_token: auth.session.access_token ? 'present' : 'missing',
          refresh_token: auth.session.refresh_token ? 'present' : 'missing'
        } : null,
        loading: auth?.loading,
        user: auth?.user ? {
          id: auth.user.id,
          email: auth.user.email,
          selectedTrackers: auth.user.selectedTrackers
        } : null,
        isAuthenticated: auth?.isAuthenticated,
        isEmailConfirmed: auth?.isEmailConfirmed
      },
      routing: {
        currentPath: window.location.pathname,
        shouldRedirectToSignIn: !auth?.loading && auth?.session === null,
        redirectedToSignIn: !auth?.loading && auth?.session === null && window.location.pathname !== '/sign-in',
        isOnProtectedRoute: !['/sign-in', '/', '/auth', '/reset-password'].includes(window.location.pathname)
      },
      localStorage: (() => {
        try {
          const keys = Object.keys(localStorage);
          const authKeys = keys.filter(k => k.includes('supabase') || k.includes('sb-'));
          return {
            totalKeys: keys.length,
            authKeys: authKeys.length,
            authKeysList: authKeys.slice(0, 5) // First 5 auth keys
          };
        } catch (e) {
          return { error: 'localStorage unavailable' };
        }
      })(),
      window: {
        location: window.location.href,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      }
    };

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 9999,
          overflow: 'auto',
          padding: '10px',
          pointerEvents: 'none' // Allow clicks to pass through
        }}
      >
        <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
          🐛 MOBILE DEBUG OVERLAY
        </div>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word',
          fontSize: '11px',
          lineHeight: '1.2'
        }}>
          {JSON.stringify(debugData, null, 2)}
        </pre>
      </div>
    );
  } catch (error) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 0, 0, 0.9)',
          color: 'white',
          fontSize: '14px',
          fontFamily: 'monospace',
          zIndex: 9999,
          padding: '10px',
          pointerEvents: 'none'
        }}
      >
        <div style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
          🚨 DEBUG OVERLAY CRASH
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }, null, 2)}
        </pre>
      </div>
    );
  }
};