import { FF } from '@/featureFlags';

type Mode = 'barcode' | 'photo' | 'voice' | 'manual';

export function PipelineRouter(props: { mode: Mode; children: React.ReactNode }) {
  // Dark-ship: this component won't mount unless FF.PIPELINE_ISOLATION === true
  if (!FF.PIPELINE_ISOLATION) return <>{props.children}</>;
  
  // When enabled later, this will mount only ONE pipeline subtree by mode.
  // For now, just pass through children to maintain existing behavior
  return <>{props.children}</>;
}