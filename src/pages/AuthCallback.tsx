import React from 'react';
import { useAuthCallback } from '@/hooks/useAuthCallback';

export default function AuthCallback() {
  const { isProcessing } = useAuthCallback();

  React.useEffect(() => {
    document.title = 'Auth Callback | VOYAGE';
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section aria-busy={true} aria-live="polite" className="text-center">
        <h1 className="text-xl font-semibold mb-2">Completing sign in…</h1>
        <p className="opacity-80">Please wait while we verify your session.</p>
      </section>
    </main>
  );
}
