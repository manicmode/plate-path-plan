import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function DebugOverlay() {
  if (import.meta.env.PROD) return null; // dev only

  const loc = useLocation();
  const [state, setState] = useState<any>({});

  useEffect(() => {
    const payload = {
      path: loc.pathname + loc.search + loc.hash,
      isFinalizing: typeof window !== 'undefined' && sessionStorage.getItem('onb_finalizing') === '1',
      optimistic: typeof window !== 'undefined' && sessionStorage.getItem('onb_completed_optimistic') === '1',
      onbFlagAt: typeof window !== 'undefined' && sessionStorage.getItem('onb_completed_optimistic_at'),
      splashForced: typeof window !== 'undefined' && sessionStorage.getItem('splash_forced') === '1',
    };
    setState(payload);
    // eslint-disable-next-line no-console
    console.info('[DEBUG OVERLAY]', payload);
  }, [loc.key]);

  return (
    <div style={{
      position: 'fixed', bottom: 8, left: 8, zIndex: 9999,
      fontSize: 10, padding: '6px 8px', background: 'rgba(0,0,0,.55)',
      color: '#fff', borderRadius: 6, pointerEvents: 'none'
    }}>
      <div>path: {state.path}</div>
      <div>finalizing: {String(state.isFinalizing)}</div>
      <div>optimistic: {String(state.optimistic)}</div>
      <div>splashForced: {String(state.splashForced)}</div>
    </div>
  );
}
