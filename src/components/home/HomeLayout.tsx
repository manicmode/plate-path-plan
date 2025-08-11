import * as React from 'react';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  // App.tsx already wraps with Layout. This is a no-op shim.
  return <>{children}</>;
}
