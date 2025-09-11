import { useState } from 'react';

export interface ManualFlowState {
  selectedCandidate: any | null;
  enrichmentReady: boolean;
  nutritionReady: boolean;
  uiCommitted: boolean;
  portionDraft: any | null;
}

export function useManualFlowStatus() {
  const [state, setState] = useState<ManualFlowState>({
    selectedCandidate: null,
    enrichmentReady: false,
    nutritionReady: false,
    uiCommitted: false,
    portionDraft: null
  });

  const preConfirmReady =
    state.enrichmentReady && state.nutritionReady && state.uiCommitted;

  return {
    ...state,
    preConfirmReady,
    setState,
    reset: () =>
      setState({
        selectedCandidate: null,
        enrichmentReady: false,
        nutritionReady: false,
        uiCommitted: false,
        portionDraft: null
      })
  };
}