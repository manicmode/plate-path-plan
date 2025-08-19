import { Skeleton } from '@/components/ui/skeleton';

export function RailSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="min-w-[76%] sm:min-w-[56%] md:min-w-[40%] flex-shrink-0">
          <div className="rounded-2xl bg-background/40 backdrop-blur-xl ring-1 ring-border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}