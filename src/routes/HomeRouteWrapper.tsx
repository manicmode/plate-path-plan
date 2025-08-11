import { useEffect } from 'react';
import Home from '@/pages/Home';

export default function HomeRouteWrapper() {
  useEffect(() => {
    try {
      sessionStorage.removeItem('__voyagePostOnboarding');
      sessionStorage.removeItem('__voyagePostOnboarding_time');
    } catch {}
    document.body.classList.remove('splash-visible');
    const splash = document.getElementById('SplashRoot');
    if (splash) splash.style.display = 'none';
  }, []);

  return <Home />; // immediate render, no lazy, no null
}