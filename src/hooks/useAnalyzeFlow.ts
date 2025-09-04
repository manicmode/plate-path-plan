import * as React from "react";

export type AnalyzePhase =
  | "uploading"
  | "preprocessing"
  | "detecting"
  | "hydrating"
  | "buildingReview";

export function useAnalyzeFlow() {
  const abortRef = React.useRef<AbortController | null>(null);

  const run = async (
    file: File,
    onPhase?: (p: AnalyzePhase) => void,
    existingAnalysisFunction?: (file: File, options?: { signal?: AbortSignal }) => Promise<any>
  ): Promise<any[]> => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      // PHASE 1: upload (brief pause for UX)
      onPhase?.("uploading");
      await new Promise(resolve => setTimeout(resolve, 300));
      if (signal.aborted) throw new Error('Analysis cancelled');

      // PHASE 2: preprocessing (client-side resize/compress)
      onPhase?.("preprocessing");
      await new Promise(resolve => setTimeout(resolve, 500));
      if (signal.aborted) throw new Error('Analysis cancelled');

      // PHASE 3: detecting (main analysis work)
      onPhase?.("detecting");
      if (!existingAnalysisFunction) {
        throw new Error("Analysis function not provided");
      }
      
      // This is where the heavy lifting happens
      await existingAnalysisFunction(file, { signal });
      if (signal.aborted) throw new Error('Analysis cancelled');

      // PHASE 4: hydrating nutrition (simulated)
      onPhase?.("hydrating");
      await new Promise(resolve => setTimeout(resolve, 400));
      if (signal.aborted) throw new Error('Analysis cancelled');

      // PHASE 5: building review
      onPhase?.("buildingReview");
      await new Promise(resolve => setTimeout(resolve, 300));
      if (signal.aborted) throw new Error('Analysis cancelled');
      console.log('[FLOW][PHASES_COMPLETE]');

      return [];
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Analysis cancelled')) {
        console.log('[ANALYZE_FLOW] Cancelled by user');
        throw new Error('Analysis cancelled');
      }
      throw error;
    } finally {
      console.log('[FLOW][CLEANUP:FINALLY]', { willHideLoader: true });
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  return { run, cancel };
}