export type ScanGuard = {
  gen: number;                // incremented on every open/close
  signal: AbortSignal;        // abort() on close
  isOpen: () => boolean;      // returns false once modal unmounts / confirm opens
};