import { Skeleton } from "@/components/ui/skeleton";

export default function LegacyConfirmSkeleton() {
  return (
    <div className="rounded-2xl bg-card p-4 animate-pulse border shadow-sm">
      <Skeleton className="h-6 w-32 mb-3" />
      <Skeleton className="h-10 w-full mb-4 rounded-xl" />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
      <div className="sr-only" role="status" aria-live="polite">
        Loading nutrition analysis…
      </div>
    </div>
  );
}