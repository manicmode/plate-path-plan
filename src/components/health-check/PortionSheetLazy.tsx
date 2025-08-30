/**
 * Lazy-loaded Portion Settings Sheet
 * Only loads when needed to avoid bundle bloat
 */

import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Loader2 } from 'lucide-react';

// Lazy load the heavy PortionSheet component
const PortionSheet = React.lazy(() => import('./PortionSheet').then(module => ({
  default: module.PortionSheet
})));

// Loading fallback
const PortionSheetFallback: React.FC = () => (
  <Button variant="outline" size="sm" className="h-8 px-3 text-xs" disabled>
    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
    Loading...
  </Button>
);

// Error boundary for portion sheet
class PortionSheetErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('[REPORT][V2][PORTION][ERROR]', { stage: 'sheet', message: error.message });
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface PortionSheetLazyProps {
  currentGrams: number;
  currentDisplay?: string;
  isEstimated: boolean;
  source: string;
  productData: any;
  nutrition100g: any;
  onPortionChange: (grams: number, display?: string) => void;
  children: React.ReactNode;
  enabled?: boolean;
}

export const PortionSheetLazy: React.FC<PortionSheetLazyProps> = (props) => {
  // If disabled, just render the trigger without functionality
  if (!props.enabled) {
    return <>{props.children}</>;
  }

  return (
    <PortionSheetErrorBoundary fallback={props.children}>
      <Suspense fallback={<PortionSheetFallback />}>
        <PortionSheet {...props} />
      </Suspense>
    </PortionSheetErrorBoundary>
  );
};