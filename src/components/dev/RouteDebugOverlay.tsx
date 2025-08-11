import React from 'react';
import { useLocation } from 'react-router-dom';
import { isDebug } from '@/utils/debugFlag';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';

export default function RouteDebugOverlay() {
  if (!isDebug()) return null;
  
  const loc = useLocation();
  const { isAuthenticated, user } = useAuth();
  const nutrition = useNutrition();
  const isOnboardingComplete = user?.onboardingCompleted || false;
  const homeDataReady = nutrition ? true : false;

  return (
    <div style={{
      position: 'fixed', 
      left: 8, 
      bottom: 8, 
      zIndex: 9999, 
      fontSize: 11,
      background: 'rgba(0,0,0,0.6)', 
      color: '#fff', 
      padding: '6px 8px',
      borderRadius: 8, 
      pointerEvents: 'none',
      fontFamily: 'monospace'
    }}>
      <div>path: {loc.pathname}</div>
      <div>auth: {String(isAuthenticated)}</div>
      <div>onbDone: {String(isOnboardingComplete)}</div>
      <div>homeDataReady: {String(homeDataReady)}</div>
      <div>ts: {new Date().toLocaleTimeString()}</div>
    </div>
  );
}