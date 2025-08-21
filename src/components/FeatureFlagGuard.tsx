import { ReactNode } from "react";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";

export function FeatureFlagGuard({
  flag,
  fallback = null,
  children,
}: { flag: string; fallback?: ReactNode; children: ReactNode }) {
  const { enabled, loading } = useFeatureFlagOptimized(flag);
  if (loading) return null;
  return enabled ? <>{children}</> : <>{fallback}</>;
}