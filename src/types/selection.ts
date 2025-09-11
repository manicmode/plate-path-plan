/**
 * Selection Identity Types
 * Carries stable selection identity through enrichment process
 */

export interface SelectionIdentity {
  id: string;
  name: string;
  displayName?: string;
  canonicalKey?: string;
  selectionFlags?: Record<string, any>;
  providerRef?: string | null;
  classId?: string | null;
}